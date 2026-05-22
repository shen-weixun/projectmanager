from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class Group(Base, TimestampMixin):
    """
    群組模型，代表系統中的一個群組。
    """
    department_id: Mapped[int] = mapped_column(ForeignKey("department.id"), nullable=False, comment="所屬部門 ID")
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="群組名稱")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, comment="群組是否啟用（1 啟用 / 0 停用）")
