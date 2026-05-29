# Asset API Schema：定義資產新增更新、移管與回應資料格式。
from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


# 新增、更新時的欄位驗證
class AssetPayload(BaseModel):
    # 限制名稱不可空白，避免建立無意義資料
    name: str = Field(..., min_length=1, max_length=100, description="物品名稱")

    # ge=0 代表允許 0，避免負數庫存
    quantity: int = Field(..., ge=0, description="物品數量")

    # 保管人與 user table 關聯
    keeperUserId: int = Field(..., description="保管人使用者 ID")

    # 資產目前存放位置
    location: str = Field(..., min_length=1, max_length=100, description="存放位置")

    brand: str | None = Field(None, max_length=100, description="品牌")
    model: str | None = Field(None, max_length=100, description="型號")
    serialNumber: str | None = Field(None, max_length=100, description="序號")
    assetPrice: Decimal | None = Field(None, ge=0, description="資產價格")
    expiryDate: date | None = Field(None, description="保存期限")


# 新增資產專用 Payload
# 與一般更新不同，建立時不允許 quantity=0
class AssetCreatePayload(AssetPayload):
    quantity: int = Field(..., gt=0, description="物品數量")


# 資產移管 API 的輸入格式
class WithdrawPayload(BaseModel):
    # 每次移管數量必須 > 0
    quantity: int = Field(..., gt=0, description="移管數量")

    # 移管人與 user table 關聯
    transferUserId: int = Field(..., description="移管人使用者 ID")


class AssetNameOptionPayload(BaseModel):
    value: str = Field(..., min_length=1, max_length=100, description="資產名稱")


# 回傳給前端的資產格式
# 避免直接暴露 ORM Model
class AssetResponse(BaseModel):
    id: int
    name: str
    quantity: int
    keeperUserId: Optional[int]
    keeper: str
    location: str
    brand: Optional[str]
    model: Optional[str]
    serialNumber: Optional[str]
    assetPrice: Optional[Decimal]
    expiryDate: Optional[str]

    # 最近一次移管人，可能為空
    lastWithdrawBy: Optional[str]

    updatedAt: str

    class Config:
        # 允許 Pydantic 直接吃 SQLAlchemy ORM Object
        from_attributes = True


# 回傳給前端的移管紀錄格式
class WithdrawRecordResponse(BaseModel):
    id: int
    assetId: int
    assetName: str
    quantity: int
    withdrawer: str
    location: str
    createdAt: str

    class Config:
        from_attributes = True
