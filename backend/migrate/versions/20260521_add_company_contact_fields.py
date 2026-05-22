"""Add company contact fields

Revision ID: 20260521_add_company_contact
Revises: 20260521_add_user_group_name
Create Date: 2026-05-21 14:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260521_add_company_contact"
down_revision: Union[str, Sequence[str], None] = "20260521_add_user_group_name"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column("company", sa.Column("phone", sa.String(length=50), nullable=True, comment="公司電話"))
    op.add_column("company", sa.Column("email", sa.String(length=255), nullable=True, comment="公司Email"))
    op.add_column("company", sa.Column("address", sa.String(length=255), nullable=True, comment="公司地址"))

def downgrade() -> None:
    op.drop_column("company", "address")
    op.drop_column("company", "email")
    op.drop_column("company", "phone")