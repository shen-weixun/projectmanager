from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class ChangeLog(Base, TimestampMixin):
    """
    編輯紀錄模型，記錄 PM / RD 欄位被修改時的前後差異。
    """
    module_type: Mapped[str] = mapped_column(String(20), nullable=False)
    record_id: Mapped[int] = mapped_column(Integer, nullable=False, comment="被修改資料的主鍵 ID")
    field_key: Mapped[str] = mapped_column(String(100), nullable=False, comment="被修改欄位的程式識別 Key")
    field_label: Mapped[str] = mapped_column(String(100), nullable=False, comment="被修改欄位的顯示名稱")
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True, comment="修改前的欄位值")
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True, comment="修改後的欄位值")
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="此筆資料主要負責人的使用者 ID")
    department_id: Mapped[int | None] = mapped_column(ForeignKey("department.id"), nullable=True, comment="此筆資料所屬部門的 ID")
    edited_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="實際執行編輯動作的使用者 ID")
    edited_by_name: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="實際執行編輯動作的使用者名稱")
    edited_at: Mapped[str] = mapped_column(String(50), nullable=False, comment="編輯發生時間")


class ArchiveLog(Base, TimestampMixin):
    """
    封存紀錄模型，記錄每次 PM / RD 週報封存的時間、人員與筆數。
    """
    module_type: Mapped[str] = mapped_column(String(20), nullable=False)
    week_start_date: Mapped[str] = mapped_column(String(20), nullable=False, comment="封存週次的開始日期")
    week_end_date: Mapped[str] = mapped_column(String(20), nullable=False, comment="封存週次的結束日期")
    archived_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="本次封存寫入的資料筆數")
    department_id: Mapped[int | None] = mapped_column(ForeignKey("department.id"), nullable=True, comment="本次封存對應的部門 ID")
    archived_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="執行封存動作的使用者 ID")
    archived_by_name: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="執行封存動作的使用者名稱")
    archived_at: Mapped[str] = mapped_column(String(50), nullable=False, comment="封存發生時間")
