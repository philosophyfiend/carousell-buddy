from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.search import SavedSearch, ScrapeRun
from app.core.security import get_current_user
from app.schemas.search import SavedSearchCreate, SavedSearchUpdate, SavedSearchOut, ScrapeRunOut
from app.scraper.scheduler import scheduler

router = APIRouter()


@router.get("", response_model=list[SavedSearchOut])
async def list_searches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedSearch)
        .where(SavedSearch.user_id == current_user.id)
        .order_by(SavedSearch.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=SavedSearchOut, status_code=status.HTTP_201_CREATED)
async def create_search(
    payload: SavedSearchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    search = SavedSearch(
        user_id=current_user.id,
        name=payload.name,
        keyword=payload.keyword,
        category_id=payload.category_id,
        category_name=payload.category_name,
        brand_filters=payload.brand_filters,
        size_filters=payload.size_filters,
        condition=payload.condition,
        min_price=payload.min_price,
        max_price=payload.max_price,
        sort_by=payload.sort_by,
        interval_minutes=payload.interval_minutes,
        enabled=True,
    )
    db.add(search)
    await db.flush()
    await db.refresh(search)

    # Register with scheduler
    scheduler.add_search(search)

    return search


@router.get("/{search_id}", response_model=SavedSearchOut)
async def get_search(
    search_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedSearch).where(
            SavedSearch.id == search_id,
            SavedSearch.user_id == current_user.id,
        )
    )
    search = result.scalar_one_or_none()
    if not search:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search not found")
    return search


@router.patch("/{search_id}", response_model=SavedSearchOut)
async def update_search(
    search_id: UUID,
    payload: SavedSearchUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedSearch).where(
            SavedSearch.id == search_id,
            SavedSearch.user_id == current_user.id,
        )
    )
    search = result.scalar_one_or_none()
    if not search:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search not found")

    scheduler_dirty = False
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ("interval_minutes", "enabled"):
            scheduler_dirty = True
        setattr(search, field, value)

    await db.flush()
    await db.refresh(search)

    if scheduler_dirty:
        scheduler.update_search(search)

    return search


@router.delete("/{search_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_search(
    search_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedSearch).where(
            SavedSearch.id == search_id,
            SavedSearch.user_id == current_user.id,
        )
    )
    search = result.scalar_one_or_none()
    if not search:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search not found")

    scheduler.remove_search(str(search_id))
    await db.delete(search)


@router.post("/{search_id}/run", status_code=status.HTTP_202_ACCEPTED)
async def run_search_now(
    search_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedSearch).where(
            SavedSearch.id == search_id,
            SavedSearch.user_id == current_user.id,
        )
    )
    search = result.scalar_one_or_none()
    if not search:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search not found")

    scheduler.run_search_now(str(search_id))
    return {"detail": "Scrape job queued"}


@router.get("/{search_id}/runs", response_model=list[ScrapeRunOut])
async def list_scrape_runs(
    search_id: UUID,
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    search_result = await db.execute(
        select(SavedSearch).where(
            SavedSearch.id == search_id,
            SavedSearch.user_id == current_user.id,
        )
    )
    if not search_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search not found")

    result = await db.execute(
        select(ScrapeRun)
        .where(ScrapeRun.search_id == search_id)
        .order_by(ScrapeRun.started_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
