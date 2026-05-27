"""add is_locked to report tables

Revision ID: f1a2b3c4d5e6
Revises: c7d8e9f0a1b2
Create Date: 2026-05-26

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "c7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = (
    "daily_work_record_table",
    "weekly_work_record_table",
    "pm_weekly_report_table",
    "rd_weekly_report_table",
)


def upgrade() -> None:
    for table in _TABLES:
        op.add_column(
            table,
            sa.Column("is_locked", sa.Boolean(), nullable=False, server_default="false"),
        )


def downgrade() -> None:
    for table in reversed(_TABLES):
        op.drop_column(table, "is_locked")
