# Asset API Schema：定義資產新增更新、取出與回應資料格式。
from typing import Optional

from pydantic import BaseModel, Field


# 新增、更新時的欄位驗證
class AssetPayload(BaseModel):
    # 限制名稱不可空白，避免建立無意義資料
    name: str = Field(..., min_length=1, max_length=100, description="物品名稱")

    # ge=0 代表允許 0，避免負數庫存
    quantity: int = Field(..., ge=0, description="物品數量")

    # 保管人資訊，供後續盤點與責任追蹤
    keeper: str = Field(..., min_length=1, max_length=50, description="保管人")

    # 資產目前存放位置
    location: str = Field(..., min_length=1, max_length=100, description="存放位置")


# 新增資產專用 Payload
# 與一般更新不同，建立時不允許 quantity=0
class AssetCreatePayload(AssetPayload):
    quantity: int = Field(..., gt=0, description="物品數量")


# 資產取出 API 的輸入格式
class WithdrawPayload(BaseModel):
    # 每次取出數量必須 > 0
    quantity: int = Field(..., gt=0, description="取出數量")

    # 紀錄誰取走資產，方便後續追蹤
    withdrawer: str = Field(..., min_length=1, max_length=50, description="取出人")


# 回傳給前端的資產格式
# 避免直接暴露 ORM Model
class AssetResponse(BaseModel):
    id: int
    name: str
    quantity: int
    keeper: str
    location: str

    # 最近一次取出人，可能為空
    lastWithdrawBy: Optional[str]

    updatedAt: str

    class Config:
        # 允許 Pydantic 直接吃 SQLAlchemy ORM Object
        from_attributes = True


# 回傳給前端的取出紀錄格式
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