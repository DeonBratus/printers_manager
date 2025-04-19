
def format_hours_to_hhmm(hours: float) -> str:
    """Конвертирует часы в формат HH:mm"""
    if hours is None:
        return "00:00"
    total_minutes = int(hours * 60)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours:02d}:{minutes:02d}"

def format_minutes_to_hhmm(minutes: float) -> str:
    """Конвертирует минуты в формат HH:mm"""
    if minutes is None:
        return "00:00"
    hours = int(minutes // 60)
    mins = int(minutes % 60)
    return f"{hours:02d}:{mins:02d}"

def parse_hhmm_to_minutes(time_str: str) -> float:
    """Конвертирует строку в формате HH:mm в минуты"""
    if not time_str or ":" not in time_str:
        return 0.0
    parts = time_str.split(":")
    if len(parts) != 2:
        return 0.0
    try:
        hours = int(parts[0])
        minutes = int(parts[1])
        return hours * 60 + minutes
    except ValueError:
        return 0.0

def hours_to_minutes(hours: float) -> float:
    """Конвертирует часы в минуты"""
    if hours is None:
        return 0.0
    return hours * 60

def minutes_to_hours(minutes: float) -> float:
    """Конвертирует минуты в часы"""
    if minutes is None:
        return 0.0
    return minutes / 60