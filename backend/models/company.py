from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class Company(Base, TimestampMixin):
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, comment="公司中文名稱")
    name_en: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, comment="公司英文名稱")
    logo: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="公司 Logo 路徑")
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="公司電話")
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="公司Email")
    address: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="公司地址")