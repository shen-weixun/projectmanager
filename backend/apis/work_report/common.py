# 工作報告共用邏輯：權限、欄位範本、表格資料校驗。
from datetime import datetime
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import User
from models.work_report import (
    DEFAULT_WORK_REPORT_HEADERS,
    DailyWorkRecordTable,
    WeeklyWorkRecordTable,
    WorkReportColumnSchema,
)
from utils.auth import AuthPayload

WORK_REPORT_READ_ROLES = (
    "super",
    "boss",
    "pm_leader",
    "pm_user",
    "rd_leader",
    "rd_user",
)
WORK_REPORT_WRITE_ROLES = WORK_REPORT_READ_ROLES
WORK_REPORT_MANAGER_ROLES = ("super", "boss")

REPORT_TYPE_DAILY = "daily"
REPORT_TYPE_WEEKLY = "weekly"


def user_id(user: AuthPayload) -> int:
    return int(user.user_id)


def is_manager(user: AuthPayload) -> bool:
    return user.role_key in WORK_REPORT_MANAGER_ROLES


def panel_name(user_obj: User | None) -> str:
    if not user_obj:
        return "未知用戶"
    return user_obj.account or user_obj.name or "未知用戶"


def get_or_create_schema(db: Session, report_type: str) -> WorkReportColumnSchema:
    schema = (
        db.query(WorkReportColumnSchema)
        .filter(WorkReportColumnSchema.report_type == report_type)
        .first()
    )
    if schema:
        return schema
    schema = WorkReportColumnSchema(
        report_type=report_type,
        headers=list(DEFAULT_WORK_REPORT_HEADERS),
    )
    db.add(schema)
    db.commit()
    db.refresh(schema)
    return schema


def schema_headers(db: Session, report_type: str) -> list[str]:
    schema = get_or_create_schema(db, report_type)
    headers = schema.headers
    if not isinstance(headers, list) or not headers:
        return list(DEFAULT_WORK_REPORT_HEADERS)
    return [str(h) for h in headers]


def default_table_data(db: Session, report_type: str) -> dict[str, Any]:
    headers = schema_headers(db, report_type)
    return {
        "headers": headers,
        "rows": [{h: "" for h in headers}],
    }


def empty_row(headers: list[str]) -> dict[str, str]:
    return {h: "" for h in headers}


def normalize_rows(headers: list[str], rows: list[dict[str, Any]] | None) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for row in rows or []:
        normalized.append({h: str(row.get(h, "") if row else "") for h in headers})
    return normalized


def merge_table_data(
    incoming: dict[str, Any] | None,
    *,
    allowed_headers: list[str] | None,
    lock_headers: bool,
) -> dict[str, Any]:
    if not incoming:
        raise HTTPException(
            status_code=400,
            detail={"status": 1, "message": "缺少表格資料"},
        )

    if lock_headers:
        headers = list(allowed_headers or [])
    else:
        raw_headers = incoming.get("headers")
        if not isinstance(raw_headers, list) or not raw_headers:
            raise HTTPException(
                status_code=400,
                detail={"status": 1, "message": "欄位設定不可為空"},
            )
        headers = [str(h).strip() for h in raw_headers if str(h).strip()]
        if not headers:
            raise HTTPException(
                status_code=400,
                detail={"status": 1, "message": "欄位設定不可為空"},
            )

    rows = normalize_rows(headers, incoming.get("rows"))
    return {"headers": headers, "rows": rows}


def parse_date(date_str: str, field_label: str) -> datetime:
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail={"status": 1, "message": f"{field_label}格式錯誤，請使用 YYYY-MM-DD"},
        ) from exc


def assert_can_edit_table(table_user_id: int, current_uid: int) -> None:
    if table_user_id != current_uid:
        raise HTTPException(
            status_code=403,
            detail={"status": 1, "message": "權限不足，您只能修改自己的工作紀錄"},
        )


def list_active_users(db: Session) -> list[User]:
    return db.query(User).filter(User.is_active.is_(True)).order_by(User.id).all()
