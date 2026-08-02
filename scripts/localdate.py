from datetime import datetime

import pytz


def local_midnight_utc(date_str: str, timezone: pytz.BaseTzInfo) -> datetime:
    """Convert a 'YYYY/MM/DD' calendar date in the given timezone to its UTC midnight instant"""
    naive_midnight = datetime.strptime(date_str, "%Y/%m/%d")
    return timezone.localize(naive_midnight).astimezone(pytz.utc).replace(tzinfo=None)
