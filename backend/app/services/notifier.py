"""
Notification service.
Sends new-listing notifications via Apprise (supports Slack, Discord, email, etc.)
and optionally directly via Telegram Bot API using python-telegram-bot.
"""
import logging
from typing import Optional

import apprise

from app.models.notification import NotificationConfig
from app.models.search import SavedSearch
from app.models.listing import Listing

logger = logging.getLogger(__name__)


async def send_new_listings_notification(
    config: NotificationConfig,
    search: SavedSearch,
    new_listings: list[Listing],
    telegram_bot_token: Optional[str] = None,
    telegram_chat_id: Optional[str] = None,
):
    """
    Send a new-listings notification via Apprise and optionally via Telegram.

    Args:
        config: User's NotificationConfig (holds Apprise URLs).
        search: The SavedSearch that produced these listings.
        new_listings: List of newly-seen Listing DB objects.
        telegram_bot_token: Optional Telegram bot token for direct Telegram sending.
        telegram_chat_id: Optional Telegram chat ID string for direct Telegram sending.
    """
    if not new_listings:
        return

    count = len(new_listings)

    # ── Apprise notifications ────────────────────────────────────────────────
    if config.apprise_urls:
        ap = apprise.Apprise()
        for url in config.apprise_urls:
            ap.add(url)

        title = f"[Carousell] {count} new listing{'s' if count > 1 else ''} — {search.name}"

        body_lines = [f"**{search.name}** — {count} new listing{'s' if count > 1 else ''} found\n"]
        for listing in new_listings[:10]:
            price_str = f"HK${listing.price:,}" if listing.price else "Price N/A"
            body_lines.append(f"• [{listing.title}]({listing.listing_url}) — {price_str}")
        if count > 10:
            body_lines.append(f"\n...and {count - 10} more.")

        body = "\n".join(body_lines)

        try:
            await ap.async_notify(title=title, body=body)
            logger.info("Apprise notification sent for search '%s': %d new listings", search.name, count)
        except Exception as exc:
            logger.error("Failed to send Apprise notification: %s", exc)

    # ── Direct Telegram notification ─────────────────────────────────────────
    if telegram_bot_token and telegram_chat_id:
        await _send_telegram_notification(
            bot_token=telegram_bot_token,
            chat_id=telegram_chat_id,
            search_name=search.name,
            new_listings=new_listings,
        )


async def _send_telegram_notification(
    bot_token: str,
    chat_id: str,
    search_name: str,
    new_listings: list[Listing],
) -> None:
    """Send a formatted Telegram message for new listings."""
    try:
        from telegram import Bot
        from telegram.constants import ParseMode

        bot = Bot(token=bot_token)
        count = len(new_listings)

        lines = [f"🔔 *{search_name}*: {count} new listing{'s' if count > 1 else ''}"]
        for listing in new_listings[:10]:
            price_str = f"HK${listing.price:,}" if listing.price else "Price N/A"
            # Escape Markdown special chars in title
            safe_title = listing.title.replace("*", "").replace("_", "").replace("`", "")
            lines.append(f"• [{safe_title}]({listing.listing_url}) — {price_str}")
        if count > 10:
            lines.append(f"...and {count - 10} more.")

        text = "\n".join(lines)

        await bot.send_message(
            chat_id=chat_id,
            text=text,
            parse_mode=ParseMode.MARKDOWN,
            disable_web_page_preview=True,
        )
        logger.info("Telegram notification sent for search '%s'", search_name)

    except Exception as exc:
        logger.error("Failed to send Telegram notification: %s", exc)


async def test_notification(apprise_url: str) -> tuple[bool, str]:
    """Send a test notification to a single Apprise URL. Returns (success, message)."""
    ap = apprise.Apprise()
    ap.add(apprise_url)
    try:
        result = await ap.async_notify(
            title="Carousell Tracker — Test Notification",
            body="Your notification is configured correctly!",
        )
        return bool(result), (
            "Notification sent successfully" if result else "Notification failed — check your URL"
        )
    except Exception as exc:
        return False, str(exc)
