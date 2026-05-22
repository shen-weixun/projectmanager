"""Add project custom tables

Revision ID: 20260520_custom_tables
Revises: 2ae35aa9fb8b
Create Date: 2026-05-20 16:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260520_custom_tables"
down_revision: Union[str, Sequence[str], None] = "2ae35aa9fb8b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("project", sa.Column("custom_tables", sa.JSON(), nullable=True, comment="Custom tables JSON"))


def downgrade() -> None:
    op.drop_column("project", "custom_tables")
