# 工作報告下拉選單選項 API（管理者設定 PM/RD 可選值，支援彩色標籤）。
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.core import get_db
from apis.work_report.common import (
    REPORT_TYPE_DAILY,
    REPORT_TYPE_WEEKLY,
    WORK_REPORT_MANAGER_ROLES,
    WORK_REPORT_READ_ROLES,
    is_manager,
    schema_headers,
)
from models.work_report import WORK_REPORT_OPTION_ROLES, WorkReportFieldOption
from utils.auth import AuthPayload, role_required

router = APIRouter(prefix="/work-report", tags=["Work Report Options"])

VALID_REPORT_TYPES = {REPORT_TYPE_DAILY, REPORT_TYPE_WEEKLY}
VALID_OPTION_COLORS = {
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "slate",
    "purple",
    "dark",
    "rose",
    "brown",
}


def normalize_role(role_key: str | None) -> str:
    """將系統角色轉成 work-report 的選項角色(pm/rd)。管理者一律視為 rd。"""
    if not role_key:
        return "rd"
    if role_key in WORK_REPORT_MANAGER_ROLES:
        return "rd"
    if role_key.startswith("pm"):
        return "pm"
    return "rd"


def normalize_option_color(color: Any) -> str:
    key = str(color or "slate").strip().lower()
    return key if key in VALID_OPTION_COLORS else "slate"


def normalize_option_item(raw: Any) -> dict[str, str] | None:
    if isinstance(raw, str):
        value = raw.strip()
        if not value:
            return None
        return {"value": value, "color": "slate"}
    if isinstance(raw, dict):
        value = str(raw.get("value", "")).strip()
        if not value:
            return None
        return {"value": value, "color": normalize_option_color(raw.get("color"))}
    return None


def normalize_options_list(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    seen: set[str] = set()
    result: list[dict[str, str]] = []
    for entry in raw:
        item = normalize_option_item(entry)
        if not item or item["value"] in seen:
            continue
        seen.add(item["value"])
        result.append(item)
    return result


def load_options_map(db: Session, report_type: str, role: str) -> dict[str, list[dict[str, str]]]:
    rows = (
        db.query(WorkReportFieldOption)
        .filter(WorkReportFieldOption.report_type == report_type)
        .filter(WorkReportFieldOption.role == role)
        .all()
    )
    result: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        result[str(row.header)] = normalize_options_list(row.options)
    return result


def upsert_options_map(
    db: Session,
    report_type: str,
    role: str,
    options_by_header: dict[str, list[Any]],
) -> dict[str, list[dict[str, str]]]:
    allowed_headers = set(schema_headers(db, report_type))
    for header, options in options_by_header.items():
        h = str(header).strip()
        if not h or h not in allowed_headers:
            continue
        cleaned = normalize_options_list(options)
        record = (
            db.query(WorkReportFieldOption)
            .filter(WorkReportFieldOption.report_type == report_type)
            .filter(WorkReportFieldOption.role == role)
            .filter(WorkReportFieldOption.header == h)
            .first()
        )
        if record:
            record.options = cleaned
        else:
            record = WorkReportFieldOption(
                report_type=report_type, role=role, header=h, options=cleaned
            )
        db.add(record)
    db.commit()
    return load_options_map(db, report_type, role)


class OptionsUpdatePayload(BaseModel):
    options_by_header: dict[str, list[Any]] = Field(default_factory=dict)


@router.get("/options/{report_type}")
async def get_work_report_options(
    report_type: str,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*WORK_REPORT_READ_ROLES)),
):
    if report_type not in VALID_REPORT_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"status": 1, "message": "report_type 必須為 daily 或 weekly"},
        )
    role = normalize_role(user.role_key)
    return {
        "status": 0,
        "data": {
            "report_type": report_type,
            "role": role,
            "options_by_header": load_options_map(db, report_type, role),
        },
    }


@router.get("/options/manage/{report_type}")
async def get_work_report_options_manage(
    report_type: str,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*WORK_REPORT_MANAGER_ROLES)),
):
    if report_type not in VALID_REPORT_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"status": 1, "message": "report_type 必須為 daily 或 weekly"},
        )
    return {
        "status": 0,
        "data": {
            "report_type": report_type,
            "pm": load_options_map(db, report_type, "pm"),
            "rd": load_options_map(db, report_type, "rd"),
            "headers": schema_headers(db, report_type),
            "can_edit": is_manager(user),
        },
    }


@router.put("/options/{report_type}/{role}")
async def update_work_report_options(
    report_type: str,
    role: str,
    payload: OptionsUpdatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*WORK_REPORT_MANAGER_ROLES)),
):
    if report_type not in VALID_REPORT_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"status": 1, "message": "report_type 必須為 daily 或 weekly"},
        )
    role_value = str(role).strip().lower()
    if role_value not in WORK_REPORT_OPTION_ROLES:
        raise HTTPException(
            status_code=400,
            detail={"status": 1, "message": "role 必須為 pm 或 rd"},
        )

    incoming: dict[str, Any] = payload.options_by_header or {}
    updated = upsert_options_map(db, report_type, role_value, incoming)
    return {
        "status": 0,
        "message": "選項已更新",
        "data": {
            "report_type": report_type,
            "role": role_value,
            "options_by_header": updated,
        },
    }
