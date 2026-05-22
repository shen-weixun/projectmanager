# Project API Helper：提供專案查找、欄位映射、權限資料與共用邏輯。
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import Group, Project, ProjectOption
from models.project import ProjectCheckpointItem, ProjectScheduleItem, ProjectTodoItem
from utils.auth import AuthPayload


def user_id(user: AuthPayload) -> int:
    return int(user.user_id)


def blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def require_project(db: Session, project_id: int) -> Project:
    # 檢查專案是否存在
    project = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise HTTPException(
            status_code=404,
            detail={"status": 1, "message": "找不到專案"},
        )
    return project


def resolve_group_id(db: Session, group_name: str) -> int | None:
    # 前端送的是群組名稱
    # TODO: 後續可使用 group_id 進行專案列表的群組篩選、群組權限控管與關聯查詢。
    if not group_name:
        return None
    group = db.query(Group).filter(Group.name == group_name, Group.is_active.is_(True)).first()
    if group is None:
        return None
    return group.id


def resolve_project_owner_name(data: dict) -> str | None:
    if "projectOwner" in data:
        value = data.get("projectOwner")
        return value.strip() if isinstance(value, str) else value
    return None


def ensure_project_option(db: Session, option_type: str, value: str | None) -> None:
    # 專案主檔允許直接輸入新的狀態/類別，並同步補進下拉選項。
    value = blank_to_none(value)
    if value:
        option = db.query(ProjectOption).filter(
            ProjectOption.option_type == option_type,
            ProjectOption.value == value,
        ).first()
        if option:
            if option.is_active != 1:
                option.is_active = 1
            return

        new_option = ProjectOption(
            option_type=option_type,
            value=value,
            sort_order=db.query(ProjectOption).filter(ProjectOption.option_type == option_type).count(),
            is_active=1,
        )
        db.add(new_option)


def ensure_status_and_category_options(db: Session, status: str | None, category: str | None) -> None:
    ensure_project_option(db, "status", status)
    ensure_project_option(db, "category", category)


def validate_project_date_range(pre_start_date: str | None, plan_start_date: str | None, due_date: str | None) -> None:
    # API 層會用既有資料與本次更新資料合併後再檢查日期順序。
    if not due_date:
        return
    if pre_start_date and pre_start_date > due_date:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "專案開始時間不能晚於結束時間"})
    if plan_start_date and plan_start_date > due_date:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "計劃開始時間不能晚於結束時間"})


def validate_schedule_date_range(start_date: str | None, end_date: str | None) -> None:
    # 時程更新時用完整資料檢查，涵蓋只改單一日期的情境。
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "時程開始時間不能晚於結束時間"})


def apply_fields_to_project(project: Project, data: dict, db: Session) -> None:
    # 將前端欄位映射到 SQLAlchemy model 的欄位。
    field_map = {
        "name": "name",
        "customer": "customer",
        "category": "category",
        "status": "status",
        "startDate": "start_date",
        "preStartDate": "pre_start_date",
        "planStartDate": "plan_start_date",
        "dueDate": "due_date",
        "registeredAddress": "registered_address",
        "mailingAddress": "mailing_address",
        "contact1": "contact1",
        "contactPhone1": "contact_phone1",
        "contact2": "contact2",
        "contactPhone2": "contact_phone2",
        "contact3": "contact3",
        "contactPhone3": "contact_phone3",
        "description": "description",
    }
    nullable_fields = {
        "customer",
        "category",
        "startDate",
        "preStartDate",
        "planStartDate",
        "dueDate",
        "registeredAddress",
        "mailingAddress",
        "contact1",
        "contactPhone1",
        "contact2",
        "contactPhone2",
        "contact3",
        "contactPhone3",
        "description",
    }
    for camel, snake in field_map.items():
        if camel in data and data[camel] is not None:
            value = data[camel]
            # 選填文字欄位空白時存 NULL，必填名稱與狀態保留原值。
            if camel in nullable_fields and isinstance(value, str):
                value = blank_to_none(value)
            setattr(project, snake, value) # setattr(project, snake, value) == project.snake = value

    project_owner_name = resolve_project_owner_name(data)
    if project_owner_name is not None:
        project.owner_name = blank_to_none(project_owner_name)

    if "group" in data and data["group"] is not None:
        # 同步保存群組名稱與群組 id；若名稱找不到啟用群組，id 會保持空值。
        project.group_name = blank_to_none(data["group"])
        project.group_id = resolve_group_id(db, data["group"])

    if "customFields" in data and data["customFields"] is not None:
        # 自訂欄位目前直接以 JSON 陣列保存，不另外驗證欄位名稱是否重複。
        project.custom_fields = [
            {"id": cf.get("id", ""), "label": cf.get("label", ""), "value": cf.get("value", "")}
            for cf in data["customFields"]
        ]

    if "customTables" in data and data["customTables"] is not None:
        project.custom_tables = [
            {
                "id": table.get("id", ""),
                "title": table.get("title", ""),
                "columns": [
                    {"id": column.get("id", ""), "label": column.get("label", "")}
                    for column in table.get("columns", [])
                ],
                "rows": table.get("rows", []),
            }
            for table in data["customTables"]
        ]


def next_sort_order(db: Session, model, project_id: int) -> int:
    # 新增子資源時接在目前筆數之後，維持前端列表的建立順序。
    return db.query(model).filter(model.project_id == project_id).count()


def get_schedule_item(db: Session, project_id: int, item_id: int) -> ProjectScheduleItem:
    # 查找時同時限制 project_id，避免跨專案誤更新。
    item = db.query(ProjectScheduleItem).filter(
        ProjectScheduleItem.project_id == project_id,
        ProjectScheduleItem.id == item_id,
    ).first()
    if item is None:
        raise HTTPException(status_code=404, detail={"status": 1, "message": "找不到時程項目"})
    return item


def get_todo_item(db: Session, project_id: int, item_id: int) -> ProjectTodoItem:
    # 查找時同時限制 project_id，避免跨專案誤更新。
    item = db.query(ProjectTodoItem).filter(
        ProjectTodoItem.project_id == project_id,
        ProjectTodoItem.id == item_id,
    ).first()
    if item is None:
        raise HTTPException(status_code=404, detail={"status": 1, "message": "找不到待辦項目"})
    return item


def get_checkpoint_item(db: Session, project_id: int, item_id: int) -> ProjectCheckpointItem:
    # 查找時同時限制 project_id，避免跨專案誤更新。
    item = db.query(ProjectCheckpointItem).filter(
        ProjectCheckpointItem.project_id == project_id,
        ProjectCheckpointItem.id == item_id,
    ).first()
    if item is None:
        raise HTTPException(status_code=404, detail={"status": 1, "message": "找不到查核點"})
    return item
