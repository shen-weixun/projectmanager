from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from .base import Base


class LeadField(Base):
    __tablename__ = "lead_field"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String(100), nullable=False, unique=True, index=True)
    field_type = Column(String(20), nullable=False, default="text")
    options = Column(JSONB, nullable=False, default=list)
    sort_order = Column(Integer, nullable=False, default=0)
    is_required = Column(Boolean, nullable=False, default=False, server_default="false")
    is_manager_only = Column(Boolean, nullable=False, default=False, server_default="false")
    is_repeatable = Column(Boolean, nullable=False, default=False, server_default="false")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


class LeadCase(Base):
    __tablename__ = "lead_case"

    id = Column(Integer, primary_key=True, index=True)
    data = Column(JSONB, nullable=False, default=dict)
    created_by = Column(Integer, ForeignKey("user.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
