# RD 週報 API：處理 RD 工項 CRUD、週報封存、歷史快照與編輯紀錄。
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy.orm import Session

from db.core import get_db
from models import ArchiveLog, ChangeLog, RDReport, RDWeeklyReport, User
from utils.auth import AuthPayload, role_required

from .serializers import (
    serialize_archive_log,
    serialize_rd_change_log,
    serialize_rd_history,
    serialize_rd_report,
)

router = APIRouter(prefix="/rd", tags=["RD Weekly Report"])

# RD 週報角色分層
# TODO: 角色分層可以依需求調整
RD_READ_ROLES = ("super", "boss", "rd_leader", "rd_user")
RD_WRITE_ROLES = ("super", "boss", "rd_leader", "rd_user")
RD_ARCHIVE_ROLES = ("super", "boss", "rd_leader")
RD_MANAGER_ROLES = ("super", "boss", "rd_leader")


# 新增 RD 週報工項的輸入格式，對應前端 RD 進行中工作表的一列工項。
class RDReportCreatePayload(BaseModel):
    projectName: str = Field(..., min_length=1, max_length=255)

    # 廠商、執行人與工項內容允許先空白後補。
    vendor: str | None = None
    executor: str | None = None

    # itemStatus 使用固定 key，前端再轉成中文顯示。
    itemStatus: str = "planning"
    taskName: str | None = None
    itemContent: str | None = None

    # 預計與實際日期皆以 YYYY-MM-DD 字串保存。
    plannedStart: str | None = None
    plannedEnd: str | None = None
    actualCompleted: str | None = None
    notes: str | None = None

    # field_validator 只驗證單一欄位值，適合檢查 itemStatus 是否屬於固定 key 集合。
    @field_validator("itemStatus")
    @classmethod
    def validate_item_status(cls, value: str) -> str:
        # 僅允許 RD 週報前端支援的工項狀態 key。
        normalized = value.strip()
        if normalized not in {"planning", "executing", "tracking", "confirmed_done"}:
            raise ValueError("無效的 RD 項目狀態")
        return normalized

    # model_validator(mode="after") 會在欄位型別驗證完成後，檢查 plannedStart/plannedEnd 的跨欄位規則。
    @model_validator(mode="after")
    def validate_dates(self) -> "RDReportCreatePayload":
        # 建立時若同時提供預計開始與完成日期，需符合日期順序。
        if self.plannedStart and self.plannedEnd and self.plannedStart > self.plannedEnd:
            raise ValueError("預計開始不能晚於預計完成")
        return self


# 更新 RD 週報工項的輸入格式；所有欄位皆可選填，支援單欄即時儲存。
class RDReportUpdatePayload(BaseModel):
    projectName: str | None = Field(None, min_length=1, max_length=255)
    vendor: str | None = None
    executor: str | None = None
    itemStatus: str | None = None
    taskName: str | None = None
    itemContent: str | None = None
    plannedStart: str | None = None
    plannedEnd: str | None = None
    actualCompleted: str | None = None
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

    @field_validator("itemStatus")
    @classmethod
    def validate_item_status(cls, value: str | None) -> str | None:
        # 部分更新時可省略 itemStatus；有傳入才驗證。
        if value is None:
            return value
        normalized = value.strip()
        if normalized not in {"planning", "executing", "tracking", "confirmed_done"}: # 計劃, 執行中, 追蹤中, 已確認完成
            raise ValueError("無效的 RD 項目狀態")
        return normalized


def user_id(user: AuthPayload) -> int:
    return int(user.user_id)


def can_manage_rd(user: AuthPayload) -> bool:
    return user.role_key in RD_MANAGER_ROLES


def can_access_rd_report(report: RDReport, user: AuthPayload) -> bool:
    # 單筆更新/刪除的權限判斷
    if can_manage_rd(user):
        return True
    current_user_id = user_id(user)
    return current_user_id in {
        report.executor_user_id,
        report.created_by,
    }


def rd_report_query(db: Session, user: AuthPayload):
    # RD 資料範圍入口
    query = db.query(RDReport)
    if can_manage_rd(user):
        return query
    current_user_id = user_id(user)
    return query.filter(
        (RDReport.executor_user_id == current_user_id)
        | (RDReport.created_by == current_user_id)
    )


def week_range() -> tuple[str, str]:
    # 封存週期以當週週一到週日為範圍。
    today = datetime.now()
    start = today - timedelta(days=today.weekday()) # 取得當週週一
    end = start + timedelta(days=6) # 取得當週週日
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


def current_user_name(db: Session, user: AuthPayload) -> str:
    # 封存與編輯紀錄顯示使用者名稱；查不到時保留系統預設值。
    active_user = db.query(User).filter(User.id == user_id(user)).first()
    return active_user.name if active_user else "系統"


# 取得 RD 工項清單，管理角色看全部，一般 RD 只看可存取工項。
@router.get("/reports")
async def get_rd_reports(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*RD_READ_ROLES)), # 檢查 Token 是否正確 + 角色是否正確
):
    reports = rd_report_query(db, user).order_by(RDReport.id.desc()).all()
    return {"status": 0, "data": [serialize_rd_report(item) for item in reports]}


# 新增 RD 週報工項，建立當週可編輯的 RD 執行資料。
@router.post("/reports")
async def create_rd_report(
    payload: RDReportCreatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*RD_WRITE_ROLES)),
):
    data = payload.model_dump() # 轉成 dict，方便後續取值操作
    project_name = data["projectName"].strip()
    if not project_name:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "缺少專案名稱"})

    report = RDReport(
        # 新增者即為此工項的執行者與建立者。
        vendor=(data.get("vendor") or "").strip(),
        project_name=project_name,
        executor_name=(data.get("executor") or "").strip(),
        item_status=(data.get("itemStatus") or "planning").strip(),
        task_name=(data.get("taskName") or "").strip(),
        item_content=(data.get("itemContent") or "").strip(),
        planned_start=(data.get("plannedStart") or "").strip(),
        planned_end=(data.get("plannedEnd") or "").strip(),
        actual_completed=(data.get("actualCompleted") or "").strip(),
        notes=(data.get("notes") or "").strip(),
        executor_user_id=user_id(user), 
        created_by=user_id(user), 
        updated_by=user_id(user),
    )
    # 新增時已是確認完成，立即記錄完成時間供已完成區查詢。
    report.closed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    db.add(report)
    db.commit()
    db.refresh(report)
    return {"status": 0, "data": serialize_rd_report(report)}


# 更新 RD 工項欄位，並逐欄寫入編輯紀錄。
@router.patch("/reports/{report_id:int}")
async def update_rd_report(
    report_id: int,
    payload: RDReportUpdatePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*RD_WRITE_ROLES)),
):
    report = db.query(RDReport).filter(RDReport.id == report_id).first()
    if report is None:
        raise HTTPException(status_code=404, detail={"status": 1, "message": "找不到 RD 工項"})
    if not can_access_rd_report(report, user):
        raise HTTPException(status_code=403, detail={"status": 1, "message": "權限不足"})

    edited_by_name = current_user_name(db, user)
    # 前端欄位 key 與資料庫欄位名稱不同，這裡集中管理映射。
    field_mapping = {
        "vendor": "vendor",
        "projectName": "project_name",
        "executor": "executor_name",
        "itemStatus": "item_status",
        "taskName": "task_name",
        "itemContent": "item_content",
        "plannedStart": "planned_start",
        "plannedEnd": "planned_end",
        "actualCompleted": "actual_completed",
        "notes": "notes",
    }

    data = payload.model_dump(exclude_unset=True) # 只把前端有變更的欄位轉成 dict
    next_planned_start = data.get("plannedStart", report.planned_start)
    next_planned_end = data.get("plannedEnd", report.planned_end)
    if next_planned_start and next_planned_end and next_planned_start > next_planned_end:
        # 用更新後的完整日期值檢查，涵蓋只修改單一日期的情境。
        raise HTTPException(
            status_code=400,
            detail={"status": 1, "message": "預計開始不能晚於預計完成"},
        )

    for key, attr in field_mapping.items():
        # 只針對本次送出的欄位逐一比較與寫入 ChangeLog。
        if key not in data:
            continue
        value = data.get(key)
        if isinstance(value, str):
            value = value.strip()
        old_value = getattr(report, attr) # getattr(report, attr) 等同 report.attr
        if (old_value or "") == (value or ""):
            # 值未變更不寫入編輯紀錄
            continue

        setattr(report, attr, value) # setattr(report, attr, value) 等同 report.attr = value
        report.updated_by = user_id(user)
        db.add(
            ChangeLog(
                module_type="rd",
                record_id=report.id,
                field_key=key,
                field_label=key,
                old_value="" if old_value is None else str(old_value),
                new_value="" if value is None else str(value),
                edited_by_user_id=user_id(user),
                edited_by_name=edited_by_name,
                edited_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                owner_user_id=report.executor_user_id,
                department_id=report.department_id,
            )
        )

    if "itemStatus" in data:
        # 切到 confirmed_done 時記錄完成時間；切回其他狀態則清除。
        if report.item_status == "confirmed_done":
            report.closed_at = report.closed_at or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        else:
            report.closed_at = None

    db.add(report)
    db.commit()
    db.refresh(report)
    return {"status": 0, "data": serialize_rd_report(report)}


# 刪除尚未封存過的 RD 工項；已有歷史週報時拒絕刪除。
@router.delete("/reports/{report_id:int}")
async def delete_rd_report(
    report_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*RD_WRITE_ROLES)),
):
    report = db.query(RDReport).filter(RDReport.id == report_id).first()
    if report is None:
        raise HTTPException(status_code=404, detail={"status": 1, "message": "找不到 RD 工項"})
    if not can_access_rd_report(report, user):
        raise HTTPException(status_code=403, detail={"status": 1, "message": "權限不足"})

    # 已封存過的工項不能刪除，避免歷史週報失去來源脈絡。
    has_history = db.query(RDWeeklyReport.id).filter(RDWeeklyReport.report_id == report_id).first() is not None
    if has_history:
        raise HTTPException(
            status_code=409,
            detail={"status": 1, "message": "此 RD 工項已有歷史週報，不能刪除以保留稽核資料"},
        )

    db.delete(report)
    db.commit()
    return {"status": 0, "data": {"id": report_id}}


# 封存本週 RD 週報，建立快照並重置下週填寫欄位。
@router.post("/archive")
async def archive_rd_week(
    payload: dict | None = None,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*RD_ARCHIVE_ROLES)),
):
    week_start, week_end = week_range()
    # 只封存尚未確認完成的工項。
    active_items = rd_report_query(db, user).filter(RDReport.item_status != "confirmed_done").all()
    report_ids = [item.id for item in active_items]
    archived_report_ids = set()
    if report_ids:
        # 同一週已封存過的工項略過，避免重複建立快照。
        archived_report_ids = {
            item.report_id
            for item in db.query(RDWeeklyReport.report_id)
            .filter(
                RDWeeklyReport.week_start_date == week_start,
                # in_() 限定只檢查本次可封存工項，避免掃描不相關資料。
                RDWeeklyReport.report_id.in_(report_ids), # [1, 2, 3, 4, 5]
            )
            .all()
        }

    archived_count = 0
    for item in active_items:
        if item.id in archived_report_ids:
            continue

        # 快照保存封存當下欄位，後續工項再修改也不影響歷史週報。
        db.add(
            RDWeeklyReport(
                report_id=item.id,
                week_start_date=week_start,
                week_end_date=week_end,
                vendor_snapshot=item.vendor,
                project_name_snapshot=item.project_name,
                executor_name_snapshot=item.executor_name,
                item_status_snapshot=item.item_status,
                task_name_snapshot=item.task_name,
                item_content_snapshot=item.item_content,
                planned_start_snapshot=item.planned_start,
                planned_end_snapshot=item.planned_end,
                actual_completed_snapshot=item.actual_completed,
                notes_snapshot=item.notes,
                executor_user_id=item.executor_user_id or item.created_by,
                department_id=item.department_id,
            )
        )
        # 封存後清空下週需重新填寫的實際完成與備註欄位。
        item.actual_completed = ""
        item.notes = ""
        db.add(item)
        archived_count += 1

    # 每次封存都留下批次紀錄，供管理者查看封存人與封存數量。
    db.add(
        ArchiveLog(
            module_type="rd",
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


# 取得 RD 歷史週報快照，依角色限制可見範圍。
@router.get("/history")
async def get_rd_history(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*RD_READ_ROLES)),
):
    query = db.query(RDWeeklyReport)
    if not can_manage_rd(user):
        # 一般 RD 歷史資料只看 RDWeeklyReport.executor_user_id 等於自己 user_id 的工項快照。
        query = query.filter(RDWeeklyReport.executor_user_id == user_id(user))
    # 歷史與紀錄類資料依 id desc 顯示最新在前。
    history = query.order_by(RDWeeklyReport.id.desc()).all()
    return {"status": 0, "data": [serialize_rd_history(item) for item in history]}


# 取得 RD 欄位編輯紀錄，供週報頁追蹤異動內容。
@router.get("/edit-logs")
async def get_rd_edit_logs(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*RD_READ_ROLES)),
):
    query = db.query(ChangeLog).filter(ChangeLog.module_type == "rd")
    if not can_manage_rd(user):
        # 一般 RD 只看 ChangeLog.owner_user_id 等於自己 user_id 的欄位異動。
        query = query.filter(ChangeLog.owner_user_id == user_id(user))
    logs = query.order_by(ChangeLog.id.desc()).all()
    report_name_map = {
        report.id: f"{report.project_name} / {report.task_name or '未命名工項'}"
        for report in db.query(RDReport.id, RDReport.project_name, RDReport.task_name).all()
    }
    data = []
    for log in logs:
        item = serialize_rd_change_log(log)
        # ChangeLog 只存 record_id，回傳前補上專案與工項名稱方便前端顯示。
        item["projectName"] = report_name_map.get(log.record_id, "")
        data.append(item)
    return {"status": 0, "data": data}


# 取得 RD 週報封存操作紀錄，供管理者追蹤封存批次。
@router.get("/archive-logs")
async def get_rd_archive_logs(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*RD_ARCHIVE_ROLES)),
):
    logs = (
        db.query(ArchiveLog)
        .filter(ArchiveLog.module_type == "rd")
        .order_by(ArchiveLog.id.desc())
        .all()
    )
    return {"status": 0, "data": [serialize_archive_log(item) for item in logs]}
