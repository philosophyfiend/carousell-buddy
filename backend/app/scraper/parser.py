"""
Parsing logic for Carousell HK API responses.
Ported from carousell-hk's carousell/api.py _parse_response and _parse_card functions.
"""
import logging
import random
import re
import time
from datetime import datetime, timedelta
from typing import Optional

from app.scraper.models import ScrapedListing

logger = logging.getLogger(__name__)

BASE_URL = "https://www.carousell.com.hk"
LISTING_URL = f"{BASE_URL}/p/"

CONDITION_NAMES = {
    1: "New",
    2: "Like New",
    3: "Good",
    4: "Well Used",
}


def randsleep(low: float, high: float) -> None:
    """Sleep for a random duration between low and high seconds (rate limiting)."""
    duration = random.uniform(low, high)
    logger.debug("Sleeping %.1fs", duration)
    time.sleep(duration)


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


def parse_listings(data: dict) -> list[ScrapedListing]:
    """
    Parse a Carousell API JSON response body into a list of ScrapedListing objects.

    Expected response shape:
      {
        "data": {
          "results": [ { "listingCard": { ... } }, ... ],
          "nextPageToken": "..."
        }
      }
    """
    listings: list[ScrapedListing] = []

    # Navigate to results list — handle both known response shapes
    top = data.get("data", data)
    if isinstance(top, dict):
        results = top.get("results", [])
    else:
        results = []

    for item in results:
        # Results may be wrapped in a "listingCard" key
        card = item.get("listingCard", item)
        listing = _parse_card(card)
        if listing:
            listings.append(listing)

    logger.debug("Parsed %d listings", len(listings))
    return listings


def get_next_page_token(data: dict) -> Optional[str]:
    """Extract the next page token from an API response, if present."""
    top = data.get("data", data)
    if isinstance(top, dict):
        return top.get("nextPageToken") or None
    return None


def _parse_card(card: dict) -> Optional[ScrapedListing]:
    """Parse a single listing card dict into a ScrapedListing object."""
    uid = str(card.get("id", "")).strip()
    if not uid:
        return None

    title = card.get("title", "").strip()

    # Price: may be under "price" as a dict or a string
    price_raw = card.get("price", {})
    if isinstance(price_raw, dict):
        amount_str = str(price_raw.get("amount", price_raw.get("value", "0")))
        currency = price_raw.get("currency", "HKD")
        price_label_raw = price_raw.get("display", price_raw.get("formatted", ""))
    else:
        amount_str = str(price_raw)
        currency = "HKD"
        price_label_raw = ""

    price_val, price_label = parse_price(price_label_raw or amount_str)

    # Condition
    cond_raw = card.get("condition", {})
    if isinstance(cond_raw, dict):
        condition = cond_raw.get("displayName", cond_raw.get("name", ""))
    else:
        condition = CONDITION_NAMES.get(int(cond_raw), "") if cond_raw else ""

    # Time posted
    time_raw = card.get("createdAt", card.get("listedAt", card.get("time", "")))
    if isinstance(time_raw, dict):
        time_raw = time_raw.get("display", time_raw.get("seconds", ""))
    time_posted = parse_relative_time(str(time_raw)) if time_raw else ""

    # Seller info
    seller = card.get("seller", {})
    if isinstance(seller, dict):
        seller_name = seller.get("username", seller.get("name", ""))
        seller_url = f"{BASE_URL}/u/{seller_name}" if seller_name else ""
    else:
        seller_name = str(seller)
        seller_url = ""

    # Item URL
    slug = card.get("slug", "")
    item_url = (
        f"{LISTING_URL}{uid}-{slug}" if slug
        else f"{LISTING_URL}{uid}"
    )

    # Image
    photos = card.get("photos", card.get("images", []))
    item_img = ""
    if photos and isinstance(photos, list):
        first = photos[0]
        if isinstance(first, dict):
            item_img = first.get("url", first.get("imageUrl", ""))
        else:
            item_img = str(first)

    # Location
    location_raw = card.get("location", {})
    if isinstance(location_raw, dict):
        location = location_raw.get("humanized", location_raw.get("name", ""))
    else:
        location = str(location_raw)

    description = card.get("description", "")

    return ScrapedListing(
        uid=uid,
        title=title,
        price=price_val,
        currency=currency,
        price_label=price_label,
        condition=condition,
        time_posted=time_posted,
        seller_name=seller_name,
        seller_url=seller_url,
        listing_url=item_url,
        image_url=item_img,
        description=description,
        location=location,
    )
