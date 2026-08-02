#!/usr/bin/env python3

import csv
import math
import os
from datetime import datetime, timedelta
from typing import Any

import ephem
import pytz
from compass import format_azimuth

DAYS_COUNT = 90


def moon_phase_name(observer: ephem.Observer) -> str:
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
    if phase_today < 0.5:
        return "Waxing Gibbous" if waxing else "Waning Gibbous"
    if phase_today < 0.75:
        return "Waning Gibbous" if not waxing else "Waxing Gibbous"
    return "Waning Crescent" if not waxing else "Waxing Crescent"


def calculate_moon_info(date_str: str) -> dict[str, Any]:
    """Calculate moon information for a given date"""

    # Set up Hanoi timezone
    hanoi_tz = pytz.timezone("Asia/Ho_Chi_Minh")

    # Set location
    observer = ephem.Observer()
    observer.lat = os.environ["LATITUDE"]
    observer.lon = os.environ["LONGITUDE"]

    # Set date
    observer.date = date_str

    # Create moon object
    moon = ephem.Moon(observer)

    # Calculate moon phase & illumination
    phase = moon.moon_phase
    phase_name = moon_phase_name(observer)
    illumination = phase * 100

    # Calculate moon rise and set times
    moon_rise_local: datetime | str
    moon_rise_azimuth: str | None
    try:
        rising_moon = ephem.Moon()
        moon_rise = observer.next_rising(rising_moon, start=observer.date)
        moon_rise_azimuth = format_azimuth(math.degrees(float(rising_moon.az)))
        moon_rise_utc = ephem.Date(moon_rise).datetime()
        utc_tz = pytz.UTC
        moon_rise_local = utc_tz.localize(moon_rise_utc).astimezone(hanoi_tz)
    except ephem.CircumpolarError:
        moon_rise_local = "Moon doesn't rise today"
        moon_rise_azimuth = None
    except Exception as e:
        moon_rise_local = f"Error calculating rise time: {e}"
        moon_rise_azimuth = None

    moon_set_local: datetime | str
    moon_set_azimuth: str | None
    try:
        setting_moon = ephem.Moon()
        moon_set = observer.next_setting(setting_moon, start=observer.date)
        moon_set_azimuth = format_azimuth(math.degrees(float(setting_moon.az)))
        moon_set_utc = ephem.Date(moon_set).datetime()
        utc_tz = pytz.UTC
        moon_set_local = utc_tz.localize(moon_set_utc).astimezone(hanoi_tz)
    except ephem.CircumpolarError:
        moon_set_local = "Moon doesn't set today"
        moon_set_azimuth = None
    except Exception as e:
        moon_set_local = f"Error calculating set time: {e}"
        moon_set_azimuth = None

    return {
        "date": date_str,
        "phase": phase,
        "phase_name": phase_name,
        "illumination": round(illumination),
        "moon_rise": moon_rise_local,
        "moon_rise_azimuth": moon_rise_azimuth,
        "moon_set": moon_set_local,
        "moon_set_azimuth": moon_set_azimuth,
    }


def write_to_csv(
    all_moon_data: list[dict[str, Any]], filename: str = "site/public/moon.csv"
) -> None:
    """Write all moon data to a CSV file"""
    if not all_moon_data:
        return

    # Define CSV headers
    headers = [
        "date",
        "phase_name",
        "illumination",
        "moon_rise",
        "moon_rise_azimuth",
        "moon_set",
        "moon_set_azimuth",
    ]

    try:
        with open(filename, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()

            for moon_info in all_moon_data:
                # Format times as strings if they are datetime objects
                moon_rise_str = (
                    moon_info["moon_rise"].strftime("%H:%M:%S")
                    if isinstance(moon_info["moon_rise"], datetime)
                    else str(moon_info["moon_rise"])
                )

                moon_set_str = (
                    moon_info["moon_set"].strftime("%H:%M:%S")
                    if isinstance(moon_info["moon_set"], datetime)
                    else str(moon_info["moon_set"])
                )

                row_data = {
                    "date": moon_info["date"],
                    "phase_name": moon_info["phase_name"],
                    "illumination": str(moon_info["illumination"]),
                    "moon_rise": moon_rise_str,
                    "moon_rise_azimuth": moon_info["moon_rise_azimuth"],
                    "moon_set": moon_set_str,
                    "moon_set_azimuth": moon_info["moon_set_azimuth"],
                }

                writer.writerow(row_data)
    except Exception as e:
        print(f"\n❌ Error writing CSV file: {e}")


def main() -> None:
    """Main function to calculate moon info for next 30 days"""

    # Generate dates for next DAYS_COUNT days starting from today
    today = datetime.now()
    dates: list[str] = []
    for i in range(DAYS_COUNT):
        date = today + timedelta(days=i)
        date_str = date.strftime("%Y/%m/%d")
        dates.append(date_str)

    # Collect all moon data for CSV export
    all_moon_data: list[dict[str, Any]] = []

    for date_str in dates:
        try:
            moon_info = calculate_moon_info(date_str)
            all_moon_data.append(moon_info)
        except Exception as e:
            print(f"Error calculating moon info: {e}")

    write_to_csv(all_moon_data)


if __name__ == "__main__":
    main()
