# 日工作紀錄 API。
import base64
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.core import get_db
from models import User
from models.work_report import DailyWorkRecordTable
from apis.work_report.common import (
    REPORT_TYPE_DAILY,
    WORK_REPORT_READ_ROLES,
    WORK_REPORT_WRITE_ROLES,
    assert_can_edit_table,
    default_table_data,
    is_manager,
    list_active_users,
    merge_table_data,
    panel_name,
    parse_date,
    schema_headers,
    user_id,
)
from apis.work_report.xlsx import (
    WORK_REPORT_META_HEADERS,
    XLSX_MEDIA_TYPE,
    build_work_report_xlsx_rows,
    build_xlsx_bytes,
    parse_work_report_xlsx_tables,
)
from utils.auth import AuthPayload, role_required

router = APIRouter(prefix="/work-report/daily", tags=["Daily Work Record"])


class TableCreatePayload(BaseModel):
    record_date: str = Field(..., description="格式: YYYY-MM-DD")
    table_name: str = Field("未命名表格", max_length=100)


class TableUpdatePayload(BaseModel):
    table_name: str | None = Field(None, max_length=100)
    table_data: Dict[str, Any] | None = None


class XlsxImportPayload(BaseModel):
    filename: str | None = None
    contentBase64: str = Field(..., min_length=1)


@router.get("/tables/grouped")
async def get_grouped_daily_tables(
    record_date: str,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*WORK_REPORT_READ_ROLES)),
):
    current_uid = user_id(user)
    target_date = parse_date(record_date, "日期").date()

    tables = (
        db.query(DailyWorkRecordTable)
        .filter(DailyWorkRecordTable.record_date == target_date)
        .all()
    )

    grouped_data: Dict[int, Dict[str, Any]] = {}

    for table in tables:
        if not is_manager(user) and table.user_id != current_uid:
            continue
        uid = table.user_id
        if uid not in grouped_data:
            grouped_data[uid] = {
                "user_id": uid,
                "user_name": panel_name(table.creator),
                "is_current_user": uid == current_uid,
                "tables": [],
            }
        grouped_data[uid]["tables"].append(
            {
                "id": table.id,
                "table_name": table.table_name,
                "table_data": table.table_data,
                "read_only": False,
            }
        )

    if is_manager(user):
        for active_user in list_active_users(db):
            if active_user.id not in grouped_data:
                grouped_data[active_user.id] = {
                    "user_id": active_user.id,
                    "user_name": panel_name(active_user),
                    "is_current_user": active_user.id == current_uid,
                    "tables": [],
                }
    elif current_uid not in grouped_data:
        active_user = db.query(User).filter(User.id == current_uid).first()
        grouped_data[current_uid] = {
            "user_id": current_uid,
            "user_name": panel_name(active_user),
            "is_current_user": True,
            "tables": [],
        }

    return {
        "status": 0,
        "data": list(grouped_data.values()),
        "schema_headers": schema_headers(db, REPORT_TYPE_DAILY),
        "is_manager": is_manager(user),
    }


@router.get("/tables/export-xlsx")
async def export_daily_tables_xlsx(
    record_date: str,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*WORK_REPORT_READ_ROLES)),
):
    current_uid = user_id(user)
    target_date = parse_date(record_date, "?交?").date()
    headers = schema_headers(db, REPORT_TYPE_DAILY)

    tables = (
        db.query(DailyWorkRecordTable)
        .filter(DailyWorkRecordTable.record_date == target_date)
        .all()
    )

    grouped_data: Dict[int, Dict[str, Any]] = {}
    for table in tables:
        if not is_manager(user) and table.user_id != current_uid:
            continue
        uid = table.user_id
        if uid not in grouped_data:
            grouped_data[uid] = {"user_name": panel_name(table.creator), "tables": []}
        grouped_data[uid]["tables"].append(
            {"table_name": table.table_name, "table_data": table.table_data}
        )

    rows = build_work_report_xlsx_rows(list(grouped_data.values()), headers)
    filename = f"daily-work-record-{target_date.isoformat()}-{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return Response(
        content=build_xlsx_bytes("Daily Work Record", [*WORK_REPORT_META_HEADERS, *headers], rows),
        media_type=XLSX_MEDIA_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/tables/import-xlsx")
async def import_daily_tables_xlsx(
    record_date: str,
    payload: XlsxImportPayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*WORK_REPORT_WRITE_ROLES)),
):
    try:
        content = base64.b64decode(payload.contentBase64, validate=True)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "XLSX 內容不正確"}) from exc

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "XLSX 檔案不可超過 10MB"})

    target_date = parse_date(record_date, "?交?").date()
    headers = schema_headers(db, REPORT_TYPE_DAILY)
    imported_tables = parse_work_report_xlsx_tables(content, headers)

    created_tables: list[DailyWorkRecordTable] = []
    for imported in imported_tables:
        table = DailyWorkRecordTable(
            record_date=target_date,
            user_id=user_id(user),
            table_name=imported["table_name"],
            table_data=imported["table_data"],
        )
        db.add(table)
        created_tables.append(table)

    db.commit()
    for table in created_tables:
        db.refresh(table)

    return {
        "status": 0,
        "data": {
            "createdCount": len(created_tables),
            "items": [
                {
                    "id": table.id,
                    "table_name": table.table_name,
                    "table_data": table.table_data,
                }
                for table in created_tables
            ],
        },
    }


@router.post("/tables")
async def create_daily_table(
    payload: TableCreatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*WORK_REPORT_WRITE_ROLES)),
):
    target_date = parse_date(payload.record_date, "日期").date()
    new_table = DailyWorkRecordTable(
        record_date=target_date,
        user_id=user_id(user),
        table_name=payload.table_name.strip(),
        table_data=default_table_data(db, REPORT_TYPE_DAILY),
    )
    db.add(new_table)
    db.commit()
    db.refresh(new_table)

    return {
        "status": 0,
        "data": {
            "id": new_table.id,
            "table_name": new_table.table_name,
            "table_data": new_table.table_data,
        },
    }


@router.patch("/tables/{table_id:int}")
async def update_daily_table(
    table_id: int,
    payload: TableUpdatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*WORK_REPORT_WRITE_ROLES)),
):
    table = (
        db.query(DailyWorkRecordTable)
        .filter(DailyWorkRecordTable.id == table_id)
        .first()
    )
    if not table:
        raise HTTPException(
            status_code=404,
            detail={"status": 1, "message": "找不到該表格項目"},
        )

    current_uid = user_id(user)
    assert_can_edit_table(table.user_id, current_uid)

    data = payload.model_dump(exclude_unset=True)
    if "table_name" in data and data["table_name"] is not None:
        table.table_name = data["table_name"].strip()

    if "table_data" in data and data["table_data"] is not None:
        table.table_data = merge_table_data(
            data["table_data"],
            allowed_headers=schema_headers(db, REPORT_TYPE_DAILY),
            lock_headers=True,
        )

    db.add(table)
    db.commit()
    db.refresh(table)

    return {
        "status": 0,
        "message": "儲存成功",
        "data": {
            "id": table.id,
            "table_name": table.table_name,
            "table_data": table.table_data,
        },
    }


@router.delete("/tables/{table_id:int}")
async def delete_daily_table(
    table_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*WORK_REPORT_WRITE_ROLES)),
):
    table = (
        db.query(DailyWorkRecordTable)
        .filter(DailyWorkRecordTable.id == table_id)
        .first()
    )
    if not table:
        raise HTTPException(
            status_code=404,
            detail={"status": 1, "message": "找不到該表格項目"},
        )

    assert_can_edit_table(table.user_id, user_id(user))
    db.delete(table)
    db.commit()

    return {"status": 0, "message": "表格已成功刪除", "data": {"id": table_id}}
