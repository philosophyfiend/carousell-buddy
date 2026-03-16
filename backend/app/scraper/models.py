"""
Scraper-level dataclass for a Carousell listing.
This is distinct from the SQLAlchemy DB model (app.models.listing.Listing).
"""
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class ScrapedListing:
    """Represents a listing as returned by the scraper, before DB persistence."""
    uid: str = ""
    title: str = ""
    price: float = 0.0
    currency: str = "HKD"
    price_label: str = ""
    condition: str = ""
    time_posted: str = ""
    seller_name: str = ""
    seller_url: str = ""
    listing_url: str = ""
    image_url: str = ""
    description: str = ""
    location: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    def format_telegram(self) -> str:
        lines = [
            f"*{self.title}*",
            f"Price: {self.price_label or f'HK${self.price:.0f}'}",
        ]
        if self.condition:
            lines.append(f"Condition: {self.condition}")
        if self.seller_name:
            lines.append(f"Seller: {self.seller_name}")
        if self.time_posted:
            lines.append(f"Listed: {self.time_posted}")
        lines.append(self.listing_url)
        return "\n".join(lines)
