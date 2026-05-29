from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class MaterialPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="材料名稱")
    quantity: int = Field(..., ge=0, description="數量")
    keeperUserId: int = Field(..., description="保管人使用者 ID")
    location: str = Field(..., min_length=1, max_length=100, description="存放位置")
    brand: str | None = Field(None, max_length=100, description="品牌")
    model: str | None = Field(None, max_length=100, description="型號")
    serialNumber: str | None = Field(None, max_length=100, description="序號")
    assetPrice: Decimal | None = Field(None, ge=0, description="資產價格")
    expiryDate: date | None = Field(None, description="保存期限")


class MaterialCreatePayload(MaterialPayload):
    quantity: int = Field(..., gt=0, description="數量")


class MaterialTransferPayload(BaseModel):
    quantity: int = Field(..., gt=0, description="移管數量")
    transferUserId: int = Field(..., description="移管人使用者 ID")


class MaterialResponse(BaseModel):
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
    lastTransferBy: Optional[str]
    updatedAt: str

    class Config:
        from_attributes = True


class MaterialTransferRecordResponse(BaseModel):
    id: int
    materialId: int
    materialName: str
    quantity: int
    transferBy: str
    location: str
    createdAt: str

    class Config:
        from_attributes = True
