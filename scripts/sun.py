#!/usr/bin/env python3

import ephem
from datetime import datetime, timedelta
import pytz
import os
import csv

# Location coordinates - get from environment variables (set by Makefile)
LATITUDE = os.environ.get('LATITUDE', '22.336521532217972')
LONGITUDE = os.environ.get('LONGITUDE', '103.84304360007465')
ELEVATION = 1600  # meters above sea level

def setup_observer():
    """Create an observer object for Sapa, Vietnam"""
    observer = ephem.Observer()
    observer.lat = LATITUDE
    observer.lon = LONGITUDE
    observer.elevation = ELEVATION
    
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

def print_results(date_str, results):
    """Print formatted results for a given date"""
    print(f"\n{'='*60}")
    print(f"SUN TIMES FOR SAPA, VIETNAM - {date_str}")
    print(f"Coordinates: {LATITUDE}°N, {LONGITUDE}°E")
    print(f"Elevation: {ELEVATION}m above sea level")
    print(f"Timezone: Hanoi/Ho Chi Minh City (UTC+7)")
    print(f"{'='*60}")
    
    if not results:
        print("No sun times calculated (possible polar conditions)")
        return
    
    # Morning times
    print("\n🌅 MORNING TIMES:")
    print(f"  Astronomical Dawn:  {results.get('astronomical_dawn', 'N/A').strftime('%H:%M:%S')}")
    print(f"  Nautical Dawn:      {results.get('nautical_dawn', 'N/A').strftime('%H:%M:%S')}")
    print(f"  Civil Dawn:         {results.get('civil_dawn', 'N/A').strftime('%H:%M:%S')}")
    print(f"  Sunrise (Geometric): {results.get('sunrise_geometric', 'N/A').strftime('%H:%M:%S')}")
    
    # Midday
    print(f"\n☀️  SOLAR NOON:         {results.get('solar_noon', 'N/A').strftime('%H:%M:%S')}")
    
    # Evening times
    print(f"\n🌇 EVENING TIMES:")
    print(f"  Sunset (Geometric):  {results.get('sunset_geometric', 'N/A').strftime('%H:%M:%S')}")
    print(f"  Civil Dusk:         {results.get('civil_dusk', 'N/A').strftime('%H:%M:%S')}")
    print(f"  Nautical Dusk:      {results.get('nautical_dusk', 'N/A').strftime('%H:%M:%S')}")
    print(f"  Astronomical Dusk:  {results.get('astronomical_dusk', 'N/A').strftime('%H:%M:%S')}")
    
    # Calculate day length
    if 'sunrise_geometric' in results and 'sunset_geometric' in results:
        day_length = results['sunset_geometric'] - results['sunrise_geometric']
        hours, remainder = divmod(day_length.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        print(f"\n📏 DAY LENGTH:          {hours:02d}:{minutes:02d}:{seconds:02d}")

def write_to_csv(all_results, filename="data/sun.csv"):
    """Write all sun time results to a CSV file"""
    if not all_results:
        return
    
    # Define CSV headers
    headers = [
        'date', 'latitude', 'longitude',
        'astronomical_dawn', 'nautical_dawn', 'civil_dawn', 'sunrise_geometric',
        'solar_noon', 'sunset_geometric', 'civil_dusk', 'nautical_dusk', 
        'astronomical_dusk', 'day_length_hours', 'day_length_minutes', 'day_length_seconds'
    ]
    
    try:
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()
            
            for date_str, results in all_results:
                if not results:
                    continue
                
                # Calculate day length
                day_length_hours = day_length_minutes = day_length_seconds = None
                if 'sunrise_geometric' in results and 'sunset_geometric' in results:
                    day_length = results['sunset_geometric'] - results['sunrise_geometric']
                    hours, remainder = divmod(day_length.seconds, 3600)
                    minutes, seconds = divmod(remainder, 60)
                    day_length_hours, day_length_minutes, day_length_seconds = hours, minutes, seconds
                
                # Create row data
                row_data = {
                    'date': date_str,
                    'latitude': LATITUDE,
                    'longitude': LONGITUDE,
                    'day_length_hours': day_length_hours,
                    'day_length_minutes': day_length_minutes,
                    'day_length_seconds': day_length_seconds
                }
                
                # Add time fields - format as HH:MM:SS strings
                for key in ['astronomical_dawn', 'nautical_dawn', 'civil_dawn', 'sunrise_geometric',
                           'solar_noon', 'sunset_geometric', 'civil_dusk', 'nautical_dusk', 'astronomical_dusk']:
                    if key in results:
                        row_data[key] = results[key].strftime('%H:%M:%S')
                    else:
                        row_data[key] = None
                
                writer.writerow(row_data)
        
        print(f"\n📁 CSV data written to: {filename}")
        
    except Exception as e:
        print(f"\n❌ Error writing CSV file: {e}")

def main():
    """Main function to calculate and display sun times for next 30 days"""
    print("SAPA VIETNAM - SUNRISE/SUNSET CALCULATOR")
    print("Calculating times for next 30 days starting from today")
    
    # Setup observer and timezone
    observer, hanoi_tz = setup_observer()
    
    # Generate dates for next 30 days starting from today
    today = datetime.now()
    dates = []
    for i in range(30):
        date = today + timedelta(days=i)
        date_str = date.strftime("%Y/%m/%d")
        display_date = date.strftime("%B %d, %Y")
        dates.append((date_str, display_date))
    
    # Calculate and display results for each date
    all_results = []
    for date_str, display_date in dates:
        # Calculate sun times
        results = calculate_sun_times(observer, date_str, hanoi_tz)
        
        # Store results for CSV export
        all_results.append((display_date, results))
        
        # Display results
        print_results(display_date, results)
    
    # Write all results to CSV
    write_to_csv(all_results)
    
    print(f"\n{'='*60}")
    print("TWILIGHT DEFINITIONS:")
    print("• Astronomical: Sun 18° below horizon (darkest)")
    print("• Nautical: Sun 12° below horizon (navigation possible)")
    print("• Civil: Sun 6° below horizon (outdoor activities possible)")
    print("• Geometric: Sun at horizon (actual sunrise/sunset)")
    print(f"{'='*60}")
    print(f"Location coordinates: {LATITUDE}°N, {LONGITUDE}°E")
    print(f"Data generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} (UTC+7)")
    print(f"{'='*60}")

if __name__ == "__main__":
    # Check if required libraries are available
    try:
        import ephem
        import pytz
    except ImportError as e:
        print(f"Error: Required library not found - {e}")
        print("Please install required libraries:")
        print("pip install pyephem pytz")
        exit(1)
    
    main()