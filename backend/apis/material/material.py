from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.core import get_db
from models import MaterialItem, MaterialTransferRecord, User
from utils.auth import AuthPayload, role_required
from utils.logger import setup_logger

from .schemas import MaterialCreatePayload, MaterialPayload, MaterialTransferPayload
from .serializers import material_to_response, material_transfer_record_to_response

logger = setup_logger(__name__)

router = APIRouter(prefix="/material-inventory", tags=["Material Inventory"])

MATERIAL_READ_ROLES = ("super", "boss", "pm_leader", "rd_leader", "pm_user", "rd_user", "viewer")
MATERIAL_MANAGER_ROLES = ("super", "boss", "pm_leader", "rd_leader")


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


@router.get("", summary="取得所有材料列表")
async def get_material_inventory(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*MATERIAL_READ_ROLES)),
):
    try:
        materials = db.query(MaterialItem).order_by(MaterialItem.updated_at.desc()).all()
        return {"status": 0, "data": [material_to_response(material) for material in materials]}
    except Exception as e:
        logger.error(f"取得材料列表失敗: {e}")
        raise HTTPException(status_code=500, detail={"status": 1, "message": "取得材料列表失敗"})


@router.post("", summary="新增材料")
async def create_material(
    payload: MaterialCreatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*MATERIAL_READ_ROLES)),
):
    try:
        keeper = get_active_keeper(db, payload.keeperUserId)
        material = MaterialItem(
            name=payload.name.strip(),
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
        db.add(material)
        db.commit()
        db.refresh(material)
        return {"status": 0, "data": material_to_response(material)}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"新增材料失敗: {e}")
        raise HTTPException(status_code=500, detail={"status": 1, "message": "新增材料失敗"})


@router.get("/transfer-records", summary="取得材料移管紀錄列表")
async def get_material_transfer_records(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*MATERIAL_READ_ROLES)),
):
    try:
        records = db.query(MaterialTransferRecord).order_by(MaterialTransferRecord.created_at.desc()).all()
        return {"status": 0, "data": [material_transfer_record_to_response(record) for record in records]}
    except Exception as e:
        logger.error(f"取得材料移管紀錄失敗: {e}")
        raise HTTPException(status_code=500, detail={"status": 1, "message": "取得材料移管紀錄失敗"})


@router.patch("/{material_id}", summary="更新材料")
async def update_material(
    material_id: int,
    payload: MaterialPayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*MATERIAL_READ_ROLES)),
):
    try:
        material = db.query(MaterialItem).filter(MaterialItem.id == material_id).first()
        if material is None:
            raise HTTPException(status_code=404, detail={"status": 1, "message": "材料不存在"})

        keeper = get_active_keeper(db, payload.keeperUserId)
        material.name = payload.name.strip()
        material.quantity = payload.quantity
        material.keeper_user_id = keeper.id
        material.keeper = keeper.name or keeper.account
        material.location = payload.location.strip()
        material.brand = clean_optional_text(payload.brand)
        material.model = clean_optional_text(payload.model)
        material.serial_number = clean_optional_text(payload.serialNumber)
        material.asset_price = payload.assetPrice
        material.expiry_date = payload.expiryDate

        db.commit()
        db.refresh(material)
        return {"status": 0, "data": material_to_response(material)}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"更新材料失敗: {e}")
        raise HTTPException(status_code=500, detail={"status": 1, "message": "更新材料失敗"})


@router.patch("/{material_id}/transfer", summary="移管材料")
async def transfer_material(
    material_id: int,
    payload: MaterialTransferPayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*MATERIAL_READ_ROLES)),
):
    try:
        material = db.query(MaterialItem).filter(MaterialItem.id == material_id).with_for_update().first()
        if material is None:
            raise HTTPException(status_code=404, detail={"status": 1, "message": "材料不存在"})

        if payload.quantity > material.quantity:
            raise HTTPException(
                status_code=400,
                detail={"status": 1, "message": f"移管數量不能超過現有數量 ({material.quantity})"},
            )

        transfer_user = get_active_keeper(db, payload.transferUserId)
        transfer_by = transfer_user.name or transfer_user.account
        db.add(
            MaterialTransferRecord(
                material_id=material.id,
                material_name=material.name,
                quantity=payload.quantity,
                transfer_by=transfer_by,
                location=material.location,
            )
        )
        material.quantity -= payload.quantity
        material.last_transfer_by = transfer_by

        db.commit()
        db.refresh(material)
        return {"status": 0, "data": material_to_response(material)}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"移管材料失敗: {e}")
        raise HTTPException(status_code=500, detail={"status": 1, "message": "移管材料失敗"})


@router.delete("/{material_id}", summary="刪除材料")
async def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*MATERIAL_MANAGER_ROLES)),
):
    try:
        material = db.query(MaterialItem).filter(MaterialItem.id == material_id).first()
        if material is None:
            raise HTTPException(status_code=404, detail={"status": 1, "message": "材料不存在"})

        db.delete(material)
        db.commit()
        return {"status": 0, "data": {"id": material_id}}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"刪除材料失敗: {e}")
        raise HTTPException(status_code=500, detail={"status": 1, "message": "刪除材料失敗"})
