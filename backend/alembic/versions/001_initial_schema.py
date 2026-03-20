"""Initial schema – create all tables.

Revision ID: 001
Revises:
Create Date: 2026-03-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("username", sa.String(50), unique=True, nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # --- saved_searches ---
    op.create_table(
        "saved_searches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("keyword", sa.String(255), nullable=False),
        sa.Column("category_id", sa.String(100), nullable=True),
        sa.Column("category_name", sa.String(255), nullable=True),
        sa.Column("brand_filters", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb")),
        sa.Column("size_filters", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb")),
        sa.Column(
            "condition",
            sa.Enum("NEW", "USED", "BOTH", name="conditionenum"),
            server_default="BOTH",
        ),
        sa.Column("min_price", sa.Integer(), nullable=True),
        sa.Column("max_price", sa.Integer(), nullable=True),
        sa.Column(
            "sort_by",
            sa.Enum("newest", "price_asc", "price_desc", "relevance", name="sortbyenum"),
            server_default="newest",
        ),
        sa.Column("interval_minutes", sa.Integer(), server_default=sa.text("60")),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # --- listings ---
    op.create_table(
        "listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("carousell_id", sa.String(100), nullable=False),
        sa.Column("search_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("saved_searches.id"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("price", sa.Integer(), nullable=True),
        sa.Column("condition", sa.String(50), nullable=True),
        sa.Column("seller_name", sa.String(255), nullable=True),
        sa.Column("seller_url", sa.String(500), nullable=True),
        sa.Column("listing_url", sa.String(500), nullable=False),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("active", "sold", "deleted", name="listingstatus"),
            server_default="active",
        ),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sold_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("carousell_id", "search_id", name="uq_listing_search"),
    )

    # --- scrape_runs ---
    op.create_table(
        "scrape_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("search_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("saved_searches.id"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.Enum("running", "ok", "error", name="scraperunstatus"),
            server_default="running",
        ),
        sa.Column("listings_found", sa.Integer(), server_default=sa.text("0")),
        sa.Column("new_listings", sa.Integer(), server_default=sa.text("0")),
        sa.Column("error_message", sa.Text(), nullable=True),
    )

    # --- notification_configs ---
    op.create_table(
        "notification_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("apprise_urls", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb")),
        sa.Column("notify_new_listings", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("notify_price_drop", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("price_drop_threshold_pct", sa.Integer(), server_default=sa.text("10")),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("notification_configs")
    op.drop_table("scrape_runs")
    op.drop_table("listings")
    op.drop_table("saved_searches")
    op.drop_table("users")
    sa.Enum(name="conditionenum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="sortbyenum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="listingstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="scraperunstatus").drop(op.get_bind(), checkfirst=True)
