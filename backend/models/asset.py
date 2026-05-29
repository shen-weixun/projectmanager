from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class AssetNameOption(Base, TimestampMixin):
    """
    管理者維護的資產名稱選項。
    """

    value: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, comment="資產名稱")


class AssetItem(Base, TimestampMixin):
    """
    資產項目模型，代表一筆資產的基本資訊。
    """

    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="資產名稱")
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="物品數量")
    keeper_user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), nullable=True, comment="保管人使用者 ID")
    keeper: Mapped[str] = mapped_column(String(50), nullable=False, comment="保管人")
    location: Mapped[str] = mapped_column(String(100), nullable=False, comment="存放位置")
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="品牌")
    model: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="型號")
    serial_number: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="序號")
    asset_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True, comment="資產價格")
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True, comment="保存期限")
    last_withdraw_by: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="最近移管人")
    keeper_user = relationship("User", foreign_keys=[keeper_user_id])
    withdraw_records: Mapped[list["AssetWithdrawRecord"]] = relationship(back_populates="asset", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("quantity >= 0", name="ck_asset_item_quantity_non_negative"),
        {"extend_existing": True},
    )


class AssetWithdrawRecord(Base, TimestampMixin):
    """
    資產移管紀錄模型，記錄每次的資產移管動作。
    """

    asset_id: Mapped[int] = mapped_column(ForeignKey("asset_item.id"), nullable=False, comment="資產項目 ID")
    asset_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="移管時的物品名稱（快照）")
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, comment="移管數量")
    withdrawer: Mapped[str] = mapped_column(String(50), nullable=False, comment="移管人")
    location: Mapped[str] = mapped_column(String(100), nullable=False, comment="移管時的存放位置（快照）")
    asset: Mapped[AssetItem] = relationship(back_populates="withdraw_records")

    __table_args__ = (
        CheckConstraint(
            "quantity > 0", name="ck_asset_withdraw_record_quantity_positive"
        ),
        {"extend_existing": True},
    )
