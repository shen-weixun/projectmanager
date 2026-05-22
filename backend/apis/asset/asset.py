# Asset API：處理資產清單、取出紀錄、資產新增更新取出與刪除。
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.core import get_db
from models import AssetItem, AssetWithdrawRecord
from utils.auth import AuthPayload, role_required
from utils.logger import setup_logger

from .schemas import AssetCreatePayload, AssetPayload, WithdrawPayload
from .serializers import asset_to_response, withdraw_record_to_response

logger = setup_logger(__name__)

router = APIRouter(prefix="/asset-inventory", tags=["Asset Inventory"])

# TODO: 後續可依需求調整權限
ASSET_READ_ROLES = ( "super", "boss", "pm_leader", "rd_leader", "pm_user", "rd_user", "viewer")
ASSET_MANAGE_ROLES = ("super", "boss", "pm_leader", "rd_leader")

# 資產清單
@router.get("", summary="取得所有資產列表")
async def get_asset_inventory(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*ASSET_READ_ROLES)),
):
    try:
        assets = db.query(AssetItem).order_by(AssetItem.updated_at.desc()).all()
        return {"status": 0, "data": [asset_to_response(asset) for asset in assets]}
    except Exception as e:
        logger.error(f"取得資產列表失敗: {e}")
        raise HTTPException(status_code=500, detail={"status": 1, "message": "取得資產列表失敗"})


# 資產取出紀錄
@router.get("/withdraw-records", summary="取得取出紀錄列表")
async def get_withdraw_records(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*ASSET_READ_ROLES)),
):
    try:
        records = db.query(AssetWithdrawRecord).order_by(AssetWithdrawRecord.created_at.desc()).all()
        return {"status": 0, "data": [withdraw_record_to_response(record) for record in records]}
    except Exception as e:
        logger.error(f"取得取出紀錄失敗: {e}")
        raise HTTPException(status_code=500, detail={"status": 1, "message": "取得取出紀錄失敗"})


# 新增資產資料
@router.post("", summary="新增資產")
async def create_asset(
    payload: AssetCreatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*ASSET_MANAGE_ROLES)),
):
    try:
        new_asset = AssetItem(
            name=payload.name.strip(),
            quantity=payload.quantity,
            keeper=payload.keeper.strip(),
            location=payload.location.strip(),
        )
        db.add(new_asset)
        db.commit()
        db.refresh(new_asset)

        logger.info(f"新增資產成功: id={new_asset.id}, name={new_asset.name}")
        return {"status": 0, "data": asset_to_response(new_asset)}
    except Exception as e:
        db.rollback()
        logger.error(f"新增資產失敗: {e}")
        raise HTTPException(status_code=500, detail={"status": 1, "message": "新增資產失敗"})


# 更新資產資料
@router.patch("/{asset_id:int}", summary="更新資產")
async def update_asset(
    asset_id: int,
    payload: AssetPayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*ASSET_MANAGE_ROLES)),
):
    try:
        asset = db.query(AssetItem).filter(AssetItem.id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail={"status": 1, "message": "資產不存在"})

        asset.name = payload.name.strip()
        asset.quantity = payload.quantity
        asset.keeper = payload.keeper.strip()
        asset.location = payload.location.strip()

        db.commit()
        db.refresh(asset)

        logger.info(f"更新資產成功: id={asset.id}, name={asset.name}")
        return {"status": 0, "data": asset_to_response(asset)}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"更新資產失敗: {e}")
        raise HTTPException(status_code=500, detail={"status": 1, "message": "更新資產失敗"})


# 資產取出
@router.patch("/{asset_id:int}/withdraw", summary="取出資產")
async def withdraw_asset(
    asset_id: int,
    payload: WithdrawPayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*ASSET_MANAGE_ROLES)),
):
    try:
        asset = db.query(AssetItem).filter(AssetItem.id == asset_id).with_for_update().first() # 加鎖避免多個使用者同時修改
        if not asset:
            raise HTTPException(status_code=404, detail={"status": 1, "message": "資產不存在"})

        if payload.quantity > asset.quantity:
            raise HTTPException(
                status_code=400,
                detail={"status": 1, "message": f"取出數量不能超過現有數量 ({asset.quantity})"},
            )

        withdrawer = payload.withdrawer.strip()
        db.add(
            AssetWithdrawRecord(
                asset_id=asset.id,
                asset_name=asset.name,
                quantity=payload.quantity,
                withdrawer=withdrawer,
                location=asset.location,
            )
        )

        asset.quantity -= payload.quantity
        asset.last_withdraw_by = withdrawer

        db.commit()
        db.refresh(asset)

        logger.info(
            f"取出資產成功: id={asset.id}, name={asset.name}, "
            f"取出數量={payload.quantity}, 取出人={payload.withdrawer}, "
            f"剩餘數量={asset.quantity}"
        )
        return {"status": 0, "data": asset_to_response(asset)}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"取出資產失敗: {e}")
        raise HTTPException(status_code=500, detail={"status": 1, "message": "取出資產失敗"})


# 刪除指定資產項目，連同關聯的取出紀錄依模型關聯處理。
@router.delete("/{asset_id:int}", summary="刪除資產")
async def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*ASSET_MANAGE_ROLES)),
):
    try:
        asset = db.query(AssetItem).filter(AssetItem.id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail={"status": 1, "message": "資產不存在"})

        asset_name = asset.name
        db.delete(asset)
        db.commit()

        logger.info(f"刪除資產成功: id={asset_id}, name={asset_name}")
        return {"status": 0, "message": "刪除成功"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"刪除資產失敗: {e}")
        raise HTTPException(status_code=500, detail={"status": 1, "message": "刪除資產失敗"})