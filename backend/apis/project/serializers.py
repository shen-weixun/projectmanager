# Project API Serializer：將專案 ORM 與子資源 ORM 轉成前端需要的 JSON。
from models import Project
from models.project import ProjectCheckpointItem, ProjectScheduleItem, ProjectTodoItem


def serialize_schedule_item(item: ProjectScheduleItem) -> dict:
    # 回傳前端時維持 camelCase，並保留 sortOrder 供未來拖拉排序使用。
    return {
        "id": item.id,
        "name": item.name,
        "assignee": item.assignee or "",
        "startDate": item.start_date,
        "endDate": item.end_date,
        "status": item.status,
        "sortOrder": item.sort_order,
    }


def serialize_todo_item(item: ProjectTodoItem) -> dict:
    # 空值轉成空字串，讓前端受控 input 不需要額外處理 None。
    return {
        "id": item.id,
        "item": item.item,
        "assignee": item.assignee or "",
        "status": item.status,
        "dueDate": item.due_date or "",
        "note": item.note or "",
        "sortOrder": item.sort_order,
    }


def serialize_checkpoint_item(item: ProjectCheckpointItem) -> dict:
    # 查核點包含表格欄位與詳細描述，皆以字串回傳給前端編輯。
    return {
        "id": item.id,
        "checkpoint": item.checkpoint,
        "reviewDate": item.review_date or "",
        "assignee": item.assignee or "",
        "status": item.status,
        "note": item.note or "",
        "description": item.description or "",
        "sortOrder": item.sort_order,
    }


def serialize_project_list_item(project: Project) -> dict:
    # 列表與甘特圖共用的專案基本資料，不包含子資源以降低查詢負擔。
    return {
        "id": project.id,
        "name": project.name,
        "customer": project.customer or "",
        "category": project.category or "",
        "group": project.group_name or "",
        "projectOwner": project.owner_name or "",
        "status": project.status,
        "startDate": project.start_date or "",
        "preStartDate": project.pre_start_date or "",
        "planStartDate": project.plan_start_date or "",
        "dueDate": project.due_date or "",
        "registeredAddress": project.registered_address or "",
        "mailingAddress": project.mailing_address or "",
        "contact1": project.contact1 or "",
        "contactPhone1": project.contact_phone1 or "",
        "contact2": project.contact2 or "",
        "contactPhone2": project.contact_phone2 or "",
        "contact3": project.contact3 or "",
        "contactPhone3": project.contact_phone3 or "",
    }


def serialize_project_detail(
    project: Project,
    schedule_items: list[ProjectScheduleItem],
    todo_items: list[ProjectTodoItem],
    checkpoint_items: list[ProjectCheckpointItem],
) -> dict:
    # 詳情頁需要主檔加三類子資源，一次組成完整表單資料。
    base = serialize_project_list_item(project)
    base["description"] = project.description or ""
    base["customFields"] = project.custom_fields or []
    base["customTables"] = project.custom_tables or []
    base["scheduleItems"] = [serialize_schedule_item(item) for item in schedule_items]
    base["todoItems"] = [serialize_todo_item(item) for item in todo_items]
    base["checkpointItems"] = [serialize_checkpoint_item(item) for item in checkpoint_items]
    return base
