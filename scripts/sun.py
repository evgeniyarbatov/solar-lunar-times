#!/usr/bin/env python3

import csv
import math
import os
from datetime import datetime, timedelta, tzinfo

import ephem
import pytz
from compass import format_azimuth

DAYS_COUNT = 90

# Location coordinates - get from environment variables (set by Makefile)
LATITUDE = os.environ["LATITUDE"]
LONGITUDE = os.environ["LONGITUDE"]


def setup_observer() -> tuple[ephem.Observer, tzinfo]:
    """Create an observer object"""
    observer = ephem.Observer()
    observer.lat = LATITUDE
    observer.lon = LONGITUDE

    # Set timezone to Hanoi (UTC+7)
    hanoi_tz = pytz.timezone("Asia/Ho_Chi_Minh")  # Vietnam timezone
    return observer, hanoi_tz


def calculate_sun_times(
    observer: ephem.Observer, date: str, timezone: tzinfo
) -> dict[str, datetime | str]:
    """Calculate various sun-related times for a given date"""
    # Set the date for calculations (start at midnight of the given date)
    observer.date = date

    # Create sun object
    sun = ephem.Sun()

    results: dict[str, datetime | str] = {}

    try:
        # Standard sunrise and sunset (geometric horizon)
        observer.horizon = "0"
        sunrise = observer.next_rising(sun)
        sunrise_azimuth = math.degrees(float(sun.az))
        sunset = observer.next_setting(sun)
        sunset_azimuth = math.degrees(float(sun.az))

        # Convert from UTC to local timezone
        sunrise_utc = sunrise.datetime().replace(tzinfo=pytz.utc)
        sunset_utc = sunset.datetime().replace(tzinfo=pytz.utc)
        sunrise_local = sunrise_utc.astimezone(timezone)
        sunset_local = sunset_utc.astimezone(timezone)

        results["sunrise_geometric"] = sunrise_local
        results["sunset_geometric"] = sunset_local
        results["sunrise_azimuth"] = format_azimuth(sunrise_azimuth)
        results["sunset_azimuth"] = format_azimuth(sunset_azimuth)

        # Reset observer date for twilight calculations
        observer.date = date

        # Civil twilight (sun 6° below horizon)
        observer.horizon = "-6"
        civil_dawn = observer.next_rising(sun, use_center=True)
        civil_dusk = observer.next_setting(sun, use_center=True)

        results["civil_dawn"] = civil_dawn.datetime().replace(tzinfo=pytz.utc).astimezone(timezone)
        results["civil_dusk"] = civil_dusk.datetime().replace(tzinfo=pytz.utc).astimezone(timezone)

        # Reset observer date
        observer.date = date

        # Nautical twilight (sun 12° below horizon)
        observer.horizon = "-12"
        nautical_dawn = observer.next_rising(sun, use_center=True)
        nautical_dusk = observer.next_setting(sun, use_center=True)

        results["nautical_dawn"] = (
            nautical_dawn.datetime().replace(tzinfo=pytz.utc).astimezone(timezone)
        )
        results["nautical_dusk"] = (
            nautical_dusk.datetime().replace(tzinfo=pytz.utc).astimezone(timezone)
        )

        # Reset observer date
        observer.date = date

        # Astronomical twilight (sun 18° below horizon)
        observer.horizon = "-18"
        astronomical_dawn = observer.next_rising(sun, use_center=True)
        astronomical_dusk = observer.next_setting(sun, use_center=True)

        results["astronomical_dawn"] = (
            astronomical_dawn.datetime().replace(tzinfo=pytz.utc).astimezone(timezone)
        )
        results["astronomical_dusk"] = (
            astronomical_dusk.datetime().replace(tzinfo=pytz.utc).astimezone(timezone)
        )

        # Reset observer date and calculate solar noon
        observer.date = date
        observer.horizon = "0"
        solar_noon = observer.next_transit(sun)
        results["solar_noon"] = solar_noon.datetime().replace(tzinfo=pytz.utc).astimezone(timezone)

    except ephem.CircumpolarError:
        print("Sun is circumpolar (always above or below horizon)")
    except ephem.NeverUpError:
        print("Sun never rises on this date")
    except ephem.AlwaysUpError:
        print("Sun never sets on this date")

    return results


def write_to_csv(
    all_results: list[tuple[str, dict[str, datetime | str]]],
    filename: str = "site/public/sun.csv",
) -> None:
    """Write all sun time results to a CSV file"""
    if not all_results:
        return

    # Define CSV headers
    headers = [
        "date",
        "astronomical_dawn",
        "nautical_dawn",
        "civil_dawn",
        "sunrise_geometric",
        "sunrise_azimuth",
        "solar_noon",
        "sunset_geometric",
        "sunset_azimuth",
        "civil_dusk",
        "nautical_dusk",
        "astronomical_dusk",
        "day_length",
    ]

    try:
        with open(filename, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            writer.writeheader()

            for date_str, results in all_results:
                if not results:
                    continue

                # Calculate day length
                day_length_str = None
                sunrise_val = results.get("sunrise_geometric")
                sunset_val = results.get("sunset_geometric")
                if isinstance(sunrise_val, datetime) and isinstance(sunset_val, datetime):
                    day_length = sunset_val - sunrise_val
                    hours, remainder = divmod(day_length.seconds, 3600)
                    minutes, seconds = divmod(remainder, 60)
                    day_length_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

                # Create row data
                row_data: dict[str, str | None] = {"date": date_str, "day_length": day_length_str}

                # Add time fields - format as HH:MM:SS strings
                for key in [
                    "astronomical_dawn",
                    "nautical_dawn",
                    "civil_dawn",
                    "sunrise_geometric",
                    "solar_noon",
                    "sunset_geometric",
                    "civil_dusk",
                    "nautical_dusk",
                    "astronomical_dusk",
                ]:
                    value = results.get(key)
                    row_data[key] = value.strftime("%H:%M:%S") if isinstance(value, datetime) else None

                # Add azimuth fields - already formatted as "<degrees>° <direction>"
                for key in ["sunrise_azimuth", "sunset_azimuth"]:
                    value = results.get(key)
                    row_data[key] = value if isinstance(value, str) else None

                writer.writerow(row_data)
    except Exception as e:
        print(f"\n❌ Error writing CSV file: {e}")


def main() -> None:
    """Main function to calculate and display sun times for next 30 days"""

    # Setup observer and timezone
    observer, hanoi_tz = setup_observer()

    # Generate dates for next DAYS_COUNT days starting from today
    today = datetime.now()
    dates: list[tuple[str, str]] = []
    for i in range(DAYS_COUNT):
        date = today + timedelta(days=i)
        date_str = date.strftime("%Y/%m/%d")  # This will be used for CSV
        display_date = date.strftime("%B %d, %Y")
        dates.append((date_str, display_date))

    # Calculate and display results for each date
    all_results: list[tuple[str, dict[str, datetime | str]]] = []
    for date_str, _display_date in dates:
        # Calculate sun times
        results = calculate_sun_times(observer, date_str, hanoi_tz)

        # Store results for CSV export
        all_results.append((date_str, results))

    # Write all results to CSV
    write_to_csv(all_results)


if __name__ == "__main__":
    main()
