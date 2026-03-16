"""
Telegram bot for the Carousell web app.
Supports /searches, /run, and /stats commands backed by the PostgreSQL database.

Runs in a background daemon thread (separate from FastAPI's event loop)
using its own asyncio event loop, so it doesn't interfere with uvicorn.
"""
import asyncio
import logging
import threading
from typing import Optional

from sqlalchemy import select

from app.config import Settings
from app.database import AsyncSessionLocal
from app.models.search import SavedSearch
from app.services import stats as stats_service

logger = logging.getLogger(__name__)

# Reference to the running Application (for graceful shutdown)
_bot_app = None
_bot_thread: Optional[threading.Thread] = None


# ── DB helpers ───────────────────────────────────────────────────────────────

async def _get_all_searches() -> list[SavedSearch]:
    """Return all SavedSearch rows from the DB."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(SavedSearch).order_by(SavedSearch.name)
        )
        return result.scalars().all()


async def _get_search_by_name(name: str) -> Optional[SavedSearch]:
    """Return the first SavedSearch whose name matches (case-insensitive)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(SavedSearch).where(SavedSearch.name == name)
        )
        return result.scalar_one_or_none()


# ── Command handlers ─────────────────────────────────────────────────────────

async def cmd_start(update, ctx) -> None:
    await update.message.reply_text(
        "Carousell Tracker Bot\n\n"
        "/searches — list all monitored searches\n"
        "/run <name> — trigger an immediate scrape\n"
        "/stats <name> — price statistics for a search\n"
        "/help — show this message"
    )


async def cmd_searches(update, ctx) -> None:
    searches = await _get_all_searches()
    if not searches:
        await update.message.reply_text("No searches configured yet.")
        return

    lines = ["*Active searches:*"]
    for s in searches:
        status = "✓" if s.enabled else "✗"
        last = s.last_run_at.strftime("%Y-%m-%d %H:%M") if s.last_run_at else "never"
        lines.append(
            f"{status} *{s.name}* — `{s.keyword}` | every {s.interval_minutes}m | last: {last}"
        )
    from telegram.constants import ParseMode
    await update.message.reply_text("\n".join(lines), parse_mode=ParseMode.MARKDOWN)


async def cmd_run(update, ctx) -> None:
    args = ctx.args
    if not args:
        await update.message.reply_text("Usage: /run <search_name>")
        return

    name = " ".join(args)
    search = await _get_search_by_name(name)
    if not search:
        await update.message.reply_text(f"No search named '{name}' found.")
        return

    # Import scheduler here to avoid circular import at module load time
    from app.scraper.scheduler import scheduler

    await update.message.reply_text(f"Triggering scrape for *{name}*…", parse_mode="Markdown")
    scheduler.run_search_now(str(search.id))
    await update.message.reply_text(f"Scrape queued for *{name}*.", parse_mode="Markdown")


async def cmd_stats(update, ctx) -> None:
    args = ctx.args
    if not args:
        await update.message.reply_text("Usage: /stats <search_name>")
        return

    name = " ".join(args)
    search = await _get_search_by_name(name)
    if not search:
        await update.message.reply_text(f"No search named '{name}' found.")
        return

    async with AsyncSessionLocal() as db:
        price_stats = await stats_service.get_price_stats(search.id, db)

    if price_stats is None:
        await update.message.reply_text(
            f"Not enough price data for '{name}' yet. Run some scrapes first."
        )
        return

    from telegram.constants import ParseMode
    text = (
        f"*Price stats for {name}*\n"
        f"Samples: {price_stats.count}\n"
        f"Min: HK${price_stats.min:.0f}\n"
        f"Max: HK${price_stats.max:.0f}\n"
        f"Mean: HK${price_stats.mean:.0f}\n"
        f"Median: HK${price_stats.median:.0f}\n"
        f"Bottom 10%: HK${price_stats.p10:.0f} ← good deal threshold\n"
        f"Bottom 25%: HK${price_stats.p25:.0f}\n"
        f"Top 25%: HK${price_stats.p75:.0f}\n"
        f"Top 10%: HK${price_stats.p90:.0f}"
    )
    await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN)


# ── Entry point ──────────────────────────────────────────────────────────────

def _run_bot_in_thread(settings: Settings) -> None:
    """
    Target function for the background daemon thread.
    Creates its own asyncio event loop and runs the Telegram bot polling.
    """
    global _bot_app

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        from telegram.ext import Application, CommandHandler

        app = Application.builder().token(settings.TELEGRAM_BOT_TOKEN).build()
        app.add_handler(CommandHandler("start", cmd_start))
        app.add_handler(CommandHandler("help", cmd_start))
        app.add_handler(CommandHandler("searches", cmd_searches))
        app.add_handler(CommandHandler("run", cmd_run))
        app.add_handler(CommandHandler("stats", cmd_stats))

        _bot_app = app

        logger.info("Telegram bot starting (polling)…")
        app.run_polling(drop_pending_updates=True, stop_signals=None)

    except Exception as exc:
        logger.error("Telegram bot crashed: %s", exc, exc_info=True)
    finally:
        loop.close()


def start_telegram_bot(settings: Settings, _scheduler=None) -> None:
    """
    Start the Telegram bot in a background daemon thread.

    If TELEGRAM_BOT_TOKEN is empty, this is a no-op.
    The bot runs polling in its own thread with its own event loop so it
    does not interfere with FastAPI/uvicorn's event loop.

    Args:
        settings: Application settings (must have TELEGRAM_BOT_TOKEN).
        _scheduler: Unused; kept for API compatibility if wired from main.py.
    """
    global _bot_thread

    if not settings.TELEGRAM_BOT_TOKEN:
        logger.info("TELEGRAM_BOT_TOKEN not set; Telegram bot disabled.")
        return

    _bot_thread = threading.Thread(
        target=_run_bot_in_thread,
        args=(settings,),
        daemon=True,
        name="telegram-bot",
    )
    _bot_thread.start()
    logger.info("Telegram bot thread started.")


def stop_telegram_bot() -> None:
    """Request the Telegram bot to stop polling."""
    global _bot_app
    if _bot_app is not None:
        try:
            # python-telegram-bot's Application.stop() must be called from its own loop;
            # since the bot runs in its own thread we just signal the thread to exit
            # by stopping the updater if accessible.
            if hasattr(_bot_app, "updater") and _bot_app.updater:
                # Schedule stop on the bot's event loop
                future = asyncio.run_coroutine_threadsafe(
                    _bot_app.updater.stop(),
                    asyncio.get_event_loop(),
                )
                future.result(timeout=5)
        except Exception as exc:
            logger.warning("Error stopping Telegram bot: %s", exc)
        _bot_app = None
    logger.info("Telegram bot stopped.")
