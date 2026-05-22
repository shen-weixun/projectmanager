from sqlalchemy import CheckConstraint, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class AssetItem(Base, TimestampMixin):
    """
    資產項目模型，代表一筆資產的基本資訊。
    """

    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="物品名稱")
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="物品數量")
    keeper: Mapped[str] = mapped_column(String(50), nullable=False, comment="保管人")
    location: Mapped[str] = mapped_column(String(100), nullable=False, comment="存放位置")
    last_withdraw_by: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="最近取出人")
    withdraw_records: Mapped[list["AssetWithdrawRecord"]] = relationship(back_populates="asset", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("quantity >= 0", name="ck_asset_item_quantity_non_negative"),
        {"extend_existing": True},
    )


class AssetWithdrawRecord(Base, TimestampMixin):
    """
    資產取出紀錄模型，記錄每次的資產取出動作。
    """

    asset_id: Mapped[int] = mapped_column(ForeignKey("asset_item.id"), nullable=False, comment="資產項目 ID")
    asset_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="取出時的物品名稱（快照）")
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, comment="取出數量")
    withdrawer: Mapped[str] = mapped_column(String(50), nullable=False, comment="取出人")
    location: Mapped[str] = mapped_column(String(100), nullable=False, comment="取出時的存放位置（快照）")
    asset: Mapped[AssetItem] = relationship(back_populates="withdraw_records")

    __table_args__ = (
        CheckConstraint(
            "quantity > 0", name="ck_asset_withdraw_record_quantity_positive"
        ),
        {"extend_existing": True},
    )
