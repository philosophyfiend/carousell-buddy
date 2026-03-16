"""
Primary HTTP scraping client for Carousell HK.
Uses cloudscraper to bypass Cloudflare protection and POST to the internal search API.
"""
import logging
from typing import Optional

import cloudscraper

from app.models.search import SavedSearch, SortByEnum, ConditionEnum
from app.scraper.models import ScrapedListing
from app.scraper.parser import parse_listings, get_next_page_token

logger = logging.getLogger(__name__)

BASE_URL = "https://www.carousell.com.hk"
SEARCH_ENDPOINT = "/api-service/filter/cf/4.0/search/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-HK,en;q=0.9,zh-HK;q=0.8,zh;q=0.7",
    "Referer": BASE_URL + "/",
    "Origin": BASE_URL,
}

# Sort-by enum → Carousell API sort_by code
# newest=3, price_asc=2, price_desc=5, relevance=0
_SORT_CODES = {
    SortByEnum.newest: 3,
    SortByEnum.price_asc: 2,
    SortByEnum.price_desc: 5,
    SortByEnum.relevance: 0,
}

# Condition enum → Carousell API condition_v2 code
# NEW=1, USED (good)=3, BOTH=None
_CONDITION_CODES = {
    ConditionEnum.NEW: 1,
    ConditionEnum.USED: 3,
    ConditionEnum.BOTH: None,
}

# Module-level cloudscraper session (reused across calls)
_session: cloudscraper.CloudScraper = cloudscraper.create_scraper(
    browser={"browser": "chrome", "platform": "darwin", "mobile": False}
)
_session.headers.update(HEADERS)
_warmed_up = False


def _warmup() -> None:
    """Visit the homepage once to establish cookies before hitting the API."""
    global _warmed_up
    if _warmed_up:
        return
    try:
        logger.debug("Warming up cloudscraper session…")
        _session.get(BASE_URL + "/", timeout=15)
        _warmed_up = True
        logger.debug("Session warmed up.")
    except Exception as exc:
        logger.warning("Warmup failed (continuing): %s", exc)


def build_payload(search: SavedSearch, page_token: Optional[str] = None) -> dict:
    """
    Build the POST payload for the Carousell search API from a SavedSearch record.
    """
    sort_code = _SORT_CODES.get(search.sort_by, 3)
    condition_code = _CONDITION_CODES.get(search.condition, None)

    payload: dict = {
        "query": search.keyword,
        "count": 20,
        "sort_by": sort_code,
        "price_start": search.min_price if search.min_price is not None else None,
        "price_end": search.max_price if search.max_price is not None else None,
        "condition_v2": condition_code,
        "startingAfter": page_token or "",
    }
    return payload


def fetch_page(search: SavedSearch, page_token: Optional[str] = None) -> Optional[dict]:
    """
    POST to the Carousell search API and return the raw JSON body.
    Returns None on any error.
    """
    _warmup()
    url = BASE_URL + SEARCH_ENDPOINT
    payload = build_payload(search, page_token)

    try:
        resp = _session.post(url, json=payload, timeout=15)
        resp.raise_for_status()
    except Exception as exc:
        logger.warning("Carousell API request failed: %s", exc)
        return None

    try:
        return resp.json()
    except ValueError as exc:
        logger.warning("Non-JSON response from Carousell API: %s", exc)
        return None


def search(search: SavedSearch, max_pages: int = 3) -> list[ScrapedListing]:
    """
    Fetch up to max_pages pages of results for the given SavedSearch.
    Returns a flat list of ScrapedListing objects.
    """
    all_listings: list[ScrapedListing] = []
    page_token: Optional[str] = None

    for page_num in range(max_pages):
        data = fetch_page(search, page_token)
        if data is None:
            logger.warning("Page %d fetch returned None, stopping.", page_num + 1)
            break

        page_listings = parse_listings(data)
        all_listings.extend(page_listings)
        logger.debug("Page %d: got %d listings", page_num + 1, len(page_listings))

        page_token = get_next_page_token(data)
        if not page_token:
            logger.debug("No next page token; stopping after page %d.", page_num + 1)
            break

    return all_listings
