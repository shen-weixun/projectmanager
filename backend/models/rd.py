from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class RDReport(Base, TimestampMixin):
    """
    RD 週報主表模型，存放當週可編輯的 RD 工項進度資料。
    """
    __tablename__ = "rd_report"

    vendor: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="廠商名稱")
    project_name: Mapped[str] = mapped_column(String(255), nullable=False, comment="專案名稱")
    executor_user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="執行人的使用者 ID")
    executor_name: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="執行人名稱快照")
    item_status: Mapped[str] = mapped_column(String(50), nullable=False, default="planning", comment="RD 工項狀態")
    task_name: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="工項名稱")
    item_content: Mapped[str | None] = mapped_column(Text, nullable=True, comment="工項內容說明")
    planned_start: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="預計開始日期")
    planned_end: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="預計完成日期")
    actual_completed: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="實際完成日期")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, comment="補充備註")
    department_id: Mapped[int | None] = mapped_column(ForeignKey("department.id"), nullable=True, comment="此工項所屬部門的 ID")
    closed_at: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="項目被確認完成的時間")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="建立此筆資料的使用者 ID")
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="最後更新此筆資料的使用者 ID")
