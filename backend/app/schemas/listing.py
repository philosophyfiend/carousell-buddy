import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.listing import ListingStatus


class ListingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    carousell_id: str
    search_id: uuid.UUID
    title: str
    price: Optional[int]
    condition: Optional[str]
    seller_name: Optional[str]
    seller_url: Optional[str]
    listing_url: str
    image_url: Optional[str]
    description: Optional[str]
    status: ListingStatus
    first_seen_at: datetime
    last_seen_at: datetime
    sold_at: Optional[datetime]


class PaginatedListings(BaseModel):
    items: list[ListingOut]
    total: int
    page: int
    page_size: int
    pages: int
