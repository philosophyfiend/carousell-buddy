import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, ForeignKey, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class ConditionEnum(str, enum.Enum):
    NEW = "NEW"
    USED = "USED"
    BOTH = "BOTH"


class SortByEnum(str, enum.Enum):
    newest = "newest"
    price_asc = "price_asc"
    price_desc = "price_desc"
    relevance = "relevance"


class ScrapeRunStatus(str, enum.Enum):
    running = "running"
    ok = "ok"
    error = "error"


class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    keyword: Mapped[str] = mapped_column(String(255), nullable=False)
    category_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    category_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    brand_filters: Mapped[list] = mapped_column(JSONB, default=list)
    size_filters: Mapped[list] = mapped_column(JSONB, default=list)
    condition: Mapped[ConditionEnum] = mapped_column(Enum(ConditionEnum), default=ConditionEnum.BOTH)
    min_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sort_by: Mapped[SortByEnum] = mapped_column(Enum(SortByEnum), default=SortByEnum.newest)
    interval_minutes: Mapped[int] = mapped_column(Integer, default=60)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship(back_populates="searches")
    listings: Mapped[list["Listing"]] = relationship(back_populates="search", cascade="all, delete-orphan")
    scrape_runs: Mapped[list["ScrapeRun"]] = relationship(back_populates="search", cascade="all, delete-orphan")


class ScrapeRun(Base):
    __tablename__ = "scrape_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    search_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("saved_searches.id"), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[ScrapeRunStatus] = mapped_column(Enum(ScrapeRunStatus), default=ScrapeRunStatus.running)
    listings_found: Mapped[int] = mapped_column(Integer, default=0)
    new_listings: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    search: Mapped["SavedSearch"] = relationship(back_populates="scrape_runs")
