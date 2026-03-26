import math
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.database import get_db
from app.models.user import User
from app.models.listing import Listing, ListingStatus
from app.models.search import SavedSearch
from app.models.excluded_listing import ExcludedListing
from app.models.price_history import PriceHistory
from app.core.security import get_current_user
from app.schemas.listing import (
    ListingOut,
    PaginatedListings,
    ExcludeListingRequest,
    ExcludedListingOut,
    PriceHistoryPoint,
    PriceHistoryResponse,
)

router = APIRouter()


def _apply_status_filter(query, status_filter: Optional[str]):
    """Apply status filter to a listing query."""
    if status_filter and status_filter != "all":
        try:
            listing_status = ListingStatus(status_filter)
            query = query.where(Listing.status == listing_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status value: {status_filter}. Must be one of: active, sold, deleted, all",
            )
    return query


def _apply_excluded_filter(query, user_id: uuid.UUID, show_excluded: bool):
    """Apply excluded/hidden filter to a listing query."""
    excluded_subq = select(ExcludedListing.listing_id).where(
        ExcludedListing.user_id == user_id
    )
    if show_excluded:
        query = query.where(Listing.id.in_(excluded_subq))
    else:
        query = query.where(Listing.id.notin_(excluded_subq))
    return query


async def _paginate_listings(
    db: AsyncSession,
    base_query,
    page: int,
    page_size: int,
    show_excluded: bool,
    sort_by: Optional[str] = None,
):
    """Count, paginate, and return PaginatedListings."""
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Sort
    order = Listing.first_seen_at.desc()
    if sort_by == "price_asc":
        order = Listing.price.asc().nullslast()
    elif sort_by == "price_desc":
        order = Listing.price.desc().nullslast()

    offset = (page - 1) * page_size
    listings_result = await db.execute(
        base_query.order_by(order).offset(offset).limit(page_size)
    )
    listings = listings_result.scalars().all()

    items = []
    for listing in listings:
        out = ListingOut.model_validate(listing)
        out.is_excluded = show_excluded
        items.append(out)

    pages = math.ceil(total / page_size) if page_size > 0 else 0

    return PaginatedListings(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/all", response_model=PaginatedListings)
async def list_all_listings(
    status_filter: Optional[str] = Query(default="active", alias="status"),
    show_excluded: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=48, ge=1, le=200),
    sort_by: Optional[str] = Query(default=None),
    search_id: Optional[uuid.UUID] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all listings across all of the user's searches."""
    base_query = (
        select(Listing)
        .join(SavedSearch, Listing.search_id == SavedSearch.id)
        .where(SavedSearch.user_id == current_user.id)
    )

    if search_id:
        base_query = base_query.where(Listing.search_id == search_id)

    base_query = _apply_status_filter(base_query, status_filter)
    base_query = _apply_excluded_filter(base_query, current_user.id, show_excluded)

    return await _paginate_listings(db, base_query, page, page_size, show_excluded, sort_by)


@router.get("", response_model=PaginatedListings)
async def list_listings(
    search_id: uuid.UUID = Query(...),
    status_filter: Optional[str] = Query(default="active", alias="status"),
    show_excluded: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=48, ge=1, le=200),
    sort_by: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List listings for a specific search."""
    search_result = await db.execute(
        select(SavedSearch).where(
            SavedSearch.id == search_id,
            SavedSearch.user_id == current_user.id,
        )
    )
    if not search_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search not found")

    base_query = select(Listing).where(Listing.search_id == search_id)
    base_query = _apply_status_filter(base_query, status_filter)
    base_query = _apply_excluded_filter(base_query, current_user.id, show_excluded)

    return await _paginate_listings(db, base_query, page, page_size, show_excluded, sort_by)


@router.post("/exclude", response_model=ExcludedListingOut, status_code=status.HTTP_201_CREATED)
async def exclude_listing(
    body: ExcludeListingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify the listing exists and belongs to a search owned by this user
    result = await db.execute(
        select(Listing)
        .join(SavedSearch, Listing.search_id == SavedSearch.id)
        .where(Listing.id == body.listing_id, SavedSearch.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    # Check if already excluded
    existing = await db.execute(
        select(ExcludedListing).where(
            ExcludedListing.user_id == current_user.id,
            ExcludedListing.listing_id == body.listing_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Listing already excluded")

    exclusion = ExcludedListing(user_id=current_user.id, listing_id=body.listing_id)
    db.add(exclusion)
    await db.flush()
    return ExcludedListingOut.model_validate(exclusion)


@router.delete("/exclude/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def restore_listing(
    listing_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        delete(ExcludedListing).where(
            ExcludedListing.user_id == current_user.id,
            ExcludedListing.listing_id == listing_id,
        )
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exclusion not found")


@router.get("/{listing_id}/price-history", response_model=PriceHistoryResponse)
async def get_price_history(
    listing_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get price history for a specific listing."""
    listing_result = await db.execute(
        select(Listing)
        .join(SavedSearch, Listing.search_id == SavedSearch.id)
        .where(Listing.id == listing_id, SavedSearch.user_id == current_user.id)
    )
    listing = listing_result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    history_result = await db.execute(
        select(PriceHistory)
        .where(PriceHistory.listing_id == listing_id)
        .order_by(PriceHistory.recorded_at.asc())
    )
    history = history_result.scalars().all()

    return PriceHistoryResponse(
        listing_id=listing_id,
        current_price=listing.price,
        history=[PriceHistoryPoint.model_validate(h) for h in history],
    )
