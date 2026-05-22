from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base

class PMWeeklyReportTable(Base):
    """
    PM 週報自訂表格模型
    允許每個 PM 自由創建多個名稱不同、欄位不同的表格，
    並且整張表格的表頭(headers)與內容(rows)都會以 JSONB 格式儲存。
    """
    __tablename__ = 'pm_weekly_report_table'

    id = Column(Integer, primary_key=True, index=True)
    week_start = Column(Date, nullable=False, index=True)  # 該週報屬於哪一週 (例如: 2026-05-18)
    user_id = Column(Integer, ForeignKey('user.id', ondelete="CASCADE"), nullable=False, index=True)
    
    # 使用者為這個自訂表格取的標題 (例如: "專案進度表", "臨時交辦事項")
    table_name = Column(String, nullable=False, default="未命名表格")
    
    # 儲存結構化的動態網格資料
    # 預設格式: {"headers": ["欄位1"], "rows": []}
    table_data = Column(JSONB, nullable=False, default=lambda: {"headers": ["欄位1"], "rows": []})
    
    # 審計欄位 (選填，方便追蹤時間)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # 建立與 User 模型的關聯，方便直接在 API 中調用 report.creator.username 取得填寫人姓名
    creator = relationship("User", back_populates="pm_weekly_tables")


class RDWeeklyReportTable(Base):
    """
    RD 週報自訂表格模型
    功能與 PM 週報完全相同，但獨立成一張表，方便進行權限隔離與未來的業務擴充。
    """
    __tablename__ = 'rd_weekly_report_table'

    id = Column(Integer, primary_key=True, index=True)
    week_start = Column(Date, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('user.id', ondelete="CASCADE"), nullable=False, index=True)
    
    table_name = Column(String, nullable=False, default="未命名表格")
    
    # 預設格式: {"headers": ["欄位1"], "rows": []}
    table_data = Column(JSONB, nullable=False, default=lambda: {"headers": ["欄位1"], "rows": []})
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # 建立與 User 模型的關聯
    creator = relationship("User", back_populates="rd_weekly_tables")