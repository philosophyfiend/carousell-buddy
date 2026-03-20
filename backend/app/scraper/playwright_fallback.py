"""
Playwright-based fallback scraper for Carousell HK.
Used when the direct cloudscraper API client fails or returns empty results.
Renders the search page with headless Chromium and extracts listings from the DOM.
"""
import asyncio
import logging
import re
import time
from typing import Optional
from urllib.parse import quote, urlencode

from app.scraper.models import ScrapedListing
from app.scraper.parser import parse_price, parse_relative_time

logger = logging.getLogger(__name__)

BASE_URL = "https://www.carousell.com.hk"

# Seconds to wait after page load for the React SPA to render
PAGE_RENDER_WAIT = 12

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)


def _build_search_url(
    query: str,
    sort_by: str = "time_created,descending",
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    condition: Optional[str] = None,
) -> str:
    """Build a Carousell HK search URL with optional filters."""
    path = f"{BASE_URL}/search/{quote(query)}"
    params: dict = {}
    if sort_by:
        params["sort_by"] = sort_by
    if min_price is not None:
        params["price_start"] = int(min_price)
    if max_price is not None:
        params["price_end"] = int(max_price)
    if condition:
        params["condition"] = condition
    if params:
        return f"{path}?{urlencode(params)}"
    return path


def _parse_card(card) -> Optional[ScrapedListing]:
    """Parse a single BeautifulSoup card element into a ScrapedListing."""
    href = card.get("href", "")
    if not href:
        return None

    # Build absolute URL, strip tracking params
    item_url = href if href.startswith("http") else BASE_URL + href
    item_url = item_url.split("?")[0]

    # UID: last long numeric segment before trailing slash
    uid_match = re.search(r"-(\d{7,})(?:/|$)", href)
    if not uid_match:
        return None
    uid = uid_match.group(1)

    # Title: most reliable source is img[alt]
    img_tag = card.find("img")
    if img_tag:
        title = img_tag.get("alt", "").strip()
        item_img = img_tag.get("src", "")
    else:
        title = ""
        item_img = ""

    # Fallback to largest <p> text
    if not title:
        for p in card.find_all("p"):
            txt = p.get_text(strip=True)
            if len(txt) > len(title):
                title = txt

    # Price: <p title="HK$X"> is the most reliable selector
    price_val = 0.0
    price_label = ""
    for p in card.find_all("p"):
        t = p.get("title", "")
        if t and re.search(r"HK\$|free|免費", t, re.IGNORECASE):
            price_val, price_label = parse_price(t)
            break
        txt = p.get_text(strip=True)
        if re.match(r"^HK\$[\d,]+", txt):
            price_val, price_label = parse_price(txt)
            break

    # Condition: first gray-colored <p> that is not the title or price
    condition = ""
    for p in card.find_all("p"):
        style = p.get("style", "")
        txt = p.get_text(strip=True)
        if "rgb(87" in style and txt and txt != title and not txt.startswith("HK$"):
            condition = txt
            break

    # Seller name: gray <p> that comes after condition
    seller_name = ""
    found_condition = False
    for p in card.find_all("p"):
        style = p.get("style", "")
        txt = p.get_text(strip=True)
        if "rgb(87" in style and txt and txt != condition and txt != title:
            if found_condition:
                seller_name = txt
                break
            if txt == condition:
                found_condition = True

    seller_url = f"{BASE_URL}/u/{seller_name}" if seller_name else ""

    # Time posted
    time_posted = ""
    time_tag = card.find("time")
    if time_tag:
        time_posted = parse_relative_time(
            time_tag.get("datetime", "") or time_tag.get_text(strip=True)
        )

    return ScrapedListing(
        uid=uid,
        title=title,
        price=price_val,
        price_label=price_label,
        condition=condition,
        time_posted=time_posted,
        seller_name=seller_name,
        seller_url=seller_url,
        listing_url=item_url,
        image_url=item_img,
    )


def _parse_page(soup, limit: int) -> list[ScrapedListing]:
    """Extract listings from a BeautifulSoup-parsed page."""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        logger.error("beautifulsoup4 not installed")
        return []

    cards = soup.find_all("a", href=lambda h: h and "/p/" in h)
    listings: list[ScrapedListing] = []
    seen_uids: set[str] = set()

    for card in cards:
        listing = _parse_card(card)
        if listing and listing.uid not in seen_uids:
            seen_uids.add(listing.uid)
            listings.append(listing)
            if len(listings) >= limit:
                break

    return listings


async def scrape_with_playwright(
    query: str,
    max_pages: int = 3,
    sort_by: str = "time_created,descending",
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    condition: Optional[str] = None,
    count: int = 200,
) -> list[ScrapedListing]:
    """
    Render the Carousell HK search page with async Playwright (headless Chromium)
    and extract listings from the rendered DOM.

    Args:
        query: Search term.
        max_pages: Not used for pagination (Playwright scrolls), kept for API compat.
        sort_by: URL sort_by parameter value.
        min_price: Optional minimum price filter.
        max_price: Optional maximum price filter.
        condition: Optional condition filter string (e.g. "new", "good").
        count: Maximum number of listings to return.

    Returns:
        List of ScrapedListing objects.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.error(
            "playwright not installed. Run: pip install playwright && playwright install chromium"
        )
        return []

    try:
        from bs4 import BeautifulSoup
    except ImportError:
        logger.error("beautifulsoup4 not installed")
        return []

    url = _build_search_url(query, sort_by=sort_by, min_price=min_price, max_price=max_price, condition=condition)
    logger.info("Playwright: loading %s", url)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page(user_agent=USER_AGENT)
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            # Wait for the React SPA to render listing cards
            await asyncio.sleep(PAGE_RENDER_WAIT)

            html_content = await page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            listings = _parse_page(soup, count)

            # Scroll to load more if needed
            attempts = 0
            while len(listings) < count and attempts < 10:
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(3)
                html_content = await page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                new_listings = _parse_page(soup, count)
                if len(new_listings) <= len(listings):
                    break
                listings = new_listings
                attempts += 1

            logger.info("Playwright: extracted %d listings", len(listings))
            return listings

        except Exception as exc:
            logger.error("Playwright scrape failed: %s", exc)
            return []
        finally:
            await browser.close()
