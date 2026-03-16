"""
Orchestrator that tries the cloudscraper API first, then falls back to Playwright.
"""
import asyncio
import logging
from typing import Optional

from app.config import Settings
from app.models.search import SavedSearch, ConditionEnum, SortByEnum
from app.scraper import api as carousell_api
from app.scraper.models import ScrapedListing
from app.scraper.parser import randsleep

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
    Fetch listings for a SavedSearch using the primary cloudscraper API client.
    Falls back to Playwright on repeated failure or empty results.

    Strategy:
      1. Try cloudscraper API up to settings.SCRAPE_RETRY_ATTEMPTS times.
      2. If all attempts fail or return empty, fall back to Playwright.
      3. Deduplicate by uid before returning.

    Args:
        search: The SavedSearch DB object with keyword and filter fields.
        settings: Application settings (for retry counts and sleep ranges).

    Returns:
        Deduplicated list of ScrapedListing objects.
    """
    last_result: list[ScrapedListing] = []
    success = False

    for attempt in range(1, settings.SCRAPE_RETRY_ATTEMPTS + 1):
        try:
            # Run blocking cloudscraper in a thread executor so we don't block the event loop
            loop = asyncio.get_event_loop()
            listings = await loop.run_in_executor(
                None,
                lambda: carousell_api.search(search, max_pages=settings.SCRAPE_MAX_PAGES),
            )

            if listings:
                last_result = listings
                success = True
                logger.info(
                    "search '%s': attempt %d/%d succeeded with %d listings",
                    search.keyword, attempt, settings.SCRAPE_RETRY_ATTEMPTS, len(listings),
                )
                break
            else:
                logger.warning(
                    "search '%s': attempt %d/%d returned empty results",
                    search.keyword, attempt, settings.SCRAPE_RETRY_ATTEMPTS,
                )

        except Exception as exc:
            logger.warning(
                "search '%s': attempt %d/%d error: %s",
                search.keyword, attempt, settings.SCRAPE_RETRY_ATTEMPTS, exc,
            )

        # Exponential backoff between retries (but not after the last attempt)
        if attempt < settings.SCRAPE_RETRY_ATTEMPTS:
            backoff_min = settings.SLEEP_MIN * (2 ** (attempt - 1))
            backoff_max = settings.SLEEP_MAX * (2 ** (attempt - 1))
            # Cap at reasonable values
            backoff_min = min(backoff_min, 30.0)
            backoff_max = min(backoff_max, 60.0)
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: randsleep(backoff_min, backoff_max),
            )

    if not success:
        logger.warning(
            "search '%s': all %d API attempts failed/empty, falling back to Playwright",
            search.keyword, settings.SCRAPE_RETRY_ATTEMPTS,
        )
        from app.scraper.playwright_fallback import scrape_with_playwright

        sort_val = _SORT_URL_VALUES.get(search.sort_by, "time_created,descending")
        condition_val = _CONDITION_URL_VALUES.get(search.condition, None)

        last_result = await scrape_with_playwright(
            query=search.keyword,
            max_pages=settings.SCRAPE_MAX_PAGES,
            sort_by=sort_val,
            min_price=float(search.min_price) if search.min_price is not None else None,
            max_price=float(search.max_price) if search.max_price is not None else None,
            condition=condition_val,
        )
        logger.info(
            "search '%s': Playwright fallback returned %d listings",
            search.keyword, len(last_result),
        )

    # Deduplicate by uid (keep first occurrence)
    seen: set[str] = set()
    deduped: list[ScrapedListing] = []
    for listing in last_result:
        if listing.uid and listing.uid not in seen:
            seen.add(listing.uid)
            deduped.append(listing)

    return deduped
