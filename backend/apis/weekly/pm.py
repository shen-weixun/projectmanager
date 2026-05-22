# PM 週報 API：處理 PM 專案 CRUD、週報封存、歷史快照與編輯紀錄。
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from db.core import get_db
from models import ArchiveLog, ChangeLog, PMProject, PMWeeklyReport, User
from utils.auth import AuthPayload, role_required

from .serializers import (
    serialize_archive_log,
    serialize_pm_change_log,
    serialize_pm_history,
    serialize_pm_project,
)

router = APIRouter(prefix="/pm", tags=["PM Weekly Report"])

# PM 週報角色分層
PM_READ_ROLES = ("super", "boss", "pm_leader", "pm_user")
PM_WRITE_ROLES = ("super", "boss", "pm_leader", "pm_user")
PM_ARCHIVE_ROLES = ("super", "boss", "pm_leader")
PM_MANAGER_ROLES = ("super", "boss", "pm_leader")


# 新增 PM 週報專案的輸入格式，對應前端進行中工作表的一列資料。
class PMProjectCreatePayload(BaseModel):
    projectName: str = Field(..., min_length=1, max_length=255)

    # 廠商、執行時間、主管、協辦與文字欄位允許先空白後補。
    vendor: str | None = None
    executionTime: str | None = None
    manager: str | None = None
    assistants: str | None = None

    # stage 與 priority 使用固定 key，前端再轉成中文顯示。
    stage: str = "not_started"
    priority: str = "medium"

    # 週報主要填寫欄位：摘要、預計/實際執行、進度、待辦與備註。
    summary: str | None = None
    plannedExecution: str | None = None
    actualExecution: str | None = None
    lastWeekProgress: str | None = None
    thisWeekTodo: str | None = None
    notes: str | None = None

    # field_validator 只驗證單一欄位值，適合檢查 stage 是否屬於固定 key 集合。
    @field_validator("stage")
    @classmethod
    def validate_stage(cls, value: str) -> str:
        # 僅允許 PM 週報前端支援的階段 key。
        normalized = value.strip()
        if normalized not in {"not_started", "in_progress", "pending", "paused", "closed", "cancelled"}:
            raise ValueError("無效的 PM 專案階段")
        return normalized

    # priority 也使用固定 key，避免前端傳入未定義的排序/顯示值。
    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        # 僅允許 PM 週報前端支援的優先度 key。
        normalized = value.strip()
        if normalized not in {"low", "medium", "high", "urgent"}:
            raise ValueError("無效的 PM 專案優先度")
        return normalized


# 更新 PM 週報專案的輸入格式；所有欄位皆可選填，支援單欄即時儲存。
class PMProjectUpdatePayload(BaseModel):
    # 更新時 Field(None, ...) 代表欄位可省略；若有傳入則套用長度限制。
    projectName: str | None = Field(None, min_length=1, max_length=255)
    vendor: str | None = None
    executionTime: str | None = None
    manager: str | None = None
    assistants: str | None = None
    stage: str | None = None
    priority: str | None = None
    summary: str | None = None
    plannedExecution: str | None = None
    actualExecution: str | None = None
    lastWeekProgress: str | None = None
    thisWeekTodo: str | None = None
    notes: str | None = None

    @field_validator("projectName")
    @classmethod
    def validate_project_name(cls, value: str | None) -> str | None:
        # 若有更新專案名稱，不能只送空白字串。
        if value is None:
            return value
        normalized = value.strip()
        if not normalized:
            raise ValueError("缺少專案名稱")
        return normalized

    @field_validator("stage")
    @classmethod
    def validate_stage(cls, value: str | None) -> str | None:
        # 部分更新時可省略 stage；有傳入才驗證。
        if value is None:
            return value
        normalized = value.strip()
        if normalized not in {"not_started", "in_progress", "pending", "paused", "closed", "cancelled"}:
            raise ValueError("無效的 PM 專案階段")
        return normalized

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str | None) -> str | None:
        # 部分更新時可省略 priority；有傳入才驗證。
        if value is None:
            return value
        normalized = value.strip()
        if normalized not in {"low", "medium", "high", "urgent"}:
            raise ValueError("無效的 PM 專案優先度")
        return normalized


def user_id(user: AuthPayload) -> int:
    return int(user.user_id)


def can_manage_pm(user: AuthPayload) -> bool:
    return user.role_key in PM_MANAGER_ROLES


def can_access_pm_project(project: PMProject, user: AuthPayload) -> bool:
    # 單筆更新/刪除的權限判斷
    if can_manage_pm(user):
        return True
    current_user_id = user_id(user)
    return current_user_id in {
        project.owner_user_id,
        project.manager_user_id,
        project.created_by,
    }


def pm_project_query(db: Session, user: AuthPayload):
    # PM 資料範圍入口：
    # - 管理角色回傳未加條件的 PMProject query，代表可看全部資料。
    # - pm_user 只能看 PMProject.owner_user_id / manager_user_id / created_by 等於自己 user_id 的資料。
    # 這個 query 會被列表、封存與其他 PM 資料查詢共用，避免各 API 切資料規則不一致。
    query = db.query(PMProject)
    if can_manage_pm(user):
        return query
    current_user_id = user_id(user)
    return query.filter(
        (PMProject.owner_user_id == current_user_id)
        | (PMProject.manager_user_id == current_user_id)
        | (PMProject.created_by == current_user_id)
    )


def week_range() -> tuple[str, str]:
    # 封存週期以當週週一到週日為範圍。
    today = datetime.now()
    start = today - timedelta(days=today.weekday())
    end = start + timedelta(days=6)
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


def current_user_name(db: Session, user: AuthPayload) -> str:
    # 封存與編輯紀錄顯示使用者名稱；查不到時保留系統預設值。
    # filter() 會轉成 WHERE User.id = 目前使用者 id。
    active_user = db.query(User).filter(User.id == user_id(user)).first()
    return active_user.name if active_user else "系統"


# 取得 PM 專案清單，管理角色看全部，一般 PM 只看可存取專案。
@router.get("/projects")
async def get_pm_projects(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*PM_READ_ROLES)),
):
    # order_by(id.desc()) 讓最新建立的 PM 專案排在最上方。
    projects = pm_project_query(db, user).order_by(PMProject.id.desc()).all()
    return {"status": 0, "data": [serialize_pm_project(item) for item in projects]}


# 新增 PM 週報專案，建立當週可編輯的 PM 進度資料。
@router.post("/projects")
async def create_pm_project(
    payload: PMProjectCreatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*PM_WRITE_ROLES)),
):
    data = payload.model_dump()
    project_name = data["projectName"].strip()
    if not project_name:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "缺少專案名稱"})

    project = PMProject(
        # 新增者即為此週報專案的擁有者與建立者。
        project_name=project_name,
        vendor=(data.get("vendor") or "").strip(),
        execution_time=(data.get("executionTime") or "").strip(),
        manager_name=(data.get("manager") or "").strip(),
        assistants_text=(data.get("assistants") or "").strip(),
        stage=(data.get("stage") or "not_started").strip(),
        priority=(data.get("priority") or "medium").strip(),
        summary=(data.get("summary") or "").strip(),
        planned_execution=(data.get("plannedExecution") or "").strip(),
        actual_execution=(data.get("actualExecution") or "").strip(),
        last_week_progress=(data.get("lastWeekProgress") or "").strip(),
        this_week_todo=(data.get("thisWeekTodo") or "").strip(),
        notes=(data.get("notes") or "").strip(),
        owner_user_id=user_id(user),
        created_by=user_id(user),
        updated_by=user_id(user),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return {"status": 0, "data": serialize_pm_project(project)}


# 更新 PM 專案欄位，並逐欄寫入編輯紀錄。
@router.patch("/projects/{project_id:int}")
async def update_pm_project(
    project_id: int,
    payload: PMProjectUpdatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*PM_WRITE_ROLES)),
):
    project = db.query(PMProject).filter(PMProject.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail={"status": 1, "message": "找不到 PM 專案"})
    if not can_access_pm_project(project, user):
        raise HTTPException(status_code=403, detail={"status": 1, "message": "權限不足"})

    edited_by_name = current_user_name(db, user)
    # 前端欄位 key 與資料庫欄位名稱不同，這裡集中管理映射。
    field_mapping = {
        "projectName": "project_name",
        "vendor": "vendor",
        "executionTime": "execution_time",
        "manager": "manager_name",
        "assistants": "assistants_text",
        "stage": "stage",
        "priority": "priority",
        "summary": "summary",
        "plannedExecution": "planned_execution",
        "actualExecution": "actual_execution",
        "lastWeekProgress": "last_week_progress",
        "thisWeekTodo": "this_week_todo",
        "notes": "notes",
    }

    data = payload.model_dump(exclude_unset=True)

    for key, attr in field_mapping.items():
        # 只針對本次送出的欄位逐一比較與寫入 ChangeLog。
        if key not in data:
            continue
        value = data.get(key)
        if isinstance(value, str):
            value = value.strip()
        old_value = getattr(project, attr)
        if (old_value or "") == (value or ""):
            # 值未變更不寫入編輯紀錄，避免產生無意義稽核資料。
            continue

        # setattr() 依 field_mapping 動態更新 ORM 欄位，讓表格欄位共用同一段更新流程。
        setattr(project, attr, value)
        project.updated_by = user_id(user)
        db.add(
            ChangeLog(
                module_type="pm",
                record_id=project.id,
                field_key=key,
                field_label=key,
                old_value="" if old_value is None else str(old_value),
                new_value="" if value is None else str(value),
                edited_by_user_id=user_id(user),
                edited_by_name=edited_by_name,
                edited_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                owner_user_id=project.owner_user_id or project.created_by,
                department_id=project.department_id,
            )
        )

    db.add(project)
    db.commit()
    db.refresh(project)
    return {"status": 0, "data": serialize_pm_project(project)}


# 刪除尚未封存過的 PM 專案；已有歷史週報時拒絕刪除。
@router.delete("/projects/{project_id:int}")
async def delete_pm_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*PM_WRITE_ROLES)),
):
    project = db.query(PMProject).filter(PMProject.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=404, detail={"status": 1, "message": "找不到 PM 專案"})
    if not can_access_pm_project(project, user):
        raise HTTPException(status_code=403, detail={"status": 1, "message": "權限不足"})

    # 已封存過的專案不能刪除，避免歷史週報失去來源脈絡。
    has_history = db.query(PMWeeklyReport.id).filter(PMWeeklyReport.project_id == project_id).first() is not None
    if has_history:
        raise HTTPException(
            status_code=409,
            detail={"status": 1, "message": "此 PM 專案已有歷史週報，不能刪除以保留稽核資料"},
        )

    db.delete(project)
    db.commit()
    return {"status": 0, "data": {"id": project_id}}


# 封存本週 PM 週報，建立快照並重置下週填寫欄位。
@router.post("/archive")
async def archive_pm_week(
    payload: dict | None = None,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*PM_ARCHIVE_ROLES)),
):
    week_start, week_end = week_range()
    # 只封存目前資料範圍內仍在進行中的專案。
    active_items = pm_project_query(db, user).filter(PMProject.stage.notin_(["closed", "cancelled"])).all()
    project_ids = [item.id for item in active_items]
    archived_project_ids = set()
    if project_ids:
        # 同一週已封存過的專案略過，避免重複建立快照。
        archived_project_ids = {
            item.project_id
            for item in db.query(PMWeeklyReport.project_id)
            .filter(
                PMWeeklyReport.week_start_date == week_start,
                # in_() 限定只檢查本次可封存專案，避免掃描不相關資料。
                PMWeeklyReport.project_id.in_(project_ids),
            )
            .all()
        }

    archived_count = 0
    for item in active_items:
        if item.id in archived_project_ids:
            continue

        # 快照保存封存當下欄位，後續專案再修改也不影響歷史週報。
        db.add(
            PMWeeklyReport(
                project_id=item.id,
                week_start_date=week_start,
                week_end_date=week_end,
                project_name_snapshot=item.project_name,
                vendor_snapshot=item.vendor,
                summary_snapshot=item.summary,
                manager_name_snapshot=item.manager_name,
                assistants_snapshot=item.assistants_text,
                stage_snapshot=item.stage,
                priority_snapshot=item.priority,
                planned_execution_snapshot=item.planned_execution,
                last_week_progress_snapshot=item.last_week_progress,
                this_week_todo_snapshot=item.this_week_todo,
                actual_execution_snapshot=item.actual_execution,
                notes_snapshot=item.notes,
                owner_user_id=item.owner_user_id or item.created_by,
                department_id=item.department_id,
            )
        )
        # 封存後將本週實際執行帶到下週進度，並清空下週待填欄位。
        item.last_week_progress = item.actual_execution
        item.this_week_todo = ""
        item.actual_execution = ""
        db.add(item)
        archived_count += 1

    # 每次封存都留下批次紀錄，供管理者查看封存人與封存數量。
    db.add(
        ArchiveLog(
            module_type="pm",
            week_start_date=week_start,
            week_end_date=week_end,
            archived_count=archived_count,
            archived_by_user_id=user_id(user),
            archived_by_name=current_user_name(db, user),
            archived_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
    )
    db.commit()
    return {
        "status": 0,
        "data": {
            "archivedCount": archived_count,
            "weekStartDate": week_start,
            "weekEndDate": week_end,
        },
    }


# 取得 PM 歷史週報快照，依角色限制可見範圍。
@router.get("/history")
async def get_pm_history(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*PM_READ_ROLES)),
):
    query = db.query(PMWeeklyReport)
    if not can_manage_pm(user):
        # 一般 PM 歷史資料只看 PMWeeklyReport.owner_user_id 等於自己 user_id 的專案快照。
        query = query.filter(PMWeeklyReport.owner_user_id == user_id(user))
    # 歷史與紀錄類資料依 id desc 顯示最新在前。
    history = query.order_by(PMWeeklyReport.id.desc()).all()
    return {"status": 0, "data": [serialize_pm_history(item) for item in history]}


# 取得 PM 欄位編輯紀錄，供週報頁追蹤異動內容。
@router.get("/edit-logs")
async def get_pm_edit_logs(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*PM_READ_ROLES)),
):
    query = db.query(ChangeLog).filter(ChangeLog.module_type == "pm")
    if not can_manage_pm(user):
        # 一般 PM 只看 ChangeLog.owner_user_id 等於自己 user_id 的欄位異動。
        query = query.filter(ChangeLog.owner_user_id == user_id(user))
    logs = query.order_by(ChangeLog.id.desc()).all()
    project_name_map = {
        project.id: project.project_name for project in db.query(PMProject.id, PMProject.project_name).all()
    }
    data = []
    for log in logs:
        item = serialize_pm_change_log(log)
        # ChangeLog 只存 record_id，回傳前補上目前專案名稱方便前端顯示。
        item["projectName"] = project_name_map.get(log.record_id, "")
        data.append(item)
    return {"status": 0, "data": data}


# 取得 PM 週報封存操作紀錄，供管理者追蹤封存批次。
@router.get("/archive-logs")
async def get_pm_archive_logs(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required("super", "boss", "pm_leader")),
):
    logs = (
        db.query(ArchiveLog)
        .filter(ArchiveLog.module_type == "pm")
        .order_by(ArchiveLog.id.desc())
        .all()
    )
    return {"status": 0, "data": [serialize_archive_log(item) for item in logs]}
