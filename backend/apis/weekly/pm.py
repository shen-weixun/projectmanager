# PM 週報 API：處理動態自訂表格 (JSONB) 的 CRUD 與每個人獨立區塊的分配。
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Dict, Any

from db.core import get_db
from models.weekly import PMWeeklyReportTable
from models import User, Role, UserRole
from utils.auth import AuthPayload, role_required

router = APIRouter(prefix="/pm", tags=["PM Weekly Report (Custom Dynamic Tables)"])

# PM 週報只開放 PM 相關角色與管理角色存取
PM_READ_ROLES = ("super", "boss", "pm_leader", "pm_user")
PM_WRITE_ROLES = ("super", "boss", "pm_leader", "pm_user")
PM_MANAGER_ROLES = ("super", "boss", "pm_leader")

# 可以建立自己表格的角色
PM_CREATE_ROLES = ("super", "boss", "pm_leader", "pm_user")

# PM 相關的角色 key（用來過濾 grouped 顯示的使用者）
PM_RELATED_ROLE_KEYS = {"pm_leader", "pm_user"}


def user_id(user: AuthPayload) -> int:
    return int(user.user_id)


def is_manager(user: AuthPayload) -> bool:
    return user.role_key in PM_MANAGER_ROLES


def get_user_role_keys_set(db: Session, uid: int) -> set[str]:
    """取得指定使用者的所有 role_key 集合"""
    rows = (
        db.query(Role.role_key)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == uid)
        .all()
    )
    return {r.role_key for r in rows}


# --- Pydantic 傳輸格式校驗 ---

class TableCreatePayload(BaseModel):
    week_start: str = Field(..., description="格式: YYYY-MM-DD")
    table_name: str = Field("未命名表格", max_length=100)


class TableUpdatePayload(BaseModel):
    table_name: str | None = Field(None, max_length=100)
    table_data: Dict[str, Any] | None = None


# --- API 路由定義 ---

@router.get("/tables/grouped")
async def get_grouped_pm_tables(
    week_start: str,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*PM_READ_ROLES)),
):
    """
    根據傳入的週一日期 (week_start)，回傳本週所有 PM 人員的自訂表格。
    - pm_user / pm_leader：看到所有 PM 相關人員的區塊
    - super / boss：同上，但也能看到自己的區塊（若有建立表格）
    非 PM 角色（如 rd_user）因路由守衛在前端已被擋，後端這裡也有 role_required 保護。
    """
    current_uid = user_id(user)

    # 撈出該週所有的自訂表格項目
    tables = db.query(PMWeeklyReportTable).filter(
        PMWeeklyReportTable.week_start == week_start
    ).all()

    grouped_data: Dict[int, Dict[str, Any]] = {}

    # 將已有表格的使用者塞入對應區塊
    for t in tables:
        u_id = t.user_id
        if u_id not in grouped_data:
            grouped_data[u_id] = {
                "user_id": u_id,
                "user_name": t.creator.name if t.creator else "未知用戶",
                "is_current_user": u_id == current_uid,
                "tables": [],
            }
        grouped_data[u_id]["tables"].append({
            "id": t.id,
            "table_name": t.table_name,
            "table_data": t.table_data,
        })

    # 管理者：補全「還沒填寫」的 PM 人員區塊，讓管理者看到完整名單
    if is_manager(user):
        # 只列出有 pm_user 或 pm_leader 角色的啟用使用者
        pm_user_ids = (
            db.query(UserRole.user_id)
            .join(Role, Role.id == UserRole.role_id)
            .filter(Role.role_key.in_(PM_RELATED_ROLE_KEYS))
            .subquery()
        )
        pm_users = (
            db.query(User)
            .filter(User.is_active.is_(True), User.id.in_(pm_user_ids))
            .all()
        )
        for pm in pm_users:
            if pm.id not in grouped_data:
                grouped_data[pm.id] = {
                    "user_id": pm.id,
                    "user_name": pm.name,
                    "is_current_user": pm.id == current_uid,
                    "tables": [],
                }

        # super/boss 自己也要有區塊（若他們想填寫的話）
        if current_uid not in grouped_data:
            active_user = db.query(User).filter(User.id == current_uid).first()
            grouped_data[current_uid] = {
                "user_id": current_uid,
                "user_name": active_user.name if active_user else "我",
                "is_current_user": True,
                "tables": [],
            }

    # pm_user 本人：確保自己的區塊存在
    if user.role_key == "pm_user" and current_uid not in grouped_data:
        active_user = db.query(User).filter(User.id == current_uid).first()
        grouped_data[current_uid] = {
            "user_id": current_uid,
            "user_name": active_user.name if active_user else "我",
            "is_current_user": True,
            "tables": [],
        }

    # pm_leader 本人：確保自己的區塊存在
    if user.role_key == "pm_leader" and current_uid not in grouped_data:
        active_user = db.query(User).filter(User.id == current_uid).first()
        grouped_data[current_uid] = {
            "user_id": current_uid,
            "user_name": active_user.name if active_user else "我",
            "is_current_user": True,
            "tables": [],
        }

    return {"status": 0, "data": list(grouped_data.values())}


@router.post("/tables")
async def create_pm_table(
    payload: TableCreatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*PM_WRITE_ROLES)),
):
    # 確認角色有建立權限（所有 PM 相關角色與 admin 均可）
    if user.role_key not in PM_CREATE_ROLES:
        raise HTTPException(
            status_code=403,
            detail={"status": 1, "message": "您的角色無法建立週報表格"},
        )

    default_structure = {
        "headers": ["工作項目", "目前進度", "備註事項"],
        "rows": [{"工作項目": "", "目前進度": "", "備註事項": ""}],
    }

    new_table = PMWeeklyReportTable(
        week_start=datetime.strptime(payload.week_start, "%Y-%m-%d").date(),
        user_id=user_id(user),
        table_name=payload.table_name.strip(),
        table_data=default_structure,
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
async def update_pm_table(
    table_id: int,
    payload: TableUpdatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*PM_WRITE_ROLES)),
):
    table = db.query(PMWeeklyReportTable).filter(PMWeeklyReportTable.id == table_id).first()
    if not table:
        raise HTTPException(
            status_code=404,
            detail={"status": 1, "message": "找不到該表格項目"},
        )

    # 只有建立者本人可以修改
    if table.user_id != user_id(user):
        raise HTTPException(
            status_code=403,
            detail={"status": 1, "message": "權限不足，您只能修改自己區塊內的表格"},
        )

    data = payload.model_dump(exclude_unset=True)

    if "table_name" in data and data["table_name"] is not None:
        table.table_name = data["table_name"].strip()

    if "table_data" in data and data["table_data"] is not None:
        table.table_data = data["table_data"]

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
async def delete_pm_table(
    table_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*PM_WRITE_ROLES)),
):
    table = db.query(PMWeeklyReportTable).filter(PMWeeklyReportTable.id == table_id).first()
    if not table:
        raise HTTPException(
            status_code=404,
            detail={"status": 1, "message": "找不到該表格項目"},
        )

    # 只有建立者本人可以刪除
    if table.user_id != user_id(user):
        raise HTTPException(
            status_code=403,
            detail={"status": 1, "message": "權限不足，您只能刪除自己建立的表格"},
        )

    db.delete(table)
    db.commit()

    return {"status": 0, "message": "表格已成功刪除", "data": {"id": table_id}}
