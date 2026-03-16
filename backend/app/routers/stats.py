from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.search import SavedSearch
from app.core.security import get_current_user
from app.schemas.stats import PriceStats
from app.services import stats as stats_service

router = APIRouter()


@router.get("/searches/{search_id}/stats", response_model=PriceStats)
async def get_search_stats(
    search_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return price percentile statistics for all active listings in a saved search.

    Requires at least 5 data points; returns 404 if not enough price data is available.
    """
    # Verify the search exists and belongs to the requesting user
    search_result = await db.execute(
        select(SavedSearch).where(
            SavedSearch.id == search_id,
            SavedSearch.user_id == current_user.id,
        )
    )
    search = search_result.scalar_one_or_none()
    if not search:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search not found")

    price_stats = await stats_service.get_price_stats(search_id, db)
    if price_stats is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not enough price data to compute statistics. Run more scrapes first.",
        )

    return price_stats
