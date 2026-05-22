from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class PMWeeklyReport(Base, TimestampMixin):
    """
    PM 週報歷史模型，存放 PM 封存後的每週快照資料。
    """
    __tablename__ = "pm_weekly_report"

    project_id: Mapped[int] = mapped_column(ForeignKey("pm_project.id"), nullable=False, comment="對應的 PM 專案 ID")
    week_start_date: Mapped[str] = mapped_column(String(20), nullable=False, comment="封存週次的開始日期")
    week_end_date: Mapped[str] = mapped_column(String(20), nullable=False, comment="封存週次的結束日期")
    project_name_snapshot: Mapped[str] = mapped_column(String(255), nullable=False, comment="封存當下的專案名稱快照")
    vendor_snapshot: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="封存當下的廠商名稱快照")
    summary_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True, comment="封存當下的摘要快照")
    manager_name_snapshot: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="封存當下的主管名稱快照")
    assistants_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True, comment="封存當下的協辦人員快照")
    stage_snapshot: Mapped[str] = mapped_column(String(50), nullable=False, comment="封存當下的執行階段快照")
    priority_snapshot: Mapped[str] = mapped_column(String(50), nullable=False, comment="封存當下的優先度快照")
    planned_execution_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True, comment="封存當下的預計執行內容快照")
    last_week_progress_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True, comment="封存當下的上週進度快照")
    this_week_todo_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True, comment="封存當下的本週待辦快照")
    actual_execution_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True, comment="封存當下的實際執行內容快照")
    notes_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True, comment="封存當下的備註快照")
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="此專案主要負責人的使用者 ID")
    department_id: Mapped[int | None] = mapped_column(ForeignKey("department.id"), nullable=True, comment="此專案所屬部門的 ID")


class RDWeeklyReport(Base, TimestampMixin):
    """
    RD 週報歷史模型，存放 RD 封存後的每週工項快照資料。
    """
    __tablename__ = "rd_weekly_report"

    report_id: Mapped[int] = mapped_column(ForeignKey("rd_report.id"), nullable=False, comment="對應的 RD 工項 ID")
    week_start_date: Mapped[str] = mapped_column(String(20), nullable=False, comment="封存週次的開始日期")
    week_end_date: Mapped[str] = mapped_column(String(20), nullable=False, comment="封存週次的結束日期")
    vendor_snapshot: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="封存當下的廠商名稱快照")
    project_name_snapshot: Mapped[str] = mapped_column(String(255), nullable=False, comment="封存當下的專案名稱快照")
    executor_name_snapshot: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="封存當下的執行人名稱快照")
    item_status_snapshot: Mapped[str] = mapped_column(String(50), nullable=False, comment="封存當下的工項狀態快照")
    task_name_snapshot: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="封存當下的工項名稱快照")
    item_content_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True, comment="封存當下的工項內容快照")
    planned_start_snapshot: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="封存當下的預計開始日期快照")
    planned_end_snapshot: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="封存當下的預計完成日期快照")
    actual_completed_snapshot: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="封存當下的實際完成日期快照")
    notes_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True, comment="封存當下的備註快照")
    executor_user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="此工項執行人的使用者 ID")
    department_id: Mapped[int | None] = mapped_column(ForeignKey("department.id"), nullable=True, comment="此工項所屬部門的 ID")
