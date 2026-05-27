"""add lead field manager only

Revision ID: 2c3d4e5f6a7b
Revises: 9b1c2d3e4f5a
Create Date: 2026-05-27

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "2c3d4e5f6a7b"
down_revision: Union[str, None] = "9b1c2d3e4f5a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "lead_field",
        sa.Column("is_manager_only", sa.Boolean(), server_default="false", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("lead_field", "is_manager_only")
