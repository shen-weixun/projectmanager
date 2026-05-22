# Project 子資源 API：處理時程、待辦與查核點的獨立 CRUD。
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.core import get_db
from models.project import ProjectCheckpointItem, ProjectScheduleItem, ProjectTodoItem
from utils.auth import AuthPayload, get_current_user

from .helpers import (
    blank_to_none,
    get_checkpoint_item,
    get_schedule_item,
    get_todo_item,
    next_sort_order,
    require_project,
    validate_schedule_date_range,
)
from .schemas import (
    CheckpointCreatePayload,
    CheckpointItemSchema,
    ScheduleCreatePayload,
    ScheduleItemSchema,
    TodoCreatePayload,
    TodoItemSchema,
)
from .serializers import (
    serialize_checkpoint_item,
    serialize_schedule_item,
    serialize_todo_item,
)

router = APIRouter(prefix="/project", tags=["Project"])


# 取得專案的時程清單
@router.get("/{project_id:int}/schedule", summary="取得專案時程")
async def get_project_schedule(
    project_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    require_project(db, project_id)
    items = (
        db.query(ProjectScheduleItem)
        .filter(ProjectScheduleItem.project_id == project_id)
        .order_by(ProjectScheduleItem.sort_order.asc(), ProjectScheduleItem.id.asc())
        .all()
    )
    return {"status": 0, "data": [serialize_schedule_item(item) for item in items]}


# 新增專案的時程項目，支援單筆或批次建立。
@router.post("/{project_id:int}/schedule", summary="新增專案時程")
async def create_project_schedule(
    project_id: int,
    payload: ScheduleCreatePayload | list[ScheduleCreatePayload],
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    require_project(db, project_id)

    # 單筆與批次共用同一段建立流程。
    payloads = payload if isinstance(payload, list) else [payload]
    items: list[ProjectScheduleItem] = []
    # 批次新增時依目前數量往後補 sort_order。
    sort_order = next_sort_order(db, ProjectScheduleItem, project_id)

    # enumerate 同時取得 index 與 value 
    for index, item in enumerate(payloads):
        data = item.model_dump(exclude={"id"}) # 排除 id
        obj = ProjectScheduleItem(
            project_id=project_id,
            name=data["name"].strip(),
            assignee=blank_to_none(data.get("assignee")),
            start_date=data["startDate"],
            end_date=data["endDate"],
            status=data.get("status") or "尚未開始",
            sort_order=sort_order + index,
        )
        db.add(obj)
        items.append(obj)

    db.commit()
    for item in items:
        db.refresh(item)

    data = [serialize_schedule_item(item) for item in items]
    return {"status": 0, "data": data if isinstance(payload, list) else data[0]}


# 更新指定專案的一筆時程，並檢查名稱與起訖日期是否合法。
@router.patch("/{project_id:int}/schedule/{item_id:int}", summary="修改單筆專案時程")
async def update_project_schedule(
    project_id: int,
    item_id: int,
    payload: ScheduleItemSchema,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    require_project(db, project_id)
    item = get_schedule_item(db, project_id, item_id)
    # exclude_unset 只處理實際送來的欄位
    data = payload.model_dump(exclude_unset=True, exclude={"id"})

    if "name" in data:
        name = blank_to_none(data["name"])
        if not name:
            raise HTTPException(status_code=400, detail={"status": 1, "message": "時程名稱不可為空"})
        item.name = name
    # 負責人
    if "assignee" in data:
        item.assignee = blank_to_none(data["assignee"])
    if "startDate" in data:
        start_date = blank_to_none(data["startDate"])
        if not start_date:
            raise HTTPException(status_code=400, detail={"status": 1, "message": "開始時間不可為空"})
        item.start_date = start_date
    if "endDate" in data:
        end_date = blank_to_none(data["endDate"])
        if not end_date:
            raise HTTPException(status_code=400, detail={"status": 1, "message": "結束時間不可為空"})
        item.end_date = end_date
    if "status" in data and data["status"] is not None:
        item.status = data["status"]

    validate_schedule_date_range(item.start_date, item.end_date)

    db.commit()
    db.refresh(item)
    return {"status": 0, "data": serialize_schedule_item(item)}


# 刪除指定專案的一筆時程項目。
@router.delete("/{project_id:int}/schedule/{item_id:int}", summary="刪除單筆專案時程")
async def delete_project_schedule(
    project_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    require_project(db, project_id)
    item = get_schedule_item(db, project_id, item_id)
    db.delete(item)
    db.commit()
    return {"status": 0, "data": {"id": item_id}}


# 取得指定專案的待辦清單，依排序與建立順序回傳。
@router.get("/{project_id:int}/todo", summary="取得專案待辦")
async def get_project_todo(
    project_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    require_project(db, project_id)
    items = (
        db.query(ProjectTodoItem)
        .filter(ProjectTodoItem.project_id == project_id)
        .order_by(ProjectTodoItem.sort_order.asc(), ProjectTodoItem.id.asc())
        .all()
    )
    return {"status": 0, "data": [serialize_todo_item(item) for item in items]}


# 新增指定專案的待辦項目，支援單筆或批次建立。
@router.post("/{project_id:int}/todo", summary="新增專案待辦")
async def create_project_todo(
    project_id: int,
    payload: TodoCreatePayload | list[TodoCreatePayload],
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    require_project(db, project_id)
    payloads = payload if isinstance(payload, list) else [payload]
    items: list[ProjectTodoItem] = []
    sort_order = next_sort_order(db, ProjectTodoItem, project_id)

    for index, item in enumerate(payloads):
        data = item.model_dump(exclude={"id"})
        obj = ProjectTodoItem(
            project_id=project_id,
            item=data["item"].strip(),
            assignee=blank_to_none(data.get("assignee")),
            status=data.get("status") or "尚未開始",
            due_date=blank_to_none(data.get("dueDate")),
            note=blank_to_none(data.get("note")),
            sort_order=sort_order + index,
        )
        db.add(obj)
        items.append(obj)

    db.commit()
    for item in items:
        db.refresh(item)

    data = [serialize_todo_item(item) for item in items]
    return {"status": 0, "data": data if isinstance(payload, list) else data[0]}


# 更新指定專案的一筆待辦，包含內容、負責人、狀態、期限與備註。
@router.patch("/{project_id:int}/todo/{item_id:int}", summary="修改單筆專案待辦")
async def update_project_todo(
    project_id: int,
    item_id: int,
    payload: TodoItemSchema,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    require_project(db, project_id)
    item = get_todo_item(db, project_id, item_id)
    data = payload.model_dump(exclude_unset=True, exclude={"id"})

    if "item" in data:
        item_name = blank_to_none(data["item"])
        if not item_name:
            raise HTTPException(status_code=400, detail={"status": 1, "message": "待辦事項不可為空"})
        item.item = item_name
    if "assignee" in data:
        item.assignee = blank_to_none(data["assignee"])
    if "status" in data and data["status"] is not None:
        item.status = data["status"]
    if "dueDate" in data:
        item.due_date = blank_to_none(data["dueDate"])
    if "note" in data:
        item.note = blank_to_none(data["note"])

    db.commit()
    db.refresh(item)
    return {"status": 0, "data": serialize_todo_item(item)}


# 刪除指定專案的一筆待辦項目。
@router.delete("/{project_id:int}/todo/{item_id:int}", summary="刪除單筆專案待辦")
async def delete_project_todo(
    project_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    require_project(db, project_id)
    item = get_todo_item(db, project_id, item_id)
    db.delete(item)
    db.commit()
    return {"status": 0, "data": {"id": item_id}}


# 取得指定專案的查核點清單，依排序與建立順序回傳。
@router.get("/{project_id:int}/checkpoint", summary="取得專案查核點")
async def get_project_checkpoint(
    project_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    require_project(db, project_id)
    items = (
        db.query(ProjectCheckpointItem)
        .filter(ProjectCheckpointItem.project_id == project_id)
        .order_by(ProjectCheckpointItem.sort_order.asc(), ProjectCheckpointItem.id.asc())
        .all()
    )
    return {"status": 0, "data": [serialize_checkpoint_item(item) for item in items]}


# 新增指定專案的查核點，支援單筆或批次建立。
@router.post("/{project_id:int}/checkpoint", summary="新增專案查核點")
async def create_project_checkpoint(
    project_id: int,
    payload: CheckpointCreatePayload | list[CheckpointCreatePayload],
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    require_project(db, project_id)
    payloads = payload if isinstance(payload, list) else [payload]
    items: list[ProjectCheckpointItem] = []
    sort_order = next_sort_order(db, ProjectCheckpointItem, project_id)

    for index, item in enumerate(payloads):
        data = item.model_dump(exclude={"id"})
        obj = ProjectCheckpointItem(
            project_id=project_id,
            checkpoint=data["checkpoint"].strip(),
            review_date=blank_to_none(data.get("reviewDate")),
            assignee=blank_to_none(data.get("assignee")),
            status=(data.get("status") or "尚未開始").strip() or "尚未開始",
            note=blank_to_none(data.get("note")),
            description=blank_to_none(data.get("description")),
            sort_order=sort_order + index,
        )
        db.add(obj)
        items.append(obj)

    db.commit()
    for item in items:
        db.refresh(item)

    data = [serialize_checkpoint_item(item) for item in items]
    return {"status": 0, "data": data if isinstance(payload, list) else data[0]}


# 更新指定專案的一筆查核點，包含查核內容、日期、負責人與說明。
@router.patch("/{project_id:int}/checkpoint/{item_id:int}", summary="修改單筆專案查核點")
async def update_project_checkpoint(
    project_id: int,
    item_id: int,
    payload: CheckpointItemSchema,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    require_project(db, project_id)
    item = get_checkpoint_item(db, project_id, item_id)
    data = payload.model_dump(exclude_unset=True, exclude={"id"})

    if "checkpoint" in data:
        checkpoint = blank_to_none(data["checkpoint"])
        if not checkpoint:
            raise HTTPException(status_code=400, detail={"status": 1, "message": "查核點不可為空"})
        item.checkpoint = checkpoint
    if "reviewDate" in data:
        item.review_date = blank_to_none(data["reviewDate"])
    if "assignee" in data:
        item.assignee = blank_to_none(data["assignee"])
    if "status" in data:
        item.status = (data.get("status") or "尚未開始").strip() or "尚未開始"
    if "note" in data:
        item.note = blank_to_none(data["note"])
    if "description" in data:
        item.description = blank_to_none(data["description"])

    db.commit()
    db.refresh(item)
    return {"status": 0, "data": serialize_checkpoint_item(item)}


# 刪除指定專案的一筆查核點。
@router.delete("/{project_id:int}/checkpoint/{item_id:int}", summary="刪除單筆專案查核點")
async def delete_project_checkpoint(
    project_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    require_project(db, project_id)
    item = get_checkpoint_item(db, project_id, item_id)
    db.delete(item)
    db.commit()
    return {"status": 0, "data": {"id": item_id}}
