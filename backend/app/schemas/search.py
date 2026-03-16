import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.search import ConditionEnum, SortByEnum, ScrapeRunStatus


class SavedSearchCreate(BaseModel):
    name: str
    keyword: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    brand_filters: list[str] = []
    size_filters: list[str] = []
    condition: ConditionEnum = ConditionEnum.BOTH
    min_price: Optional[int] = None
    max_price: Optional[int] = None
    sort_by: SortByEnum = SortByEnum.newest
    interval_minutes: int = Field(default=60, ge=5)


class SavedSearchUpdate(BaseModel):
    name: Optional[str] = None
    keyword: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    brand_filters: Optional[list[str]] = None
    size_filters: Optional[list[str]] = None
    condition: Optional[ConditionEnum] = None
    min_price: Optional[int] = None
    max_price: Optional[int] = None
    sort_by: Optional[SortByEnum] = None
    interval_minutes: Optional[int] = Field(default=None, ge=5)
    enabled: Optional[bool] = None


class SavedSearchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    keyword: str
    category_id: Optional[str]
    category_name: Optional[str]
    brand_filters: list
    size_filters: list
    condition: ConditionEnum
    min_price: Optional[int]
    max_price: Optional[int]
    sort_by: SortByEnum
    interval_minutes: int
    enabled: bool
    last_run_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class ScrapeRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    search_id: uuid.UUID
    started_at: datetime
    finished_at: Optional[datetime]
    status: ScrapeRunStatus
    listings_found: int
    new_listings: int
    error_message: Optional[str]
