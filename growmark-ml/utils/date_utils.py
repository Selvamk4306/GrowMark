from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

def get_next_7_days(start_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
    """
    Generate a list of the next 7 calendar dates starting from tomorrow.
    """
    if start_date is None:
        start_date = datetime.now()
    
    days = []
    for i in range(1, 8):
        future_date = start_date + timedelta(days=i)
        days.append({
            "date": future_date.strftime("%Y-%m-%d"),
            "day": future_date.strftime("%A"),
            "datetime": future_date,
            "day_of_week": int(future_date.weekday()),  # 0=Monday, 6=Sunday
            "week_number": int(future_date.isocalendar()[1]),
            "month": int(future_date.month),
            "is_weekend": 1 if future_date.weekday() in (5, 6) else 0
        })
    return days

def parse_date(date_str: str) -> datetime:
    """
    Parse string YYYY-MM-DD to datetime.
    """
    return datetime.strptime(date_str, "%Y-%m-%d")

def format_date(dt: datetime) -> str:
    """
    Format datetime to YYYY-MM-DD string.
    """
    return dt.strftime("%Y-%m-%d")
