# Project 選項 API：處理專案狀態與類別選項的查詢與維護。
# TODO: 目前沒有引入角色權限控管
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.core import get_db
from models import ProjectItemStatusOption, ProjectOption
from utils.auth import AuthPayload, get_current_user

from .schemas import OptionCreatePayload, OptionUpdatePayload

router = APIRouter(prefix="/project", tags=["Project"])

ALLOWED_OPTION_TYPES = ("status", "category")
ITEM_STATUS_OPTION_TYPES = {
    "todo_status": ("todo", "todoStatuses"),
    "schedule_status": ("schedule", "scheduleStatuses"),
    "checkpoint_status": ("checkpoint", "checkpointStatuses"),
}


def load_project_options(db: Session) -> dict:
    rows = (
        db.query(ProjectOption)
        .filter(ProjectOption.is_active == 1)
        # asc() => 升冪、desc() => 降冪
        .order_by(
            ProjectOption.option_type.asc(),
            ProjectOption.sort_order.asc(),
            ProjectOption.id.asc(),
        )
        .all()
    )
    item_status_rows = (
        db.query(ProjectItemStatusOption)
        .filter(ProjectItemStatusOption.is_active == 1)
        .order_by(
            ProjectItemStatusOption.item_type.asc(),
            ProjectItemStatusOption.sort_order.asc(),
            ProjectItemStatusOption.id.asc(),
        )
        .all()
    )

    return {
        "statuses": [row.value for row in rows if row.option_type == "status"],
        "categories": [row.value for row in rows if row.option_type == "category"],
        "todoStatuses": [row.value for row in item_status_rows if row.item_type == "todo"],
        "scheduleStatuses": [row.value for row in item_status_rows if row.item_type == "schedule"],
        "checkpointStatuses": [row.value for row in item_status_rows if row.item_type == "checkpoint"],
    }


# 取得專案狀態與類別選項，用於表單下拉選單
@router.get("/options", summary="取得專案選項")
async def get_project_options(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    return {"status": 0, "data": load_project_options(db)}


# 取得所有專案選項與管理欄位
@router.get("/options/manage", summary="管理專案選項（含完整欄位）")
async def get_project_options_manage(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    rows = (
        db.query(ProjectOption)
        .order_by(
            ProjectOption.option_type.asc(),
            ProjectOption.sort_order.asc(),
            ProjectOption.id.asc(),
        )
        .all()
    )
    return {
        "status": 0,
        "data": [
            {
                "id": row.id,
                "optionType": row.option_type,
                "value": row.value,
                "sortOrder": row.sort_order,
                "isActive": bool(row.is_active),
            }
            for row in rows
        ],
    }


# 新增專案主表或子表選項
@router.post("/options", summary="新增專案選項")
async def create_project_option(
    payload: OptionCreatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    if payload.optionType not in ALLOWED_OPTION_TYPES and payload.optionType not in ITEM_STATUS_OPTION_TYPES:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "不合法的 optionType"})

    value = payload.value.strip()
    if not value:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "名稱不可為空"})

    if payload.optionType in ITEM_STATUS_OPTION_TYPES:
        item_type, _response_key = ITEM_STATUS_OPTION_TYPES[payload.optionType]
        exists = db.query(ProjectItemStatusOption).filter(
            ProjectItemStatusOption.item_type == item_type,
            ProjectItemStatusOption.value == value,
        ).first()

        if exists:
            raise HTTPException(status_code=400, detail={"status": 1, "message": "選項已存在"})

        new_option = ProjectItemStatusOption(
            item_type=item_type,
            value=value,
            sort_order=db.query(ProjectItemStatusOption).filter(ProjectItemStatusOption.item_type == item_type).count(),
            is_active=1,
        )
        db.add(new_option)
        db.commit()
        db.refresh(new_option)
        return {"status": 0, "data": {"id": new_option.id}}

    exists = db.query(ProjectOption).filter(
        ProjectOption.option_type == payload.optionType,
        ProjectOption.value == value,
    ).first()

    if exists:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "選項已存在"})

    new_option = ProjectOption(
        option_type=payload.optionType,
        value=value,
        sort_order=db.query(ProjectOption).filter(ProjectOption.option_type == payload.optionType).count(),
        is_active=1,
    )
    db.add(new_option)
    db.commit()
    db.refresh(new_option)
    return {"status": 0, "data": {"id": new_option.id}}


# # 更新指定專案選項
# @router.patch("/options/{option_id}", summary="修改專案選項")
# async def update_project_option(
#     option_id: int,
#     payload: OptionUpdatePayload,
#     db: Session = Depends(get_db),
#     user: AuthPayload = Depends(get_current_user),
# ):
#     option = db.query(ProjectOption).filter(ProjectOption.id == option_id).first()
#     if not option:
#         raise HTTPException(status_code=404, detail={"status": 1, "message": "找不到該選項"})

#     if payload.value is not None:
#         value = payload.value.strip()
#         if not value:
#             raise HTTPException(status_code=400, detail={"status": 1, "message": "名稱不可為空"})
#         exists = db.query(ProjectOption).filter(
#             ProjectOption.option_type == option.option_type,
#             ProjectOption.value == value,
#             ProjectOption.id != option_id,
#         ).first()
#         if exists:
#             raise HTTPException(status_code=400, detail={"status": 1, "message": "選項名稱已存在"})
#         option.value = value

#     if payload.isActive is not None:
#         # isActive 來自前端 boolean，資料庫 project_option.is_active 用 1/0 保存。
#         option.is_active = 1 if payload.isActive else 0

#     if payload.sortOrder is not None:
#         # sortOrder 對應 project_option.sort_order，用來控制同分類選項顯示順序。
#         option.sort_order = payload.sortOrder

#     db.commit()
#     return {"status": 0, "data": {"id": option.id}}
