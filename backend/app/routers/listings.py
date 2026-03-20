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
from app.core.security import get_current_user
from app.schemas.listing import (
    ListingOut,
    PaginatedListings,
    ExcludeListingRequest,
    ExcludedListingOut,
)

router = APIRouter()


@router.get("", response_model=PaginatedListings)
async def list_listings(
    search_id: uuid.UUID = Query(...),
    status_filter: Optional[str] = Query(default="active", alias="status"),
    show_excluded: bool = Query(default=False),
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

    # Filter based on excluded status
    excluded_subq = select(ExcludedListing.listing_id).where(
        ExcludedListing.user_id == current_user.id
    )
    if show_excluded:
        # Show ONLY excluded listings
        base_query = base_query.where(Listing.id.in_(excluded_subq))
    else:
        # Hide excluded listings (default)
        base_query = base_query.where(Listing.id.notin_(excluded_subq))

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

    items = []
    for listing in listings:
        out = ListingOut.model_validate(listing)
        out.is_excluded = show_excluded  # all items in this response share the same excluded state
        items.append(out)

    pages = math.ceil(total / page_size) if page_size > 0 else 0

    return PaginatedListings(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


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
