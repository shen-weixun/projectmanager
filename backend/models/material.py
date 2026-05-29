from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class MaterialItem(Base, TimestampMixin):
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="材料名稱")
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="材料數量")
    keeper_user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="保管人使用者 ID")
    keeper: Mapped[str] = mapped_column(String(50), nullable=False, comment="保管人")
    location: Mapped[str] = mapped_column(String(100), nullable=False, comment="存放位置")
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="品牌")
    model: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="型號")
    serial_number: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="序號")
    asset_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True, comment="資產價格")
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True, comment="保存期限")
    last_transfer_by: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="最近移管人")
    keeper_user = relationship("User", foreign_keys=[keeper_user_id])
    transfer_records: Mapped[list["MaterialTransferRecord"]] = relationship(back_populates="material", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("quantity >= 0", name="ck_material_item_quantity_non_negative"),
        {"extend_existing": True},
    )


class MaterialTransferRecord(Base, TimestampMixin):
    material_id: Mapped[int] = mapped_column(ForeignKey("material_item.id"), nullable=False, comment="材料項目 ID")
    material_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="移管時的材料名稱快照")
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, comment="移管數量")
    transfer_by: Mapped[str] = mapped_column(String(50), nullable=False, comment="移管人")
    location: Mapped[str] = mapped_column(String(100), nullable=False, comment="移管時的存放位置快照")
    material: Mapped[MaterialItem] = relationship(back_populates="transfer_records")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_material_transfer_record_quantity_positive"),
        {"extend_existing": True},
    )
