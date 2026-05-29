"""expand asset inventory fields

Revision ID: f8a9b0c1d2e3
Revises: e7f8a9b0c1d2
Create Date: 2026-05-29

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f8a9b0c1d2e3"
down_revision: Union[str, Sequence[str], None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "asset_name_option",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("value", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("value"),
    )
    op.add_column("asset_item", sa.Column("keeper_user_id", sa.Integer(), nullable=True))
    op.add_column("asset_item", sa.Column("brand", sa.String(length=100), nullable=True))
    op.add_column("asset_item", sa.Column("model", sa.String(length=100), nullable=True))
    op.add_column("asset_item", sa.Column("serial_number", sa.String(length=100), nullable=True))
    op.add_column("asset_item", sa.Column("asset_price", sa.Numeric(12, 2), nullable=True))
    op.add_column("asset_item", sa.Column("expiry_date", sa.Date(), nullable=True))
    op.create_foreign_key(
        "fk_asset_item_keeper_user_id_user",
        "asset_item",
        "user",
        ["keeper_user_id"],
        ["id"],
    )
    op.execute(
        """
        INSERT INTO asset_name_option (created_at, updated_at, value)
        SELECT now(), now(), name
        FROM (
            SELECT DISTINCT name
            FROM asset_item
            WHERE name IS NOT NULL AND btrim(name) <> ''
        ) existing_names
        ON CONFLICT (value) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_constraint("fk_asset_item_keeper_user_id_user", "asset_item", type_="foreignkey")
    op.drop_column("asset_item", "expiry_date")
    op.drop_column("asset_item", "asset_price")
    op.drop_column("asset_item", "serial_number")
    op.drop_column("asset_item", "model")
    op.drop_column("asset_item", "brand")
    op.drop_column("asset_item", "keeper_user_id")
    op.drop_table("asset_name_option")
