from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class Role(Base, TimestampMixin):
    """
    角色模型，代表系統中的一個角色模板。
    """
    role_key: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, comment="角色識別 Key"
    )
    role_name: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="角色名稱"
    )
    scope_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="own", comment="資料範圍 own/department/all"
    )
    can_define_permissions: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, comment="是否可定義新權限"
    )
    description: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="角色說明"
    )


class UserRole(Base, TimestampMixin):
    """
    使用者角色指派模型，記錄使用者被賦予的角色與職位名稱。
    """
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.id"), nullable=False, comment="使用者 ID"
    )
    role_id: Mapped[int] = mapped_column(
        ForeignKey("role.id"), nullable=False, comment="角色 ID"
    )
    job_title: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="職位名稱"
    )
    assigned_by: Mapped[int | None] = mapped_column(
        ForeignKey("user.id"), nullable=True, comment="指派此角色的使用者 ID"
    )
