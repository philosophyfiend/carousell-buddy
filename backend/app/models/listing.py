import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, ForeignKey, Enum, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ListingStatus(str, enum.Enum):
    active = "active"
    sold = "sold"
    deleted = "deleted"


class Listing(Base):
    __tablename__ = "listings"
    __table_args__ = (UniqueConstraint("carousell_id", "search_id", name="uq_listing_search"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    carousell_id: Mapped[str] = mapped_column(String(100), nullable=False)
    search_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("saved_searches.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    condition: Mapped[str | None] = mapped_column(String(50), nullable=True)
    seller_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    seller_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    listing_url: Mapped[str] = mapped_column(String(500), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ListingStatus] = mapped_column(Enum(ListingStatus), default=ListingStatus.active)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    sold_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    search: Mapped["SavedSearch"] = relationship(back_populates="listings")
