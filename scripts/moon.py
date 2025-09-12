#!/usr/bin/env python3

import ephem
import math
from datetime import datetime, timedelta
import pytz
import os
import csv


def degrees_to_direction(degrees):
    """Convert degrees to compass direction"""
    directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                 "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    index = int((degrees + 11.25) / 22.5) % 16
    return directions[index]


def moon_phase_name(observer):
    """Determine precise moon phase using ephem events"""
    moon = ephem.Moon(observer)
    phase_today = moon.moon_phase  # illumination fraction

    # Find key lunar events
    prev_new = ephem.previous_new_moon(observer.date)
    next_new = ephem.next_new_moon(observer.date)
    prev_full = ephem.previous_full_moon(observer.date)
    next_full = ephem.next_full_moon(observer.date)
    prev_quarter = ephem.previous_first_quarter_moon(observer.date)
    next_quarter = ephem.next_first_quarter_moon(observer.date)
    prev_last_quarter = ephem.previous_last_quarter_moon(observer.date)
    next_last_quarter = ephem.next_last_quarter_moon(observer.date)

    # Check for exact events (within ~12h window)
    d = ephem.Date(observer.date)
    if abs(d - prev_new) < 0.5 or abs(d - next_new) < 0.5:
        return "New Moon"
    if abs(d - prev_full) < 0.5 or abs(d - next_full) < 0.5:
        return "Full Moon"
    if abs(d - prev_quarter) < 0.5 or abs(d - next_quarter) < 0.5:
        return "First Quarter"
    if abs(d - prev_last_quarter) < 0.5 or abs(d - next_last_quarter) < 0.5:
        return "Last Quarter"

    # Otherwise determine waxing/waning by comparing illumination trend
    tomorrow = ephem.Date(observer.date + 1)
    moon.compute(tomorrow)
    phase_tomorrow = moon.moon_phase
    waxing = phase_tomorrow > phase_today

    if phase_today < 0.25:
        return "Waxing Crescent" if waxing else "Waning Crescent"
    elif phase_today < 0.5:
        return "Waxing Gibbous" if waxing else "Waning Gibbous"
    elif phase_today < 0.75:
        return "Waning Gibbous" if not waxing else "Waxing Gibbous"
    else:
        return "Waning Crescent" if not waxing else "Waxing Crescent"


def calculate_period_averages(observer, moon, ref_time, period_type):
    """Calculate average azimuth and elevation for specified time periods"""
    if ref_time is None:
        return "N/A", "N/A"
    
    hanoi_tz = pytz.timezone('Asia/Ho_Chi_Minh')
    
    try:
        if period_type == "evening":
            # Evening: from sunset to 12am
            start_time = ref_time
            end_time = ref_time.replace(hour=23, minute=59, second=59)
            if end_time < start_time:
                # If sunset is after midnight, adjust end time to next day
                end_time = end_time + timedelta(days=1)
        elif period_type == "morning":
            # Morning: from sunrise to 7am
            start_time = ref_time
            end_time = ref_time.replace(hour=7, minute=0, second=0)
            if end_time < start_time:
                # If sunrise is after 7am, adjust end time to next day
                end_time = end_time + timedelta(days=1)
        else:
            return "N/A", "N/A"
        
        # Calculate moon position every 15 minutes during the period
        current_time = start_time
        azimuth_sum = 0
        elevation_sum = 0
        count = 0
        
        while current_time <= end_time:
            # Convert to UTC for ephem calculation
            utc_time = current_time.astimezone(pytz.UTC)
            observer.date = ephem.Date(utc_time)
            moon.compute(observer)
            
            azimuth_sum += math.degrees(moon.az)
            elevation_sum += math.degrees(moon.alt)
            count += 1
            
            current_time += timedelta(minutes=15)
        
        if count > 0:
            avg_azimuth = azimuth_sum / count
            avg_elevation = elevation_sum / count
            return round(avg_azimuth, 1), round(avg_elevation, 1)
        else:
            return "N/A", "N/A"
            
    except Exception as e:
        return "N/A", "N/A"


def calculate_moon_info(date_str):
    """Calculate moon information for a given date"""
    
    # Set up Hanoi timezone
    hanoi_tz = pytz.timezone('Asia/Ho_Chi_Minh')
    
    # Set location
    observer = ephem.Observer()
    observer.lat = os.environ.get('LATITUDE')
    observer.lon = os.environ.get('LONGITUDE')

    # Set date
    observer.date = date_str
    
    # Create moon and sun objects
    moon = ephem.Moon(observer)
    sun = ephem.Sun(observer)
    
    # Calculate moon phase & illumination
    phase = moon.moon_phase
    phase_name = moon_phase_name(observer)
    illumination = phase * 100
    
    # Calculate sunrise and sunset times
    try:
        sunrise = observer.next_rising(sun, start=observer.date)
        sunrise_utc = ephem.Date(sunrise).datetime()
        utc_tz = pytz.UTC
        sunrise_local = utc_tz.localize(sunrise_utc).astimezone(hanoi_tz)
    except ephem.CircumpolarError:
        sunrise_local = None
    except Exception as e:
        sunrise_local = None
    
    try:
        sunset = observer.next_setting(sun, start=observer.date)
        sunset_utc = ephem.Date(sunset).datetime()
        utc_tz = pytz.UTC
        sunset_local = utc_tz.localize(sunset_utc).astimezone(hanoi_tz)
    except ephem.CircumpolarError:
        sunset_local = None
    except Exception as e:
        sunset_local = None
    
    # Calculate moon rise and set times
    try:
        moon_rise = observer.next_rising(ephem.Moon(), start=observer.date)
        moon_rise_utc = ephem.Date(moon_rise).datetime()
        utc_tz = pytz.UTC
        moon_rise_local = utc_tz.localize(moon_rise_utc).astimezone(hanoi_tz)
    except ephem.CircumpolarError:
        moon_rise_local = "Moon doesn't rise today"
    except Exception as e:
        moon_rise_local = f"Error calculating rise time: {e}"
    
    try:
        moon_set = observer.next_setting(ephem.Moon(), start=observer.date)
        moon_set_utc = ephem.Date(moon_set).datetime()
        utc_tz = pytz.UTC
        moon_set_local = utc_tz.localize(moon_set_utc).astimezone(hanoi_tz)
    except ephem.CircumpolarError:
        moon_set_local = "Moon doesn't set today"
    except Exception as e:
        moon_set_local = f"Error calculating set time: {e}"
    
    # Calculate average azimuth and elevation for specified periods
    evening_avg_azimuth, evening_avg_elevation = calculate_period_averages(
        observer, moon, sunset_local, "evening")
    morning_avg_azimuth, morning_avg_elevation = calculate_period_averages(
        observer, moon, sunrise_local, "morning")
    
    return {
        'date': date_str,
        'phase': phase,
        'phase_name': phase_name,
        'illumination': illumination,
        'moon_rise': moon_rise_local,
        'moon_set': moon_set_local,
        'evening_avg_azimuth': evening_avg_azimuth,
        'evening_avg_elevation': evening_avg_elevation,
        'morning_avg_azimuth': morning_avg_azimuth,
        'morning_avg_elevation': morning_avg_elevation
    }


def write_to_csv(all_moon_data, filename="data/moon.csv"):
    """Write all moon data to a CSV file"""
    if not all_moon_data:
        return
    
    # Define CSV headers
    headers = [
        'date', 'phase_name', 'illumination',
        'moon_rise', 'moon_set',
        'evening_avg_azimuth', 'evening_avg_elevation', 
        'morning_avg_azimuth', 'morning_avg_elevation'
    ]
    
    try:
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()
            
            for moon_info in all_moon_data:
                # Format times as strings if they are datetime objects
                moon_rise_str = (moon_info['moon_rise'].strftime('%H:%M:%S') 
                               if isinstance(moon_info['moon_rise'], datetime) 
                               else str(moon_info['moon_rise']))
                
                moon_set_str = (moon_info['moon_set'].strftime('%H:%M:%S') 
                              if isinstance(moon_info['moon_set'], datetime) 
                              else str(moon_info['moon_set']))
                
                row_data = {
                    'date': moon_info['date'],
                    'phase_name': moon_info['phase_name'],
                    'illumination': f"{moon_info['illumination']:.1f}",
                    'moon_rise': moon_rise_str,
                    'moon_set': moon_set_str,
                    'evening_avg_azimuth': str(moon_info['evening_avg_azimuth']),
                    'evening_avg_elevation': str(moon_info['evening_avg_elevation']),
                    'morning_avg_azimuth': str(moon_info['morning_avg_azimuth']),
                    'morning_avg_elevation': str(moon_info['morning_avg_elevation'])
                }
                
                writer.writerow(row_data)
        
        print(f"\n📁 CSV data written to: {filename}")
        
    except Exception as e:
        print(f"\n❌ Error writing CSV file: {e}")


def main():
    """Main function to calculate moon info for next 30 days"""
    
    print("Moon Phase Calculator")
    print("=" * 50)
    print("Calculating moon phases for next 30 days starting from today")
    
    # Generate dates for next 30 days starting from today
    today = datetime.now()
    dates = []
    for i in range(30):
        date = today + timedelta(days=i)
        date_str = date.strftime("%Y/%m/%d")
        dates.append(date_str)
    
    # Collect all moon data for CSV export
    all_moon_data = []
    
    for date in dates:
        print(f"\nDate: {datetime.strptime(date, '%Y/%m/%d').strftime('%B %d, %Y')}")
        print("-" * 50)
        
        try:
            moon_info = calculate_moon_info(date)
            
            # Store moon data for CSV export
            all_moon_data.append(moon_info)
            
            print(f"Moon Phase: {moon_info['phase_name']}")
            print(f"Illumination: {moon_info['illumination']:.1f}%")
            print(f"Phase Fraction: {moon_info['phase']:.3f}")
            
            if isinstance(moon_info['moon_rise'], datetime):
                print(f"Moon Rise: {moon_info['moon_rise'].strftime('%H:%M:%S')} (Hanoi time)")
            else:
                print(f"Moon Rise: {moon_info['moon_rise']}")
                
            if isinstance(moon_info['moon_set'], datetime):
                print(f"Moon Set: {moon_info['moon_set'].strftime('%H:%M:%S')} (Hanoi time)")
            else:
                print(f"Moon Set: {moon_info['moon_set']}")
            
            print(f"Evening Avg (sunset-12am): Az {moon_info['evening_avg_azimuth']}°, El {moon_info['evening_avg_elevation']}°")
            print(f"Morning Avg (sunrise-7am): Az {moon_info['morning_avg_azimuth']}°, El {moon_info['morning_avg_elevation']}°")
                
        except Exception as e:
            print(f"Error calculating moon info: {e}")
    
    # Write all moon data to CSV
    write_to_csv(all_moon_data)


if __name__ == "__main__":
    main()
    
    print("\n" + "="*50)
    print("Installation note:")
    print("This script requires the 'ephem' and 'pytz' libraries.")
    print("Install them with: pip install pyephem pytz")
    print(f"\nLocation coordinates: {os.environ.get('LATITUDE')}°N, {os.environ.get('LONGITUDE')}°E")
    print("All times displayed in Hanoi timezone (UTC+7)")
    print(f"Data generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} (UTC+7)")
    print("="*50)