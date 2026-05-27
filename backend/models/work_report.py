from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, Date, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base

DEFAULT_WORK_REPORT_HEADERS = ["工作項目", "目前進度", "備註事項"]
WORK_REPORT_OPTION_ROLES = ("pm", "rd")


class WorkReportColumnSchema(Base):
    """管理者設定的日/週工作紀錄欄位範本（全站共用）。"""

    __tablename__ = "work_report_column_schema"

    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String(20), nullable=False, unique=True, index=True)
    headers = Column(JSONB, nullable=False, default=lambda: list(DEFAULT_WORK_REPORT_HEADERS))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


class WorkReportFieldOption(Base):
    """工作紀錄下拉選單選項（依報告種類/角色/欄位維護）。"""

    __tablename__ = "work_report_field_option"

    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String(20), nullable=False, index=True)
    role = Column(String(10), nullable=False, index=True)  # pm / rd
    header = Column(String(100), nullable=False, index=True)
    options = Column(JSONB, nullable=False, default=list)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("report_type", "role", "header", name="uq_work_report_field_option_key"),
    )


class DailyWorkRecordTable(Base):
    __tablename__ = "daily_work_record_table"

    id = Column(Integer, primary_key=True, index=True)
    record_date = Column(Date, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    table_name = Column(String, nullable=False, default="未命名表格")
    table_data = Column(JSONB, nullable=False)
    is_locked = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    creator = relationship("User", back_populates="daily_work_records")


class WeeklyWorkRecordTable(Base):
    __tablename__ = "weekly_work_record_table"

    id = Column(Integer, primary_key=True, index=True)
    week_start = Column(Date, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    table_name = Column(String, nullable=False, default="未命名表格")
    table_data = Column(JSONB, nullable=False)
    is_locked = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    creator = relationship("User", back_populates="weekly_work_records")
