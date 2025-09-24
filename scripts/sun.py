#!/usr/bin/env python3

import ephem
from datetime import datetime, timedelta
import pytz
import os
import csv

DAYS_COUNT = 90

# Location coordinates - get from environment variables (set by Makefile)
LATITUDE = os.environ.get('LATITUDE')
LONGITUDE = os.environ.get('LONGITUDE')

def setup_observer():
    """Create an observer object"""
    observer = ephem.Observer()
    observer.lat = LATITUDE
    observer.lon = LONGITUDE
    
    # Set timezone to Hanoi (UTC+7)
    hanoi_tz = pytz.timezone('Asia/Ho_Chi_Minh')  # Vietnam timezone
    return observer, hanoi_tz

def calculate_sun_times(observer, date, timezone):
    """Calculate various sun-related times for a given date"""
    # Set the date for calculations (start at midnight of the given date)
    observer.date = date
    
    # Create sun object
    sun = ephem.Sun()
    
    results = {}
    
    try:
        # Standard sunrise and sunset (geometric horizon)
        observer.horizon = '0'
        sunrise = observer.next_rising(sun)
        sunset = observer.next_setting(sun)
        
        # Convert to local timezone
        sunrise_local = timezone.localize(datetime(*ephem.localtime(sunrise).timetuple()[:6]))
        sunset_local = timezone.localize(datetime(*ephem.localtime(sunset).timetuple()[:6]))
        
        results['sunrise_geometric'] = sunrise_local
        results['sunset_geometric'] = sunset_local
        
        # Reset observer date for twilight calculations
        observer.date = date
        
        # Civil twilight (sun 6° below horizon)
        observer.horizon = '-6'
        civil_dawn = observer.next_rising(sun, use_center=True)
        civil_dusk = observer.next_setting(sun, use_center=True)
        
        results['civil_dawn'] = timezone.localize(datetime(*ephem.localtime(civil_dawn).timetuple()[:6]))
        results['civil_dusk'] = timezone.localize(datetime(*ephem.localtime(civil_dusk).timetuple()[:6]))
        
        # Reset observer date
        observer.date = date
        
        # Nautical twilight (sun 12° below horizon)
        observer.horizon = '-12'
        nautical_dawn = observer.next_rising(sun, use_center=True)
        nautical_dusk = observer.next_setting(sun, use_center=True)
        
        results['nautical_dawn'] = timezone.localize(datetime(*ephem.localtime(nautical_dawn).timetuple()[:6]))
        results['nautical_dusk'] = timezone.localize(datetime(*ephem.localtime(nautical_dusk).timetuple()[:6]))
        
        # Reset observer date
        observer.date = date
        
        # Astronomical twilight (sun 18° below horizon)
        observer.horizon = '-18'
        astronomical_dawn = observer.next_rising(sun, use_center=True)
        astronomical_dusk = observer.next_setting(sun, use_center=True)
        
        results['astronomical_dawn'] = timezone.localize(datetime(*ephem.localtime(astronomical_dawn).timetuple()[:6]))
        results['astronomical_dusk'] = timezone.localize(datetime(*ephem.localtime(astronomical_dusk).timetuple()[:6]))
        
        # Reset observer date and calculate solar noon
        observer.date = date
        observer.horizon = '0'
        solar_noon = observer.next_transit(sun)
        results['solar_noon'] = timezone.localize(datetime(*ephem.localtime(solar_noon).timetuple()[:6]))
        
    except ephem.CircumpolarError:
        print("Sun is circumpolar (always above or below horizon)")
    except ephem.NeverUpError:
        print("Sun never rises on this date")
    except ephem.AlwaysUpError:
        print("Sun never sets on this date")
    
    return results

def write_to_csv(all_results, filename="data/sun.csv"):
    """Write all sun time results to a CSV file"""
    if not all_results:
        return
    
    # Define CSV headers
    headers = [
        'date', 'astronomical_dawn', 'nautical_dawn', 'civil_dawn', 'sunrise_geometric',
        'solar_noon', 'sunset_geometric', 'civil_dusk', 'nautical_dusk', 
        'astronomical_dusk', 'day_length'
    ]
    
    try:
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()
            
            for date_str, results in all_results:
                if not results:
                    continue
                
                # Calculate day length
                day_length_str = None
                if 'sunrise_geometric' in results and 'sunset_geometric' in results:
                    day_length = results['sunset_geometric'] - results['sunrise_geometric']
                    hours, remainder = divmod(day_length.seconds, 3600)
                    minutes, seconds = divmod(remainder, 60)
                    day_length_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                
                # Create row data
                row_data = {
                    'date': date_str,
                    'day_length': day_length_str
                }
                
                # Add time fields - format as HH:MM:SS strings
                for key in ['astronomical_dawn', 'nautical_dawn', 'civil_dawn', 'sunrise_geometric',
                           'solar_noon', 'sunset_geometric', 'civil_dusk', 'nautical_dusk', 'astronomical_dusk']:
                    if key in results:
                        row_data[key] = results[key].strftime('%H:%M:%S')
                    else:
                        row_data[key] = None
                
                writer.writerow(row_data)
    except Exception as e:
        print(f"\n❌ Error writing CSV file: {e}")

def main():
    """Main function to calculate and display sun times for next 30 days"""
    
    # Setup observer and timezone
    observer, hanoi_tz = setup_observer()
    
    # Generate dates for next DAYS_COUNT days starting from today
    today = datetime.now()
    dates = []
    for i in range(DAYS_COUNT):
        date = today + timedelta(days=i)
        date_str = date.strftime("%Y/%m/%d")  # This will be used for CSV
        display_date = date.strftime("%B %d, %Y")
        dates.append((date_str, display_date))
    
    # Calculate and display results for each date
    all_results = []
    for date_str, display_date in dates:
        # Calculate sun times
        results = calculate_sun_times(observer, date_str, hanoi_tz)
        
        # Store results for CSV export  
        all_results.append((date_str, results))
    
    # Write all results to CSV
    write_to_csv(all_results)

if __name__ == "__main__": 
    main()