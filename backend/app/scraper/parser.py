"""
Parsing helpers for Carousell HK listing data.
"""
import logging
import re
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)


def parse_price(raw: str) -> tuple[float, str]:
    """
    Parse a price string into (float_value, display_label).
    Returns (0.0, 'Free') for free items.
    """
    if not raw:
        return 0.0, ""
    cleaned = raw.strip()
    if cleaned.lower() in ("free", "0", "hk$0", "$0"):
        return 0.0, "Free"
    numeric = re.sub(r"[^\d.]", "", cleaned)
    try:
        return float(numeric), cleaned
    except ValueError:
        return 0.0, cleaned


def parse_relative_time(raw: str) -> str:
    """
    Convert Carousell relative times ('2 hours ago', '3 days ago') to
    ISO-8601 date strings. Falls back to the original string if unrecognised.
    """
    if not raw:
        return ""
    raw = raw.strip().lower()
    now = datetime.now()
    patterns = [
        (r"(\d+)\s+second", lambda n: now - timedelta(seconds=n)),
        (r"(\d+)\s+minute", lambda n: now - timedelta(minutes=n)),
        (r"(\d+)\s+hour",   lambda n: now - timedelta(hours=n)),
        (r"(\d+)\s+day",    lambda n: now - timedelta(days=n)),
        (r"(\d+)\s+week",   lambda n: now - timedelta(weeks=n)),
        (r"(\d+)\s+month",  lambda n: now - timedelta(days=n * 30)),
        (r"(\d+)\s+year",   lambda n: now - timedelta(days=n * 365)),
    ]
    for pattern, calc in patterns:
        m = re.search(pattern, raw)
        if m:
            return calc(int(m.group(1))).strftime("%Y-%m-%d %H:%M")
    if "just now" in raw or "moments" in raw:
        return now.strftime("%Y-%m-%d %H:%M")
    return raw
