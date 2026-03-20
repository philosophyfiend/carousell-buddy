"""Add excluded_listings table for hiding unwanted listings.

Revision ID: 002
Revises: 001
Create Date: 2026-03-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "excluded_listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("listings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("excluded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "listing_id", name="uq_user_excluded_listing"),
    )
    op.create_index("ix_excluded_listings_user_id", "excluded_listings", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_excluded_listings_user_id")
    op.drop_table("excluded_listings")
