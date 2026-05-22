from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class Project(Base, TimestampMixin):
    """
    專案管理主表，存放專案的基本資訊、時程、聯絡人等資料。
    """
    __tablename__ = "project"
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="專案名稱")
    customer: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="客戶名稱")
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="專案類別（CITD/SBIR…）")
    group_id: Mapped[int | None] = mapped_column(ForeignKey("group.id"), nullable=True, comment="負責組別 FK")
    group_name: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="負責組別名稱快照")
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="專案負責人 user FK（可選）")
    owner_name: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="專案負責人名稱")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="尚未開始", comment="專案狀態")
    start_date: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="通用開始日")
    pre_start_date: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="專案開始時間")
    plan_start_date: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="計劃開始時間")
    due_date: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="結束日期")
    registered_address: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="營登地址")
    mailing_address: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="通訊地址")
    contact1: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="聯絡人 1")
    contact_phone1: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="聯絡人 1 電話")
    contact2: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="聯絡人 2")
    contact_phone2: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="聯絡人 2 電話")
    contact3: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="聯絡人 3")
    contact_phone3: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="聯絡人 3 電話")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="專案描述")
    custom_fields: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="自訂欄位 JSON")
    custom_tables: Mapped[dict | None] = mapped_column(JSON, nullable=True, comment="自訂表格 JSON")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="建立者 user ID")
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="最後更新者 user ID")


class ProjectOption(Base, TimestampMixin):
    """
    專案模組選項表，存放狀態與類別等需由資料庫驅動的選項。
    """
    __tablename__ = "project_option"

    option_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="選項類型：status/category")
    value: Mapped[str] = mapped_column(String(100), nullable=False, comment="選項值")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")
    is_active: Mapped[int] = mapped_column(Integer, nullable=False, default=1, comment="是否啟用")


class ProjectItemStatusOption(Base, TimestampMixin):
    """
    專案子項目狀態選項表，獨立存放時程、待辦與查核點狀態。
    """
    __tablename__ = "project_item_status_option"

    item_type: Mapped[str] = mapped_column(String(50), nullable=False, comment="子項目類型：todo/schedule/checkpoint")
    value: Mapped[str] = mapped_column(String(100), nullable=False, comment="狀態值")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序")
    is_active: Mapped[int] = mapped_column(Integer, nullable=False, default=1, comment="是否啟用")


class ProjectScheduleItem(Base, TimestampMixin):
    """
    專案時程子表，對應前端 ScheduleItem。
    """
    __tablename__ = "project_schedule_item"
    project_id: Mapped[int] = mapped_column(ForeignKey("project.id", ondelete="CASCADE"), nullable=False, comment="所屬專案")
    name: Mapped[str] = mapped_column(String(255), nullable=False, comment="時程名稱")
    assignee: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="細項功能負責人")
    start_date: Mapped[str] = mapped_column(String(20), nullable=False, comment="開始日期")
    end_date: Mapped[str] = mapped_column(String(20), nullable=False, comment="結束日期")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="尚未開始", comment="狀態")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序順序")


class ProjectTodoItem(Base, TimestampMixin):
    """
    專案待辦子表，對應前端 TodoItem。
    """
    __tablename__ = "project_todo_item"
    project_id: Mapped[int] = mapped_column(ForeignKey("project.id", ondelete="CASCADE"), nullable=False, comment="所屬專案")
    item: Mapped[str] = mapped_column(String(500), nullable=False, comment="待辦事項內容")
    assignee: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="功能負責人")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="尚未開始", comment="狀態")
    due_date: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="須完成時間")
    note: Mapped[str | None] = mapped_column(Text, nullable=True, comment="備註")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序順序")


class ProjectCheckpointItem(Base, TimestampMixin):
    """
    專案查核點子表，對應前端 CheckpointItem。
    """
    __tablename__ = "project_checkpoint_item"

    project_id: Mapped[int] = mapped_column(ForeignKey("project.id", ondelete="CASCADE"), nullable=False, comment="所屬專案")
    checkpoint: Mapped[str] = mapped_column(String(500), nullable=False, comment="查核點名稱")
    review_date: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="查核時間")
    assignee: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="細項功能負責人")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="尚未開始", comment="狀態")
    note: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="簡短備註")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="查核描述（較長）")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="排序順序")
