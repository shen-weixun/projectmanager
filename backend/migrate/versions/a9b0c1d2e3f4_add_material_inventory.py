"""add material inventory

Revision ID: a9b0c1d2e3f4
Revises: f8a9b0c1d2e3
Create Date: 2026-05-29

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a9b0c1d2e3f4"
down_revision: Union[str, Sequence[str], None] = "f8a9b0c1d2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "material_item",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("keeper_user_id", sa.Integer(), nullable=True),
        sa.Column("keeper", sa.String(length=50), nullable=False),
        sa.Column("location", sa.String(length=100), nullable=False),
        sa.Column("brand", sa.String(length=100), nullable=True),
        sa.Column("model", sa.String(length=100), nullable=True),
        sa.Column("serial_number", sa.String(length=100), nullable=True),
        sa.Column("asset_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("last_transfer_by", sa.String(length=50), nullable=True),
        sa.CheckConstraint("quantity >= 0", name="ck_material_item_quantity_non_negative"),
        sa.ForeignKeyConstraint(["keeper_user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "material_transfer_record",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("material_id", sa.Integer(), nullable=False),
        sa.Column("material_name", sa.String(length=100), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("transfer_by", sa.String(length=50), nullable=False),
        sa.Column("location", sa.String(length=100), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_material_transfer_record_quantity_positive"),
        sa.ForeignKeyConstraint(["material_id"], ["material_item.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("material_transfer_record")
    op.drop_table("material_item")
