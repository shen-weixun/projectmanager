"""Add user profile fields

Revision ID: 20260521_add_user_profile_fields
Revises: 20260520_custom_tables
Create Date: 2026-05-21 09:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260521_add_user_profile_fields"
down_revision: Union[str, Sequence[str], None] = "20260520_custom_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user", sa.Column("phone", sa.String(length=50), nullable=True, comment="phone"))
    op.add_column("user", sa.Column("address", sa.String(length=255), nullable=True, comment="address"))
    op.add_column("user", sa.Column("group_id", sa.Integer(), nullable=True, comment="group ID"))
    op.create_foreign_key(
        "fk_user_group_id_group",
        "user",
        "group",
        ["group_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_user_group_id_group", "user", type_="foreignkey")
    op.drop_column("user", "group_id")
    op.drop_column("user", "address")
    op.drop_column("user", "phone")
