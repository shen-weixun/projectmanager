from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class PMProject(Base, TimestampMixin):
    """
    PM 週報主表模型，存放當週可編輯的 PM 專案進度資料。
    """
    __tablename__ = "pm_project"

    project_name: Mapped[str] = mapped_column(String(255), nullable=False, comment="專案名稱")
    vendor: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="廠商名稱")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True, comment="專案摘要說明")
    execution_time: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="專案執行時間區間")
    manager_user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="主管對應的使用者 ID")
    manager_name: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="主管名稱快照")
    assistants_text: Mapped[str | None] = mapped_column(Text, nullable=True, comment="協辦人員文字紀錄")
    stage: Mapped[str] = mapped_column(String(50), nullable=False, default="not_started", comment="專案執行階段")
    priority: Mapped[str] = mapped_column(String(50), nullable=False, default="medium", comment="專案優先度")
    planned_execution: Mapped[str | None] = mapped_column(Text, nullable=True, comment="本週預計執行內容")
    last_week_progress: Mapped[str | None] = mapped_column(Text, nullable=True, comment="上週進度說明")
    this_week_todo: Mapped[str | None] = mapped_column(Text, nullable=True, comment="本週待辦事項")
    actual_execution: Mapped[str | None] = mapped_column(Text, nullable=True, comment="本週實際執行內容")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, comment="補充備註")
    custom_fields: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="自訂欄位資料 JSON")
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="此專案主要負責人的使用者 ID")
    department_id: Mapped[int | None] = mapped_column(ForeignKey("department.id"), nullable=True, comment="此專案所屬部門的 ID")
    closed_at: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="專案結案時間")
    cancelled_at: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="專案撤案時間")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="建立此筆資料的使用者 ID")
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="最後更新此筆資料的使用者 ID")
