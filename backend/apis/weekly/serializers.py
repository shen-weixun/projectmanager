# Weekly Serializer：將 PM/RD 週報 ORM 與紀錄 ORM 轉成前端需要的 JSON。
from models import ArchiveLog, ChangeLog, PMProject, PMWeeklyReport, RDReport, RDWeeklyReport


def serialize_pm_project(project: PMProject) -> dict:
    # 將 PMProject ORM 轉成前端 PM 工作表使用的 camelCase 欄位。
    return {
        "id": project.id,
        "projectName": project.project_name,
        "vendor": project.vendor or "",
        "executionTime": project.execution_time or "",
        "manager": project.manager_name or "",
        "assistants": project.assistants_text or "",
        "stage": project.stage,
        "priority": project.priority,
        "summary": project.summary or "",
        "plannedExecution": project.planned_execution or "",
        "actualExecution": project.actual_execution or "",
        "lastWeekProgress": project.last_week_progress or "",
        "thisWeekTodo": project.this_week_todo or "",
        "notes": project.notes or "",
        "createdAt": project.created_at.isoformat() if project.created_at else "",
        "updatedAt": project.updated_at.isoformat() if project.updated_at else "",
        "closedAt": project.closed_at,
        "cancelledAt": project.cancelled_at,
    }


def serialize_pm_history(report: PMWeeklyReport) -> dict:
    # PM 歷史資料為封存當下快照，不再回頭讀目前專案欄位。
    return {
        "id": report.id,
        "projectId": report.project_id,
        "projectName": report.project_name_snapshot,
        "vendor": report.vendor_snapshot or "",
        "manager": report.manager_name_snapshot or "",
        "weekStartDate": report.week_start_date,
        "weekEndDate": report.week_end_date,
        "lastWeekProgress": report.last_week_progress_snapshot or "",
        "thisWeekTodo": report.this_week_todo_snapshot or "",
        "notes": report.notes_snapshot or "",
        "stageSnapshot": report.stage_snapshot,
        "prioritySnapshot": report.priority_snapshot,
        "summarySnapshot": report.summary_snapshot or "",
        "plannedExecutionSnapshot": report.planned_execution_snapshot or "",
        "actualExecutionSnapshot": report.actual_execution_snapshot or "",
        "createdAt": report.created_at.isoformat() if report.created_at else "",
    }


def serialize_rd_report(report: RDReport) -> dict:
    # 將 RDReport ORM 轉成前端 RD 工作表使用的 camelCase 欄位。
    return {
        "id": report.id,
        "vendor": report.vendor or "",
        "projectName": report.project_name,
        "executor": report.executor_name or "",
        "itemStatus": report.item_status,
        "taskName": report.task_name or "",
        "itemContent": report.item_content or "",
        "plannedStart": report.planned_start or "",
        "plannedEnd": report.planned_end or "",
        "actualCompleted": report.actual_completed or "",
        "notes": report.notes or "",
        "closedAt": report.closed_at,
        "cancelledAt": None,
        "createdAt": report.created_at.isoformat() if report.created_at else "",
        "updatedAt": report.updated_at.isoformat() if report.updated_at else "",
    }


def serialize_rd_history(report: RDWeeklyReport) -> dict:
    # RD 歷史資料為封存當下快照，不再回頭讀目前工項欄位。
    return {
        "id": report.id,
        "reportId": report.report_id,
        "vendor": report.vendor_snapshot or "",
        "projectName": report.project_name_snapshot,
        "executor": report.executor_name_snapshot or "",
        "weekStartDate": report.week_start_date,
        "weekEndDate": report.week_end_date,
        "itemStatusSnapshot": report.item_status_snapshot,
        "taskNameSnapshot": report.task_name_snapshot or "",
        "itemContentSnapshot": report.item_content_snapshot or "",
        "plannedStartSnapshot": report.planned_start_snapshot or "",
        "plannedEndSnapshot": report.planned_end_snapshot or "",
        "actualCompletedSnapshot": report.actual_completed_snapshot or "",
        "notesSnapshot": report.notes_snapshot or "",
        "createdAt": report.created_at.isoformat() if report.created_at else "",
    }


def serialize_pm_change_log(log: ChangeLog) -> dict:
    # PM 編輯紀錄使用 projectId，專案名稱由查詢端依 record_id 補上。
    return {
        "id": log.id,
        "projectId": log.record_id,
        "projectName": "",
        "fieldKey": log.field_key,
        "fieldLabel": log.field_label,
        "oldValue": log.old_value or "",
        "newValue": log.new_value or "",
        "editedByName": log.edited_by_name or "系統",
        "editedAt": log.edited_at,
    }


def serialize_rd_change_log(log: ChangeLog) -> dict:
    # RD 編輯紀錄使用 reportId，工項名稱由查詢端依 record_id 補上。
    return {
        "id": log.id,
        "reportId": log.record_id,
        "projectName": "",
        "fieldKey": log.field_key,
        "fieldLabel": log.field_label,
        "oldValue": log.old_value or "",
        "newValue": log.new_value or "",
        "editedByName": log.edited_by_name or "系統",
        "editedAt": log.edited_at,
    }


def serialize_archive_log(log: ArchiveLog) -> dict:
    # PM/RD 共用封存紀錄格式，提供封存人員、時間、週次與筆數。
    return {
        "id": log.id,
        "archivedByName": log.archived_by_name or "系統",
        "archivedAt": log.archived_at,
        "weekRange": f"{log.week_start_date} ~ {log.week_end_date}",
        "archivedCount": log.archived_count,
    }
