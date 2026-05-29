# Asset API：處理資產清單、移管紀錄、資產新增更新移管與刪除。
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.core import get_db
from models import AssetItem, AssetNameOption, AssetWithdrawRecord, User
from utils.auth import AuthPayload, role_required
from utils.logger import setup_logger

from .schemas import AssetCreatePayload, AssetNameOptionPayload, AssetPayload, WithdrawPayload
from .serializers import asset_to_response, withdraw_record_to_response

logger = setup_logger(__name__)

router = APIRouter(prefix="/asset-inventory", tags=["Asset Inventory"])

# TODO: 後續可依需求調整權限
ASSET_READ_ROLES = ( "super", "boss", "pm_leader", "rd_leader", "pm_user", "rd_user", "viewer")
ASSET_MANAGER_ROLES = ("super", "boss", "pm_leader", "rd_leader")


def clean_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def get_active_keeper(db: Session, keeper_user_id: int) -> User:
    keeper = db.query(User).filter(User.id == keeper_user_id, User.is_active.is_(True)).first()
    if keeper is None:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "保管人不存在或已停用"})
    return keeper


def ensure_asset_name_option(db: Session, name: str) -> None:
    option = db.query(AssetNameOption).filter(AssetNameOption.value == name).first()
    if option is None:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "資產名稱尚未由管理者定義"})

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


@router.get("/name-options", summary="取得資產名稱選項")
async def get_asset_name_options(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*ASSET_READ_ROLES)),
):
    options = db.query(AssetNameOption).order_by(AssetNameOption.value.asc()).all()
    return {"status": 0, "data": [{"id": option.id, "value": option.value} for option in options]}


@router.post("/name-options", summary="新增資產名稱選項")
async def create_asset_name_option(
    payload: AssetNameOptionPayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*ASSET_MANAGER_ROLES)),
):
    value = payload.value.strip()
    existing = db.query(AssetNameOption).filter(AssetNameOption.value == value).first()
    if existing:
        return {"status": 0, "data": {"id": existing.id, "value": existing.value}}

    option = AssetNameOption(value=value)
    db.add(option)
    db.commit()
    db.refresh(option)
    return {"status": 0, "data": {"id": option.id, "value": option.value}}


@router.delete("/name-options/{option_id}", summary="刪除資產名稱選項")
async def delete_asset_name_option(
    option_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*ASSET_MANAGER_ROLES)),
):
    option = db.query(AssetNameOption).filter(AssetNameOption.id == option_id).first()
    if option is None:
        raise HTTPException(status_code=404, detail={"status": 1, "message": "資產名稱不存在"})

    used_asset = db.query(AssetItem.id).filter(AssetItem.name == option.value).first()
    if used_asset is not None:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "此資產名稱已有資產使用，無法刪除"})

    db.delete(option)
    db.commit()
    return {"status": 0, "data": {"id": option_id}}


# 資產移管紀錄
@router.get("/withdraw-records", summary="取得移管紀錄列表")
async def get_withdraw_records(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*ASSET_READ_ROLES)),
):
    try:
        records = db.query(AssetWithdrawRecord).order_by(AssetWithdrawRecord.created_at.desc()).all()
        return {"status": 0, "data": [withdraw_record_to_response(record) for record in records]}
    except Exception as e:
        logger.error(f"取得移管紀錄失敗: {e}")
        raise HTTPException(status_code=500, detail={"status": 1, "message": "取得移管紀錄失敗"})


# 新增資產資料
@router.post("", summary="新增資產")
async def create_asset(
    payload: AssetCreatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*ASSET_READ_ROLES)),
):
    try:
        name = payload.name.strip()
        ensure_asset_name_option(db, name)
        keeper = get_active_keeper(db, payload.keeperUserId)
        new_asset = AssetItem(
            name=name,
            quantity=payload.quantity,
            keeper_user_id=keeper.id,
            keeper=keeper.name or keeper.account,
            location=payload.location.strip(),
            brand=clean_optional_text(payload.brand),
            model=clean_optional_text(payload.model),
            serial_number=clean_optional_text(payload.serialNumber),
            asset_price=payload.assetPrice,
            expiry_date=payload.expiryDate,
        )
        db.add(new_asset)
        db.commit()
        db.refresh(new_asset)

        logger.info(f"新增資產成功: id={new_asset.id}, name={new_asset.name}")
        return {"status": 0, "data": asset_to_response(new_asset)}
    except HTTPException:
        raise
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
    user: AuthPayload = Depends(role_required(*ASSET_READ_ROLES)),
):
    try:
        asset = db.query(AssetItem).filter(AssetItem.id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail={"status": 1, "message": "資產不存在"})

        name = payload.name.strip()
        ensure_asset_name_option(db, name)
        keeper = get_active_keeper(db, payload.keeperUserId)

        asset.name = name
        asset.quantity = payload.quantity
        asset.keeper_user_id = keeper.id
        asset.keeper = keeper.name or keeper.account
        asset.location = payload.location.strip()
        asset.brand = clean_optional_text(payload.brand)
        asset.model = clean_optional_text(payload.model)
        asset.serial_number = clean_optional_text(payload.serialNumber)
        asset.asset_price = payload.assetPrice
        asset.expiry_date = payload.expiryDate

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


# 資產移管
@router.patch("/{asset_id:int}/withdraw", summary="移管資產")
async def withdraw_asset(
    asset_id: int,
    payload: WithdrawPayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*ASSET_READ_ROLES)),
):
    try:
        asset = db.query(AssetItem).filter(AssetItem.id == asset_id).with_for_update().first() # 加鎖避免多個使用者同時修改
        if not asset:
            raise HTTPException(status_code=404, detail={"status": 1, "message": "資產不存在"})

        if payload.quantity > asset.quantity:
            raise HTTPException(
                status_code=400,
                detail={"status": 1, "message": f"移管數量不能超過現有數量 ({asset.quantity})"},
            )

        transfer_user = get_active_keeper(db, payload.transferUserId)
        withdrawer = transfer_user.name or transfer_user.account
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
            f"移管資產成功: id={asset.id}, name={asset.name}, "
            f"移管數量={payload.quantity}, 移管人={withdrawer}, "
            f"剩餘數量={asset.quantity}"
        )
        return {"status": 0, "data": asset_to_response(asset)}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"移管資產失敗: {e}")
        raise HTTPException(status_code=500, detail={"status": 1, "message": "移管資產失敗"})


# 刪除指定資產項目，連同關聯的移管紀錄依模型關聯處理。
@router.delete("/{asset_id:int}", summary="刪除資產")
async def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*ASSET_MANAGER_ROLES)),
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
