"""
Scraper orchestrator — uses Playwright to fetch Carousell HK listings.
"""
import logging

from app.config import Settings
from app.models.search import SavedSearch, ConditionEnum, SortByEnum
from app.scraper.models import ScrapedListing

logger = logging.getLogger(__name__)

# Map SortByEnum → Playwright URL sort_by string
_SORT_URL_VALUES = {
    SortByEnum.newest: "time_created,descending",
    SortByEnum.price_asc: "price,ascending",
    SortByEnum.price_desc: "price,descending",
    SortByEnum.relevance: "",
}

# Map ConditionEnum → Playwright URL condition string
_CONDITION_URL_VALUES = {
    ConditionEnum.NEW: "new",
    ConditionEnum.USED: "good",
    ConditionEnum.BOTH: None,
}


async def fetch_listings(search: SavedSearch, settings: Settings) -> list[ScrapedListing]:
    """
    Fetch listings for a SavedSearch using Playwright (headless Chromium).
    Deduplicates by uid before returning.
    """
    from app.scraper.playwright_fallback import scrape_with_playwright

    sort_val = _SORT_URL_VALUES.get(search.sort_by, "time_created,descending")
    condition_val = _CONDITION_URL_VALUES.get(search.condition, None)

    listings = await scrape_with_playwright(
        query=search.keyword,
        max_pages=settings.SCRAPE_MAX_PAGES,
        sort_by=sort_val,
        min_price=float(search.min_price) if search.min_price is not None else None,
        max_price=float(search.max_price) if search.max_price is not None else None,
        condition=condition_val,
    )
    logger.info(
        "search '%s': Playwright returned %d listings",
        search.keyword, len(listings),
    )

    # Deduplicate by uid (keep first occurrence)
    seen: set[str] = set()
    deduped: list[ScrapedListing] = []
    for listing in listings:
        if listing.uid and listing.uid not in seen:
            seen.add(listing.uid)
            deduped.append(listing)

    return deduped
