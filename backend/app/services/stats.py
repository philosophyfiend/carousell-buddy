"""
Price intelligence service.
Queries the DB for listing prices and computes percentile statistics using numpy.
Ported from carousell-hk's stats/pricing.py, adapted to query PostgreSQL instead of CSV files.
"""
import logging
from typing import Optional
from uuid import UUID

import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.listing import Listing, ListingStatus
from app.schemas.stats import PriceStats

logger = logging.getLogger(__name__)

# Minimum number of price data points required to compute meaningful statistics
MIN_PRICE_SAMPLES = 5


async def get_price_stats(search_id: UUID, db: AsyncSession) -> Optional[PriceStats]:
    """
    Compute price percentile statistics for all active listings in a search.

    Queries all Listing rows for the given search_id, filters out null/zero prices,
    then computes min, max, mean, median and key percentiles (p10, p25, p75, p90).

    Args:
        search_id: UUID of the SavedSearch to analyse.
        db: Async SQLAlchemy session.

    Returns:
        PriceStats schema instance, or None if there are fewer than MIN_PRICE_SAMPLES
        valid price data points.
    """
    result = await db.execute(
        select(Listing.price).where(
            Listing.search_id == search_id,
            Listing.status == ListingStatus.active,
            Listing.price.is_not(None),
            Listing.price > 0,
        )
    )
    prices_raw = result.scalars().all()

    if len(prices_raw) < MIN_PRICE_SAMPLES:
        logger.info(
            "search %s: only %d valid prices (need %d), skipping stats",
            search_id, len(prices_raw), MIN_PRICE_SAMPLES,
        )
        return None

    arr = np.array([float(p) for p in prices_raw])

    stats = PriceStats(
        count=len(arr),
        min=float(arr.min()),
        max=float(arr.max()),
        mean=float(arr.mean()),
        median=float(np.median(arr)),
        p10=float(np.percentile(arr, 10)),
        p25=float(np.percentile(arr, 25)),
        p75=float(np.percentile(arr, 75)),
        p90=float(np.percentile(arr, 90)),
    )

    logger.info(
        "search %s: price stats computed over %d samples (p10=%.0f, p50=%.0f, p90=%.0f)",
        search_id, stats.count, stats.p10, stats.median, stats.p90,
    )
    return stats
