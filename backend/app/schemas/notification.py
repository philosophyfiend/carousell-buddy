import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class NotificationConfigCreate(BaseModel):
    apprise_urls: list[str] = []
    notify_new_listings: bool = True
    notify_price_drop: bool = False
    price_drop_threshold_pct: int = Field(default=10, ge=1, le=100)
    enabled: bool = True


class NotificationConfigUpdate(BaseModel):
    apprise_urls: Optional[list[str]] = None
    notify_new_listings: Optional[bool] = None
    notify_price_drop: Optional[bool] = None
    price_drop_threshold_pct: Optional[int] = Field(default=None, ge=1, le=100)
    enabled: Optional[bool] = None


class NotificationConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    apprise_urls: list
    notify_new_listings: bool
    notify_price_drop: bool
    price_drop_threshold_pct: int
    enabled: bool
    created_at: datetime
    updated_at: datetime


class TestNotificationRequest(BaseModel):
    apprise_url: str


class TestNotificationResponse(BaseModel):
    success: bool
    message: str
