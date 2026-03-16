import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.listing import Listing, ListingStatus
from app.models.search import SavedSearch
from app.core.security import get_current_user
from app.schemas.listing import ListingOut, PaginatedListings

router = APIRouter()


@router.get("", response_model=PaginatedListings)
async def list_listings(
    search_id: UUID = Query(...),
    status_filter: Optional[str] = Query(default="active", alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=48, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify the search belongs to the current user
    search_result = await db.execute(
        select(SavedSearch).where(
            SavedSearch.id == search_id,
            SavedSearch.user_id == current_user.id,
        )
    )
    if not search_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search not found")

    # Build query with optional status filter
    base_query = select(Listing).where(Listing.search_id == search_id)
    if status_filter and status_filter != "all":
        try:
            listing_status = ListingStatus(status_filter)
            base_query = base_query.where(Listing.status == listing_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status value: {status_filter}. Must be one of: active, sold, deleted, all",
            )

    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Paginate
    offset = (page - 1) * page_size
    listings_result = await db.execute(
        base_query.order_by(Listing.first_seen_at.desc()).offset(offset).limit(page_size)
    )
    listings = listings_result.scalars().all()

    items = [ListingOut.model_validate(listing) for listing in listings]
    pages = math.ceil(total / page_size) if page_size > 0 else 0

    return PaginatedListings(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )
