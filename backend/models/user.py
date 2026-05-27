from sqlalchemy import Boolean, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column,relationship

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
    font_scale: Mapped[float] = mapped_column(
        Float, nullable=False, default=1.0, server_default="1.0", comment="UI font scale"
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
    pm_weekly_tables = relationship("PMWeeklyReportTable", back_populates="creator", cascade="all, delete-orphan")
    rd_weekly_tables = relationship("RDWeeklyReportTable", back_populates="creator", cascade="all, delete-orphan")
    daily_work_records = relationship("DailyWorkRecordTable", back_populates="creator", cascade="all, delete-orphan")
    weekly_work_records = relationship("WeeklyWorkRecordTable", back_populates="creator", cascade="all, delete-orphan")
