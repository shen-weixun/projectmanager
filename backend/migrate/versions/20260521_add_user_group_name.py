"""Add user group_name field

Revision ID: 20260521_add_user_group_name
Revises: 20260521_add_user_profile_fields
Create Date: 2026-05-21 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260521_add_user_group_name"
down_revision: Union[str, Sequence[str], None] = "20260521_add_user_profile_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column("user", sa.Column("group_name", sa.String(length=100), nullable=True, comment="自填組別名稱"))

def downgrade() -> None:
    op.drop_column("user", "group_name")