# 過往週次：登出後將已填寫的週報／週工作紀錄標記鎖定（is_locked）；當週永不鎖定。
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.weekly import PMWeeklyReportTable, RDWeeklyReportTable
from models.work_report import WeeklyWorkRecordTable

DEFAULT_TABLE_NAME = "未命名表格"

WEEKLY_TABLE_MODELS = (
    WeeklyWorkRecordTable,
    PMWeeklyReportTable,
    RDWeeklyReportTable,
)


def coerce_to_date(value: date | datetime | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


def monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def work_week_monday(anchor: date | datetime) -> date:
    """將日期歸到工作週週一（週一～週五同週；週日視為次日本週，修正 UTC 少一天）。"""
    d = coerce_to_date(anchor)
    if d is None:
        raise ValueError("invalid date")
    wd = d.weekday()
    if wd == 6:
        return d + timedelta(days=1)
    return d - timedelta(days=wd)


def is_past_week(week_start: date | datetime) -> bool:
    return work_week_monday(week_start) < monday_of(date.today())


def is_current_week(week_start: date | datetime) -> bool:
    """本週與未來週不可鎖定、可編輯。"""
    return work_week_monday(week_start) >= monday_of(date.today())


def table_has_user_content(table_data: dict[str, Any] | None, table_name: str = "") -> bool:
    name = (table_name or "").strip()
    if name and name != DEFAULT_TABLE_NAME:
        return True
    if not table_data or not isinstance(table_data, dict):
        return False
    for row in table_data.get("rows") or []:
        if not isinstance(row, dict):
            continue
        for value in row.values():
            if str(value or "").strip():
                return True
    return False


def was_saved_after_create(
    created_at: datetime | None,
    updated_at: datetime | None,
) -> bool:
    if not created_at or not updated_at:
        return False
    return (updated_at - created_at).total_seconds() > 1


def table_has_been_edited(
    table_data: dict[str, Any] | None,
    table_name: str = "",
    *,
    created_at: datetime | None = None,
    updated_at: datetime | None = None,
) -> bool:
    if table_has_user_content(table_data, table_name):
        return True
    return was_saved_after_create(created_at, updated_at)


def is_table_read_only(
    *,
    is_locked: bool,
    week_start: date | datetime | None = None,
) -> bool:
    """當週表格一律不視為唯讀；僅過往週次且已登出鎖定者唯讀。"""
    ws = coerce_to_date(week_start) if week_start is not None else None
    if ws is not None and is_current_week(ws):
        return False
    return bool(is_locked)


def assert_table_editable(
    *,
    is_locked: bool,
    week_start: date | datetime | None = None,
) -> None:
    ws = coerce_to_date(week_start) if week_start is not None else None
    if ws is not None and is_current_week(ws):
        return
    if is_table_read_only(is_locked=is_locked, week_start=ws):
        raise HTTPException(
            status_code=403,
            detail={
                "status": 1,
                "message": "此紀錄已於登出後鎖定，過往資料僅供查閱不可修改",
            },
        )


def prepare_weekly_table_for_write(
    db: Session,
    table: Any,
    *,
    view_week_start: date | datetime | None = None,
) -> None:
    """儲存／刪除前：當週或使用者正在檢視的本週畫面，一律允許寫入。"""
    ws = coerce_to_date(getattr(table, "week_start", None))
    vw = coerce_to_date(view_week_start)

    if ws is not None and is_current_week(ws):
        table.is_locked = False
        normalized = work_week_monday(ws)
        if table.week_start != normalized:
            table.week_start = normalized
        db.add(table)
        db.flush()
        return

    if vw is not None and is_current_week(vw):
        table.is_locked = False
        table.week_start = work_week_monday(vw)
        db.add(table)
        db.flush()
        return

    ensure_weekly_table_editable(db, table)
    db.flush()
    ws = coerce_to_date(table.week_start)
    assert_table_editable(is_locked=bool(table.is_locked), week_start=ws)


def unlock_current_week_tables(db: Session, user_id: int | None = None) -> None:
    """解除當週及之後週次表格的鎖定，並將 week_start 校正為週一。"""
    for model in WEEKLY_TABLE_MODELS:
        query = db.query(model).filter(model.is_locked.is_(True))
        if user_id is not None:
            query = query.filter(model.user_id == user_id)
        for table in query.all():
            ws = coerce_to_date(table.week_start)
            if ws is None or not is_current_week(ws):
                continue
            table.is_locked = False
            normalized = work_week_monday(ws)
            if table.week_start != normalized:
                table.week_start = normalized
            db.add(table)


def ensure_weekly_table_editable(db: Session, table: Any) -> None:
    """單筆表格：若屬當週卻被標記鎖定，立即清除（登入／登出／儲存前皆可呼叫）。"""
    week_start = coerce_to_date(getattr(table, "week_start", None))
    if week_start is None:
        return
    if is_current_week(week_start):
        if table.is_locked:
            table.is_locked = False
        normalized = work_week_monday(week_start)
        if table.week_start != normalized:
            table.week_start = normalized
        db.add(table)


def lock_user_past_tables_on_logout(db: Session, user_id: int) -> None:
    """登出時僅鎖定過往週次；當週表格絕不寫入 is_locked=True。"""
    week_cutoff = monday_of(date.today())
    for model in WEEKLY_TABLE_MODELS:
        tables = (
            db.query(model)
            .filter(
                model.user_id == user_id,
                model.is_locked.is_(False),
                model.week_start < week_cutoff,
            )
            .all()
        )
        for table in tables:
            if not is_past_week(table.week_start):
                continue
            if table_has_been_edited(
                table.table_data,
                table.table_name,
                created_at=table.created_at,
                updated_at=table.updated_at,
            ):
                table.is_locked = True
                db.add(table)

    unlock_current_week_tables(db, user_id=user_id)
