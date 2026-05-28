"""merge lead and user font scale heads

Revision ID: b4c5d6e7f8a9
Revises: 3d4e5f6a7b8c, a7b8c9d0e1f2
Create Date: 2026-05-28

"""

from typing import Sequence, Union


revision: str = "b4c5d6e7f8a9"
down_revision: Union[str, Sequence[str], None] = (
    "3d4e5f6a7b8c",
    "a7b8c9d0e1f2",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
