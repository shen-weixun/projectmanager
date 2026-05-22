# Project 主檔 API：處理專案列表、甘特圖、建立、詳情、主檔更新與刪除。
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from db.core import get_db
from models import Project
from models.project import ProjectCheckpointItem, ProjectScheduleItem, ProjectTodoItem
from utils.auth import AuthPayload, get_current_user

from .helpers import (
    apply_fields_to_project,
    blank_to_none,
    ensure_status_and_category_options,
    require_project,
    user_id,
    validate_project_date_range,
)
from .schemas import ProjectCreatePayload, ProjectUpdatePayload
from .serializers import serialize_project_detail, serialize_project_list_item

router = APIRouter(prefix="/project", tags=["Project"])


# 取得專案子資源 (時程、待辦、查核點)，供內部共用。
def _load_project_children(db: Session, project_id: int):
    # 時程
    schedule_items = (
        # 先已 sort_order 排序，如果 sort_order 相同則已 id 排序。
        db.query(ProjectScheduleItem)
        .filter(ProjectScheduleItem.project_id == project_id)
        .order_by(ProjectScheduleItem.sort_order.asc(), ProjectScheduleItem.id.asc())
        .all()
    )
    # 待辦
    todo_items = (
        db.query(ProjectTodoItem)
        .filter(ProjectTodoItem.project_id == project_id)
        .order_by(ProjectTodoItem.sort_order.asc(), ProjectTodoItem.id.asc())
        .all()
    )
    # 查核點
    checkpoint_items = (
        db.query(ProjectCheckpointItem)
        .filter(ProjectCheckpointItem.project_id == project_id)
        .order_by(ProjectCheckpointItem.sort_order.asc(), ProjectCheckpointItem.id.asc())
        .all()
    )
    return schedule_items, todo_items, checkpoint_items


# 取得專案列表，支援分頁、狀態/組別篩選、關鍵字搜尋與排序。
@router.get("/list", summary="取得專案列表")
async def project_list(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    status: str | None = None,
    group: str | None = None,
    category: str | None = Query(None),      # 確認有這行
    sortKey: str = Query("planStartDate"),
    sortDirection: str = Query("asc"),
    keyword: str | None = None,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    query = db.query(Project)
    # 狀態篩選
    if status:
      if isinstance(status, str):
          status_list = [item.strip() for item in status.split(",")]
      else:
          status_list = list(status)
      query = query.filter(Project.status.in_(status_list))

    # 組別篩選
    if group:
        query = query.filter(Project.group_name == group)

    if category:
        if isinstance(category, str):
            category_list = [item.strip() for item in category.split(",")]
        else:
            category_list = list(category)
        query = query.filter(Project.category.in_(category_list))
    # 關鍵字篩選
    # TODO: 前端目前沒有設計關鍵字搜尋欄位
    if keyword:
        # 關鍵字同時查專案名稱、客戶與負責人。
        query = query.filter(
            # ilike() 是不分大小寫的模糊查詢，適合搜尋框使用。
            (Project.name.ilike(f"%{keyword}%")) |
            (Project.customer.ilike(f"%{keyword}%")) |
            (Project.owner_name.ilike(f"%{keyword}%"))
        )
    # 取得總數
    total = query.count()
    # 排序
    if sortKey == "name":
        order_col = Project.name
    elif sortKey == "status":
        order_col = Project.status
    elif sortKey == "dueDate":
        order_col = Project.due_date
    elif sortKey == "planStartDate":
        order_col = Project.plan_start_date
    else:
        order_col = Project.id

    query = query.order_by(order_col.asc() if sortDirection == "asc" else order_col.desc())
    # 分頁查詢：
    # offset() 跳過前面頁數的資料，limit() 限制本次回傳筆數。
    # 例如 page=2、pageSize=10 時，會跳過前 10 筆並取第 11~20 筆資料。
    items = query.offset((page - 1) * pageSize).limit(pageSize).all()

    return {
        "status": 0,
        "data": {
            "items": [serialize_project_list_item(project) for project in items],
            "total": total,
            "page": page,
            "pageSize": pageSize,
        },
    }


# 取得甘特圖需要的專案資料
@router.get("/gantt", summary="取得專案甘特圖資料")
async def project_gantt(
    start: str | None = None,
    end: str | None = None,
    status: str | None = None,
    group: str | None = None,
    keyword: str | None = None,
    category: str | None = Query(None),       # 確認有這行
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    query = db.query(Project)
    if status:
      if isinstance(status, str):
          status_list = [item.strip() for item in status.split(",")]
      else:
          status_list = list(status)
      query = query.filter(Project.status.in_(status_list))
    if group:
        query = query.filter(Project.group_name == group)

    if category:
      if isinstance(category, str):
        category_list = [item.strip() for item in category.split(",")]
      else:
        category_list = list(category)
      query = query.filter(Project.category.in_(category_list))
    if start:
        query = query.filter(Project.due_date >= start)
    if end:
        query = query.filter(Project.start_date <= end)
    if keyword:
        kw = f"%{keyword}%"
        query = query.filter(
            (Project.name.ilike(kw))
            | (Project.customer.ilike(kw))
            | (Project.plan_start_date.ilike(kw))
            | (Project.pre_start_date.ilike(kw))
            | (Project.due_date.ilike(kw))
        )

    return {"status": 0, "data": [serialize_project_list_item(project) for project in query.all()]}


# 建立專案主檔，寫入基本資訊、組別、狀態、類別與自訂欄位。
@router.post("/", summary="建立新專案")
async def create_project(
    payload: ProjectCreatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    data = payload.model_dump() 

    # 建立前先同步狀態/類別選項，讓手動輸入的新值可進入下拉清單。
    ensure_status_and_category_options(db, payload.status, payload.category)
    validate_project_date_range(
        blank_to_none(payload.preStartDate),
        blank_to_none(payload.planStartDate),
        blank_to_none(payload.dueDate),
    )

    project = Project(
        # created_by / updated_by 來自目前登入者。
        created_by=user_id(user),
        updated_by=user_id(user),
    )
    apply_fields_to_project(project, data, db)
    db.add(project)
    db.flush()

    schedule_items = []
    for index, item in enumerate(payload.scheduleItems):
        if not item.name or not item.startDate or not item.endDate:
            continue
        schedule_item = ProjectScheduleItem(
            project_id=project.id,
            name=item.name,
            assignee=blank_to_none(item.assignee),
            start_date=item.startDate,
            end_date=item.endDate,
            status=item.status or "尚未開始",
            sort_order=index,
        )
        db.add(schedule_item)
        schedule_items.append(schedule_item)

    todo_items = []
    for index, item in enumerate(payload.todoItems):
        if not item.item:
            continue
        todo_item = ProjectTodoItem(
            project_id=project.id,
            item=item.item,
            assignee=blank_to_none(item.assignee),
            status=item.status or "尚未開始",
            due_date=blank_to_none(item.dueDate),
            note=blank_to_none(item.note),
            sort_order=index,
        )
        db.add(todo_item)
        todo_items.append(todo_item)

    checkpoint_items = []
    for index, item in enumerate(payload.checkpointItems):
        if not item.checkpoint:
            continue
        checkpoint_item = ProjectCheckpointItem(
            project_id=project.id,
            checkpoint=item.checkpoint,
            review_date=blank_to_none(item.reviewDate),
            assignee=blank_to_none(item.assignee),
            status=item.status or "尚未開始",
            note=blank_to_none(item.note),
            description=blank_to_none(item.description),
            sort_order=index,
        )
        db.add(checkpoint_item)
        checkpoint_items.append(checkpoint_item)

    db.commit()
    db.refresh(project)
    return {
        "status": 0,
        "data": serialize_project_detail(project, schedule_items, todo_items, checkpoint_items),
    }


# 取得單一專案詳情，包含主檔、時程、待辦與查核點資料。
@router.get("/{project_id:int}", summary="取得單一專案詳情")
async def get_project_detail(
    project_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    project = require_project(db, project_id)
    schedule_items, todo_items, checkpoint_items = _load_project_children(db, project_id)
    return {
        "status": 0,
        "data": serialize_project_detail(project, schedule_items, todo_items, checkpoint_items),
    }


# 更新專案主檔，處理基本資訊變更並保留未變更的資料。
@router.patch("/{project_id:int}", summary="更新專案")
async def update_project(
    project_id: int,
    payload: ProjectUpdatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    project = require_project(db, project_id)
    data = payload.model_dump(exclude_none=True) # 排除 none 欄位
    # 合併既有資料與本次 payload，僅針對實際變更的選項做同步。
    next_status = blank_to_none(data.get("status", project.status))
    next_category = blank_to_none(data.get("category", project.category))
    next_group = blank_to_none(data.get("group", project.group_name))

    status_changed = next_status != blank_to_none(project.status)
    category_changed = next_category != blank_to_none(project.category)
    group_changed = next_group != blank_to_none(project.group_name)

    ensure_status_and_category_options(
        db,
        next_status if status_changed else None,
        next_category if category_changed else None,
    )
    if not group_changed:
        data.pop("group", None) # .pop(key, default) -> 如果 key 不存在，會回傳 default

    current_date_values = (
        blank_to_none(project.pre_start_date),
        blank_to_none(project.plan_start_date),
        blank_to_none(project.due_date),
    )
    next_date_values = (
        blank_to_none(data.get("preStartDate", project.pre_start_date)),
        blank_to_none(data.get("planStartDate", project.plan_start_date)),
        blank_to_none(data.get("dueDate", project.due_date)),
    )
    date_fields_changed = next_date_values != current_date_values
    if date_fields_changed:
        # 日期有異動才檢查合併後的完整日期範圍
        validate_project_date_range(*next_date_values)

    apply_fields_to_project(project, data, db)
    project.updated_by = user_id(user)
    db.add(project)

    db.commit()
    db.refresh(project)

    schedule_items, todo_items, checkpoint_items = _load_project_children(db, project_id)
    return {
        "status": 0,
        "data": serialize_project_detail(project, schedule_items, todo_items, checkpoint_items),
    }


# 刪除專案主檔，並一併清除該專案的時程、待辦與查核點資料。
# TODO: 刪除只是保留範例，目前沒有使用
@router.delete("/{project_id:int}", summary="刪除專案")
async def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(get_current_user),
):
    project = require_project(db, project_id)

    # 先刪除子資源，再刪除主檔，避免資料庫外鍵殘留。
    db.query(ProjectScheduleItem).filter(ProjectScheduleItem.project_id == project_id).delete(synchronize_session=False)
    db.query(ProjectTodoItem).filter(ProjectTodoItem.project_id == project_id).delete(synchronize_session=False)
    db.query(ProjectCheckpointItem).filter(ProjectCheckpointItem.project_id == project_id).delete(synchronize_session=False)

    db.delete(project)
    db.commit()
    return {"status": 0, "data": {"id": project_id}}
