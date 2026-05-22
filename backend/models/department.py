from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class Department(Base, TimestampMixin):
    """
    部門模型，代表系統中的一個部門。
    """
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="部門名稱")
    description: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="部門描述")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, comment="部門是否啟用")
