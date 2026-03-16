from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.notification import NotificationConfig
from app.core.security import get_current_user
from app.schemas.notification import (
    NotificationConfigCreate,
    NotificationConfigUpdate,
    NotificationConfigOut,
    TestNotificationRequest,
    TestNotificationResponse,
)
from app.services.notifier import test_notification

router = APIRouter()


async def _get_or_create_config(user: User, db: AsyncSession) -> NotificationConfig:
    result = await db.execute(
        select(NotificationConfig).where(NotificationConfig.user_id == user.id)
    )
    config = result.scalar_one_or_none()

    if not config:
        config = NotificationConfig(
            user_id=user.id,
            apprise_urls=[],
            notify_new_listings=True,
            notify_price_drop=False,
            price_drop_threshold_pct=10,
            enabled=True,
        )
        db.add(config)
        await db.flush()
        await db.refresh(config)

    return config


async def _update_config(
    payload: NotificationConfigUpdate,
    user: User,
    db: AsyncSession,
) -> NotificationConfig:
    result = await db.execute(
        select(NotificationConfig).where(NotificationConfig.user_id == user.id)
    )
    config = result.scalar_one_or_none()

    if config:
        update_data = payload.model_dump(exclude_none=True)
        for key, value in update_data.items():
            setattr(config, key, value)
    else:
        config = NotificationConfig(
            user_id=user.id,
            apprise_urls=payload.apprise_urls if payload.apprise_urls is not None else [],
            notify_new_listings=payload.notify_new_listings if payload.notify_new_listings is not None else True,
            notify_price_drop=payload.notify_price_drop if payload.notify_price_drop is not None else False,
            price_drop_threshold_pct=payload.price_drop_threshold_pct if payload.price_drop_threshold_pct is not None else 10,
            enabled=payload.enabled if payload.enabled is not None else True,
        )
        db.add(config)

    await db.flush()
    await db.refresh(config)
    return config


@router.get("/config", response_model=NotificationConfigOut)
async def get_notification_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_or_create_config(current_user, db)


@router.get("", response_model=NotificationConfigOut)
async def get_notification_config_compat(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_or_create_config(current_user, db)


@router.patch("/config", response_model=NotificationConfigOut)
async def patch_notification_config(
    payload: NotificationConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _update_config(payload, current_user, db)


@router.put("/config", response_model=NotificationConfigOut)
async def put_notification_config(
    payload: NotificationConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _update_config(payload, current_user, db)


@router.put("", response_model=NotificationConfigOut)
async def upsert_notification_config_compat(
    payload: NotificationConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _update_config(payload, current_user, db)


@router.post("/test", response_model=TestNotificationResponse)
async def test_notification_endpoint(
    payload: TestNotificationRequest,
    current_user: User = Depends(get_current_user),
):
    success, message = await test_notification(payload.apprise_url)
    return TestNotificationResponse(success=success, message=message)
