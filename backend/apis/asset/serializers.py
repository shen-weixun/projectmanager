# Asset API Serializer：將資產與移管紀錄 ORM 轉成前端需要的 JSON。
from datetime import datetime, timezone

from models import AssetItem, AssetWithdrawRecord


def asset_to_response(asset: AssetItem) -> dict:
    return {
        "id": asset.id,
        "name": asset.name,
        "quantity": asset.quantity,
        "keeperUserId": asset.keeper_user_id,
        "keeper": asset.keeper,
        "location": asset.location,
        "brand": asset.brand or "",
        "model": asset.model or "",
        "serialNumber": asset.serial_number or "",
        "assetPrice": str(asset.asset_price) if asset.asset_price is not None else "",
        "expiryDate": asset.expiry_date.isoformat() if asset.expiry_date else "",
        "lastWithdrawBy": asset.last_withdraw_by,
        "updatedAt": asset.updated_at.isoformat() if asset.updated_at else datetime.now(timezone.utc).isoformat(),
    }


def withdraw_record_to_response(record: AssetWithdrawRecord) -> dict:
    return {
        "id": record.id,
        "assetId": record.asset_id,
        "assetName": record.asset_name,
        "quantity": record.quantity,
        "withdrawer": record.withdrawer,
        "location": record.location,
        "createdAt": record.created_at.isoformat() if record.created_at else datetime.now(timezone.utc).isoformat(),
    }
