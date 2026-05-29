"""set default user font scale to 1.1

Revision ID: d6e7f8a9b0c1
Revises: c5d6e7f8a9b0
Create Date: 2026-05-29

"""

from typing import Sequence, Union

from alembic import op

revision: str = "d6e7f8a9b0c1"
down_revision: Union[str, Sequence[str], None] = "c5d6e7f8a9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('ALTER TABLE "user" ALTER COLUMN font_scale SET DEFAULT 1.1')
    op.execute('UPDATE "user" SET font_scale = 1.1')


def downgrade() -> None:
    op.execute('ALTER TABLE "user" ALTER COLUMN font_scale SET DEFAULT 1.0')
    op.execute('UPDATE "user" SET font_scale = 1.0 WHERE font_scale = 1.1')
