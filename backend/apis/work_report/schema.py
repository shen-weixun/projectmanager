# 工作報告欄位範本 API（管理者設定全站欄位）。
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.core import get_db
from apis.work_report.common import (
    REPORT_TYPE_DAILY,
    REPORT_TYPE_WEEKLY,
    WORK_REPORT_MANAGER_ROLES,
    WORK_REPORT_READ_ROLES,
    get_or_create_schema,
    is_manager,
)
from utils.auth import AuthPayload, role_required

router = APIRouter(prefix="/work-report", tags=["Work Report Schema"])

VALID_REPORT_TYPES = {REPORT_TYPE_DAILY, REPORT_TYPE_WEEKLY}


class SchemaUpdatePayload(BaseModel):
    headers: list[str] = Field(..., min_length=1)


@router.get("/schema/{report_type}")
async def get_column_schema(
    report_type: str,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*WORK_REPORT_READ_ROLES)),
):
    if report_type not in VALID_REPORT_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"status": 1, "message": "report_type 必須為 daily 或 weekly"},
        )
    schema = get_or_create_schema(db, report_type)
    return {
        "status": 0,
        "data": {
            "report_type": report_type,
            "headers": schema.headers,
            "can_edit_schema": is_manager(user),
        },
    }


@router.put("/schema/{report_type}")
async def update_column_schema(
    report_type: str,
    payload: SchemaUpdatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*WORK_REPORT_MANAGER_ROLES)),
):
    if report_type not in VALID_REPORT_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"status": 1, "message": "report_type 必須為 daily 或 weekly"},
        )

    cleaned = [h.strip() for h in payload.headers if h.strip()]
    if not cleaned:
        raise HTTPException(
            status_code=400,
            detail={"status": 1, "message": "至少需要一個欄位"},
        )

    schema = get_or_create_schema(db, report_type)
    schema.headers = cleaned
    db.add(schema)
    db.commit()
    db.refresh(schema)

    return {
        "status": 0,
        "message": "欄位範本已更新",
        "data": {"report_type": report_type, "headers": schema.headers},
    }
