"""add_work_report_field_options

Revision ID: c7d8e9f0a1b2
Revises: a1b2c3d4e5f6
Create Date: 2026-05-26

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "c7d8e9f0a1b2"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "work_report_field_option",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_type", sa.String(length=20), nullable=False),
        sa.Column("role", sa.String(length=10), nullable=False),
        sa.Column("header", sa.String(length=100), nullable=False),
        sa.Column("options", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("report_type", "role", "header", name="uq_work_report_field_option_key"),
    )
    op.create_index(
        op.f("ix_work_report_field_option_id"),
        "work_report_field_option",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_work_report_field_option_report_type"),
        "work_report_field_option",
        ["report_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_work_report_field_option_role"),
        "work_report_field_option",
        ["role"],
        unique=False,
    )
    op.create_index(
        op.f("ix_work_report_field_option_header"),
        "work_report_field_option",
        ["header"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_work_report_field_option_header"), table_name="work_report_field_option")
    op.drop_index(op.f("ix_work_report_field_option_role"), table_name="work_report_field_option")
    op.drop_index(op.f("ix_work_report_field_option_report_type"), table_name="work_report_field_option")
    op.drop_index(op.f("ix_work_report_field_option_id"), table_name="work_report_field_option")
    op.drop_table("work_report_field_option")

