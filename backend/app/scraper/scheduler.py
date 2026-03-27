"""
APScheduler-based scrape scheduler.
Loads all enabled SavedSearches on startup and runs them on their configured interval.
Uses Playwright (headless Chromium) for scraping via fetch_listings().
"""
import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select, update as sa_update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models.search import SavedSearch, ScrapeRun, ScrapeRunStatus
from app.models.listing import Listing, ListingStatus
from app.models.price_history import PriceHistory
from app.models.notification import NotificationConfig
from app.scraper.scraper import fetch_listings
from app.services.notifier import send_new_listings_notification

logger = logging.getLogger(__name__)
settings = get_settings()


class ScraperScheduler:
    def __init__(self):
        self._scheduler = AsyncIOScheduler()

    async def start(self):
        """Load all enabled searches and schedule them, then start the APScheduler."""
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(SavedSearch).where(SavedSearch.enabled == True)
            )
            searches = result.scalars().all()
            for search in searches:
                self._schedule_search(search)
        self._scheduler.start()
        logger.info("ScraperScheduler started with %d searches", len(searches))

    async def stop(self):
        """Shutdown the scheduler."""
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)
        logger.info("ScraperScheduler stopped")

    def _schedule_search(self, search: SavedSearch):
        """Register or replace the APScheduler job for a search."""
        job_id = f"search_{search.id}"
        if self._scheduler.get_job(job_id):
            self._scheduler.remove_job(job_id)
        self._scheduler.add_job(
            self._execute_scrape,
            trigger=IntervalTrigger(minutes=search.interval_minutes),
            id=job_id,
            args=[str(search.id)],
            replace_existing=True,
            misfire_grace_time=60,
        )

    def add_search(self, search: SavedSearch):
        """Register a newly-created search with the scheduler."""
        if search.enabled:
            self._schedule_search(search)

    def remove_search(self, search_id: str):
        """Remove a search from the scheduler (e.g. after deletion)."""
        job_id = f"search_{search_id}"
        if self._scheduler.get_job(job_id):
            self._scheduler.remove_job(job_id)

    def update_search(self, search: SavedSearch):
        """Re-schedule a search after interval or enabled state changes."""
        self.remove_search(str(search.id))
        if search.enabled:
            self._schedule_search(search)

    def run_search_now(self, search_id: str):
        """Fire an immediate scrape as a background asyncio task."""
        task = asyncio.create_task(self._execute_scrape(search_id))
        task.add_done_callback(
            lambda t: logger.error("run_search_now failed: %s", t.exception())
            if t.exception() else None
        )

    async def _execute_scrape(self, search_id: str):
        """
        Core scrape execution:
          1. Load search from DB.
          2. Call fetch_listings() (Playwright).
          3. Upsert listings into DB with PostgreSQL ON CONFLICT.
          4. Mark unseen listings as sold.
          5. Send notifications for new listings.
        """
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(SavedSearch)
                .options(selectinload(SavedSearch.user))
                .where(SavedSearch.id == UUID(search_id))
            )
            search = result.scalar_one_or_none()
            if not search or not search.enabled:
                return

            run = ScrapeRun(
                search_id=search.id,
                started_at=datetime.now(timezone.utc),
                status=ScrapeRunStatus.running,
            )
            db.add(run)
            await db.flush()

            try:
                scraped = await fetch_listings(search, settings)

                if not scraped:
                    run.status = ScrapeRunStatus.ok
                    run.finished_at = datetime.now(timezone.utc)
                    run.listings_found = 0
                    run.new_listings = 0
                    search.last_run_at = datetime.now(timezone.utc)
                    await db.commit()
                    return

                # Deduplicate by carousell_id (scraper may return duplicates)
                seen_map: dict[str, object] = {}
                for item in scraped:
                    seen_map[item.uid] = item
                scraped_unique = list(seen_map.values())

                run.listings_found = len(scraped_unique)
                now = datetime.now(timezone.utc)
                seen_ids = set(seen_map.keys())

                # Build rows for bulk upsert
                rows = [
                    {
                        "carousell_id": item.uid,
                        "search_id": search.id,
                        "title": item.title,
                        "price": int(item.price) if item.price else None,
                        "condition": item.condition or None,
                        "seller_name": item.seller_name or None,
                        "seller_url": item.seller_url or None,
                        "listing_url": item.listing_url,
                        "image_url": item.image_url or None,
                        "description": item.description or None,
                        "status": ListingStatus.active,
                        "first_seen_at": now,
                        "last_seen_at": now,
                        "sold_at": None,
                    }
                    for item in scraped_unique
                ]

                # Atomic upsert: insert new, update existing on conflict
                stmt = pg_insert(Listing).values(rows)
                upsert_stmt = stmt.on_conflict_do_update(
                    constraint="uq_listing_search",
                    set_={
                        "title": stmt.excluded.title,
                        "price": stmt.excluded.price,
                        "listing_url": stmt.excluded.listing_url,
                        "image_url": stmt.excluded.image_url,
                        "condition": stmt.excluded.condition,
                        "seller_name": stmt.excluded.seller_name,
                        "seller_url": stmt.excluded.seller_url,
                        "last_seen_at": stmt.excluded.last_seen_at,
                        "status": ListingStatus.active,
                        "sold_at": None,
                    },
                ).returning(Listing.id, Listing.carousell_id, Listing.first_seen_at)

                result = await db.execute(upsert_stmt)
                returned_rows = result.fetchall()

                # New listings = rows where first_seen_at matches now (just inserted)
                new_listing_ids = [
                    row.id for row in returned_rows
                    if abs((row.first_seen_at - now).total_seconds()) < 1
                ]
                new_count = len(new_listing_ids)

                # Record price history for all upserted listings that have prices
                upserted_ids = [row.id for row in returned_rows]
                if upserted_ids:
                    price_rows = await db.execute(
                        select(Listing.id, Listing.price).where(
                            Listing.id.in_(upserted_ids),
                            Listing.price.isnot(None),
                        )
                    )
                    # Only record if price differs from last recorded price (or first record)
                    for lid, lprice in price_rows.fetchall():
                        last_price_result = await db.execute(
                            select(PriceHistory.price)
                            .where(PriceHistory.listing_id == lid)
                            .order_by(PriceHistory.recorded_at.desc())
                            .limit(1)
                        )
                        last_price = last_price_result.scalar_one_or_none()
                        if last_price is None or last_price != lprice:
                            db.add(PriceHistory(listing_id=lid, price=lprice, recorded_at=now))

                # Mark previously-active listings not seen this run as sold
                await db.execute(
                    sa_update(Listing)
                    .where(
                        Listing.search_id == search.id,
                        Listing.status == ListingStatus.active,
                        Listing.carousell_id.not_in(seen_ids),
                    )
                    .values(status=ListingStatus.sold, sold_at=now)
                )

                run.new_listings = new_count
                run.status = ScrapeRunStatus.ok
                run.finished_at = now
                search.last_run_at = now
                await db.commit()

                # Fetch new listing objects for notification
                new_listing_objects: list[Listing] = []
                if new_listing_ids:
                    nl_result = await db.execute(
                        select(Listing).where(Listing.id.in_(new_listing_ids))
                    )
                    new_listing_objects = nl_result.scalars().all()

                # Send notifications
                if new_count > 0:
                    nc_result = await db.execute(
                        select(NotificationConfig).where(
                            NotificationConfig.user_id == search.user_id,
                            NotificationConfig.enabled == True,
                        )
                    )
                    notif_config = nc_result.scalar_one_or_none()
                    if notif_config and notif_config.notify_new_listings:
                        await send_new_listings_notification(
                            notif_config,
                            search,
                            new_listing_objects,
                            telegram_bot_token=settings.TELEGRAM_BOT_TOKEN or None,
                            telegram_chat_id=settings.TELEGRAM_CHAT_ID or None,
                        )

            except Exception as exc:
                logger.error("Scrape failed for search %s: %s", search_id, exc, exc_info=True)
                run.status = ScrapeRunStatus.error
                run.error_message = str(exc)
                run.finished_at = datetime.now(timezone.utc)
                await db.commit()


scheduler = ScraperScheduler()
