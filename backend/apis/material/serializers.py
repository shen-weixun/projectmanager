from datetime import datetime, timezone

from models import MaterialItem, MaterialTransferRecord


def material_to_response(material: MaterialItem) -> dict:
    return {
        "id": material.id,
        "name": material.name,
        "quantity": material.quantity,
        "keeperUserId": material.keeper_user_id,
        "keeper": material.keeper,
        "location": material.location,
        "brand": material.brand or "",
        "model": material.model or "",
        "serialNumber": material.serial_number or "",
        "assetPrice": str(material.asset_price) if material.asset_price is not None else "",
        "expiryDate": material.expiry_date.isoformat() if material.expiry_date else "",
        "lastTransferBy": material.last_transfer_by,
        "updatedAt": material.updated_at.isoformat() if material.updated_at else datetime.now(timezone.utc).isoformat(),
    }


def material_transfer_record_to_response(record: MaterialTransferRecord) -> dict:
    return {
        "id": record.id,
        "materialId": record.material_id,
        "materialName": record.material_name,
        "quantity": record.quantity,
        "transferBy": record.transfer_by,
        "location": record.location,
        "createdAt": record.created_at.isoformat() if record.created_at else datetime.now(timezone.utc).isoformat(),
    }
