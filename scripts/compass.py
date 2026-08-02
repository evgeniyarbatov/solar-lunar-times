COMPASS_DIRECTIONS = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
]


def degrees_to_direction(degrees: float) -> str:
    """Convert compass degrees (0-360) to a 16-point direction label"""
    index = int((degrees + 11.25) / 22.5) % 16
    return COMPASS_DIRECTIONS[index]


def format_azimuth(degrees: float) -> str:
    """Format azimuth degrees with its compass direction, e.g. '82° E'"""
    normalized = degrees % 360
    return f"{round(normalized)}° {degrees_to_direction(normalized)}"
