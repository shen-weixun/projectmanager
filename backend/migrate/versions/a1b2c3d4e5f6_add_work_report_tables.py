"""add_work_report_tables

Revision ID: a1b2c3d4e5f6
Revises: d4901972d08d
Create Date: 2026-05-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "d4901972d08d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "work_report_column_schema",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_type", sa.String(length=20), nullable=False),
        sa.Column("headers", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("report_type"),
    )
    op.create_index(
        op.f("ix_work_report_column_schema_id"),
        "work_report_column_schema",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_work_report_column_schema_report_type"),
        "work_report_column_schema",
        ["report_type"],
        unique=True,
    )

    op.create_table(
        "daily_work_record_table",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("record_date", sa.Date(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("table_name", sa.String(), nullable=False),
        sa.Column("table_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_daily_work_record_table_id"), "daily_work_record_table", ["id"], unique=False)
    op.create_index(
        op.f("ix_daily_work_record_table_record_date"),
        "daily_work_record_table",
        ["record_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_daily_work_record_table_user_id"),
        "daily_work_record_table",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "weekly_work_record_table",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("table_name", sa.String(), nullable=False),
        sa.Column("table_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_weekly_work_record_table_id"), "weekly_work_record_table", ["id"], unique=False)
    op.create_index(
        op.f("ix_weekly_work_record_table_week_start"),
        "weekly_work_record_table",
        ["week_start"],
        unique=False,
    )
    op.create_index(
        op.f("ix_weekly_work_record_table_user_id"),
        "weekly_work_record_table",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_weekly_work_record_table_user_id"), table_name="weekly_work_record_table")
    op.drop_index(op.f("ix_weekly_work_record_table_week_start"), table_name="weekly_work_record_table")
    op.drop_index(op.f("ix_weekly_work_record_table_id"), table_name="weekly_work_record_table")
    op.drop_table("weekly_work_record_table")

    op.drop_index(op.f("ix_daily_work_record_table_user_id"), table_name="daily_work_record_table")
    op.drop_index(op.f("ix_daily_work_record_table_record_date"), table_name="daily_work_record_table")
    op.drop_index(op.f("ix_daily_work_record_table_id"), table_name="daily_work_record_table")
    op.drop_table("daily_work_record_table")

    op.drop_index(op.f("ix_work_report_column_schema_report_type"), table_name="work_report_column_schema")
    op.drop_index(op.f("ix_work_report_column_schema_id"), table_name="work_report_column_schema")
    op.drop_table("work_report_column_schema")
