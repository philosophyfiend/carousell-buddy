from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.scraper.scheduler import scheduler
from app.services.telegram_bot import start_telegram_bot, stop_telegram_bot
from app.routers import auth, searches, listings, notifications, stats

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await scheduler.start()
    start_telegram_bot(settings, scheduler)

    yield

    # Shutdown
    await scheduler.stop()
    stop_telegram_bot()


app = FastAPI(
    title="Carousell New",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(searches.router, prefix="/api/searches", tags=["searches"])
app.include_router(listings.router, prefix="/api/listings", tags=["listings"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(stats.router, prefix="/api", tags=["stats"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
