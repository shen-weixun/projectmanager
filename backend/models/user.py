from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class User(Base, TimestampMixin):
    password: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="password hash"
    )
    account: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, comment="login account"
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="display name"
    )
    email: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="email"
    )
    phone: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="phone"
    )
    address: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="address"
    )
    token_version: Mapped[int] = mapped_column(
        nullable=False, default=0, comment="JWT token version"
    )
    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("department.id"), nullable=True, comment="department ID"
    )
    group_id: Mapped[int | None] = mapped_column(
        ForeignKey("group.id"), nullable=True, comment="group ID"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, comment="active flag"
    )
    group_name: Mapped[str | None] = mapped_column(
    String(100), nullable=True, comment="自填組別名稱"
   )
