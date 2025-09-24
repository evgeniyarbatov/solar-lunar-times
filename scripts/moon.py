#!/usr/bin/env python3

import ephem
import math
from datetime import datetime, timedelta
import pytz
import os
import csv

DAYS_COUNT = 90

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
    
    return {
        'date': date_str,
        'phase': phase,
        'phase_name': phase_name,
        'illumination': round(illumination),
        'moon_rise': moon_rise_local,
        'moon_set': moon_set_local
    }


def write_to_csv(all_moon_data, filename="site/public/moon.csv"):
    """Write all moon data to a CSV file"""
    if not all_moon_data:
        return
    
    # Define CSV headers
    headers = [
        'date', 'phase_name', 'illumination',
        'moon_rise', 'moon_set'
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
                    'illumination': str(moon_info['illumination']),
                    'moon_rise': moon_rise_str,
                    'moon_set': moon_set_str
                }
                
                writer.writerow(row_data)        
    except Exception as e:
        print(f"\n❌ Error writing CSV file: {e}")


def main():
    """Main function to calculate moon info for next 30 days"""
    
    # Generate dates for next DAYS_COUNT days starting from today
    today = datetime.now()
    dates = []
    for i in range(DAYS_COUNT):
        date = today + timedelta(days=i)
        date_str = date.strftime("%Y/%m/%d")
        dates.append(date_str)
    
    # Collect all moon data for CSV export
    all_moon_data = []
    
    for date in dates:
        try:
            moon_info = calculate_moon_info(date)
            all_moon_data.append(moon_info)       
        except Exception as e:
            print(f"Error calculating moon info: {e}")
    
    write_to_csv(all_moon_data)

if __name__ == "__main__":
    main()