import base64
import io
import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime
from html import escape
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.core import get_db
from models import LeadCase, LeadField
from utils.auth import AuthPayload, role_required

router = APIRouter(prefix="/lead-management", tags=["Lead Management"])

LEAD_READ_ROLES = ("super", "boss", "pm_leader", "pm_user")
LEAD_MANAGER_ROLES = ("super", "boss")
VALID_FIELD_TYPES = {"text", "select", "cascade_select", "date", "textarea"}
VALID_OPTION_COLORS = {"slate", "red", "orange", "yellow", "green", "blue", "purple", "rose"}

DEFAULT_FIELDS = [
    {"label": "客戶名稱", "field_type": "text", "options": [], "sort_order": 0, "is_required": True},
    {
        "label": "洽案狀態",
        "field_type": "select",
        "options": [
            {"value": "初談", "color": "slate"},
            {"value": "評估中", "color": "blue"},
            {"value": "已提案", "color": "purple"},
            {"value": "已轉專案", "color": "green"},
            {"value": "暫緩", "color": "orange"},
        ],
        "sort_order": 1,
        "is_required": True,
    },
    {"label": "負責 PM", "field_type": "text", "options": [], "sort_order": 2, "is_required": False},
    {"label": "預計啟動日", "field_type": "date", "options": [], "sort_order": 3, "is_required": False},
    {"label": "備註", "field_type": "textarea", "options": [], "sort_order": 4, "is_required": False},
]


class LeadFieldPayload(BaseModel):
    label: str = Field(..., min_length=1, max_length=100)
    fieldType: str = "text"
    options: list[Any] = Field(default_factory=list)
    sortOrder: int | None = None
    isRequired: bool = False
    isManagerOnly: bool = False
    isRepeatable: bool = False
    isActive: bool = True


class LeadCasePayload(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)


class LeadCasesImportPayload(BaseModel):
    items: list[LeadCasePayload] = Field(default_factory=list, max_length=1000)


class LeadCasesXlsxImportPayload(BaseModel):
    filename: str | None = None
    contentBase64: str = Field(..., min_length=1)


def normalize_option_color(color: Any) -> str:
    color_key = str(color or "slate").strip().lower()
    return color_key if color_key in VALID_OPTION_COLORS else "slate"


def clean_options(raw_options: list[Any] | None) -> list[dict[str, str]]:
    seen: set[str] = set()
    result: list[dict[str, str]] = []
    for raw in raw_options or []:
        if isinstance(raw, str):
            value = raw.strip()
            color = "slate"
        elif isinstance(raw, dict):
            value = str(raw.get("value", "")).strip()
            color = normalize_option_color(raw.get("color"))
        else:
            value = str(getattr(raw, "value", "")).strip()
            color = normalize_option_color(getattr(raw, "color", "slate"))

        if not value or value in seen:
            continue
        seen.add(value)
        result.append({
            "value": value,
            "color": color,
            "children": clean_options(raw.get("children")) if isinstance(raw, dict) else [],
        })
    return result


def option_values(options: list[Any] | None) -> set[str]:
    return {option["value"] for option in clean_options(options)}


def cascade_option_values(options: list[Any] | None) -> set[str]:
    values: set[str] = set()
    for option in clean_options(options):
        parent = option["value"]
        for child in option.get("children", []):
            values.add(f"{parent} / {child['value']}")
    return values


def is_manager(user: AuthPayload) -> bool:
    return user.role_key in LEAD_MANAGER_ROLES


def serialize_field(field: LeadField) -> dict[str, Any]:
    return {
        "id": field.id,
        "label": field.label,
        "fieldType": field.field_type,
        "options": clean_options(field.options),
        "sortOrder": field.sort_order,
        "isRequired": bool(field.is_required),
        "isManagerOnly": bool(field.is_manager_only),
        "isRepeatable": bool(field.is_repeatable),
        "isActive": bool(field.is_active),
    }


def serialize_case(case: LeadCase) -> dict[str, Any]:
    return {
        "id": case.id,
        "data": case.data or {},
        "createdAt": case.created_at.isoformat() if case.created_at else None,
        "updatedAt": case.updated_at.isoformat() if case.updated_at else None,
    }


def ensure_default_fields(db: Session) -> None:
    if db.query(LeadField).count() > 0:
        return
    for field in DEFAULT_FIELDS:
        db.add(LeadField(**field))
    db.commit()


def validate_field_payload(payload: LeadFieldPayload) -> tuple[str, str, list[dict[str, str]]]:
    label = payload.label.strip()
    field_type = payload.fieldType.strip()
    if field_type not in VALID_FIELD_TYPES:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "欄位型態不正確"})
    options = clean_options(payload.options)
    if field_type in {"select", "cascade_select"} and not options:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "下拉選單至少需要一個選項"})
    if field_type == "cascade_select":
        if not any(option.get("children") for option in options):
            raise HTTPException(status_code=400, detail={"status": 1, "message": "2層下拉選單至少需要一個第二層選項"})
    if field_type not in {"select", "cascade_select"}:
        options = []
    return label, field_type, options


def active_fields(db: Session) -> list[LeadField]:
    ensure_default_fields(db)
    return (
        db.query(LeadField)
        .filter(LeadField.is_active.is_(True))
        .order_by(LeadField.sort_order.asc(), LeadField.id.asc())
        .all()
    )


def clean_case_value(raw_value: Any, repeatable: bool) -> str | list[str]:
    if repeatable:
        raw_items = raw_value if isinstance(raw_value, list) else [raw_value]
        return [str(item).strip() for item in raw_items if str(item or "").strip()]
    return str(raw_value if raw_value is not None else "").strip()


def case_value_has_content(value: str | list[str]) -> bool:
    if isinstance(value, list):
        return any(str(item).strip() for item in value)
    return bool(str(value).strip())


def case_value_items(value: str | list[str]) -> list[str]:
    if isinstance(value, list):
        return value
    return [value] if value else []


def cell_ref_to_column_index(cell_ref: str) -> int:
    match = re.match(r"([A-Z]+)", cell_ref.upper())
    if not match:
        return 0
    index = 0
    for char in match.group(1):
        index = index * 26 + (ord(char) - ord("A") + 1)
    return index - 1


def text_from_element(element: ET.Element, namespace: dict[str, str]) -> str:
    return "".join(node.text or "" for node in element.findall(".//main:t", namespace)).strip()


def read_shared_strings(archive: zipfile.ZipFile, namespace: dict[str, str]) -> list[str]:
    try:
        root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return [text_from_element(item, namespace) for item in root.findall("main:si", namespace)]


def first_worksheet_path(archive: zipfile.ZipFile, namespace: dict[str, str]) -> str:
    fallback = "xl/worksheets/sheet1.xml"
    try:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    except KeyError:
        return fallback

    first_sheet = workbook.find("main:sheets/main:sheet", namespace)
    relation_id = first_sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id") if first_sheet is not None else None
    if not relation_id:
        return fallback

    rel_namespace = {"rel": "http://schemas.openxmlformats.org/package/2006/relationships"}
    for relation in rels.findall("rel:Relationship", rel_namespace):
        if relation.attrib.get("Id") == relation_id:
            target = relation.attrib.get("Target", "")
            if target.startswith("/"):
                return target.lstrip("/")
            return f"xl/{target}".replace("xl/worksheets/../", "xl/")
    return fallback


def read_xlsx_rows(content: bytes) -> list[list[str]]:
    namespace = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            shared_strings = read_shared_strings(archive, namespace)
            worksheet = ET.fromstring(archive.read(first_worksheet_path(archive, namespace)))
    except (zipfile.BadZipFile, KeyError, ET.ParseError) as exc:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "Invalid XLSX file"}) from exc

    rows: list[list[str]] = []
    for row in worksheet.findall(".//main:sheetData/main:row", namespace):
        cells: list[str] = []
        for cell in row.findall("main:c", namespace):
            column_index = cell_ref_to_column_index(cell.attrib.get("r", ""))
            while len(cells) <= column_index:
                cells.append("")

            cell_type = cell.attrib.get("t")
            if cell_type == "inlineStr":
                value = text_from_element(cell, namespace)
            else:
                raw_value = (cell.findtext("main:v", default="", namespaces=namespace) or "").strip()
                if cell_type == "s" and raw_value:
                    try:
                        shared_index = int(raw_value)
                    except ValueError:
                        shared_index = -1
                    value = shared_strings[shared_index] if 0 <= shared_index < len(shared_strings) else ""
                elif cell_type == "b":
                    value = "TRUE" if raw_value == "1" else "FALSE"
                else:
                    value = raw_value
            cells[column_index] = value

        trimmed = [cell.strip() for cell in cells]
        if any(trimmed):
            rows.append(trimmed)
    return rows


def build_case_data_from_import_row(fields: list[LeadField], headers: list[str], row: list[str]) -> dict[str, Any]:
    row_by_header = {header: row[index] if index < len(row) else "" for index, header in enumerate(headers)}
    data: dict[str, Any] = {}
    for field in fields:
        raw_value = str(row_by_header.get(field.label, "") or "").strip()
        if field.is_repeatable:
            data[field.label] = [value.strip() for value in raw_value.split(";") if value.strip()]
        else:
            data[field.label] = raw_value
    return data


def column_name(index: int) -> str:
    name = ""
    value = index + 1
    while value:
        value, remainder = divmod(value - 1, 26)
        name = chr(ord("A") + remainder) + name
    return name


def xlsx_cell(row_index: int, column_index: int, value: Any) -> str:
    cell_ref = f"{column_name(column_index)}{row_index}"
    text = escape(str(value if value is not None else ""), quote=False)
    return f'<c r="{cell_ref}" t="inlineStr"><is><t xml:space="preserve">{text}</t></is></c>'


def build_xlsx_bytes(headers: list[str], rows: list[list[str]]) -> bytes:
    sheet_rows = []
    for row_index, row in enumerate([headers, *rows], start=1):
        cells = "".join(xlsx_cell(row_index, column_index, value) for column_index, value in enumerate(row))
        sheet_rows.append(f'<row r="{row_index}">{cells}</row>')

    dimension = f"A1:{column_name(max(len(headers), 1) - 1)}{max(len(rows) + 1, 1)}"
    worksheet_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="{dimension}"/>
  <sheetData>{''.join(sheet_rows)}</sheetData>
</worksheet>'''
    workbook_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Lead Cases" sheetId="1" r:id="rId1"/></sheets>
</workbook>'''
    workbook_rels_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>'''
    root_rels_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>'''
    content_types_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>'''

    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types_xml)
        archive.writestr("_rels/.rels", root_rels_xml)
        archive.writestr("xl/workbook.xml", workbook_xml)
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_rels_xml)
        archive.writestr("xl/worksheets/sheet1.xml", worksheet_xml)
    return output.getvalue()


def clean_case_data(
    db: Session,
    data: dict[str, Any],
    *,
    can_edit_manager_only: bool,
    existing_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    fields = active_fields(db)
    labels = {field.label for field in fields}
    field_by_label = {field.label: field for field in fields}
    cleaned = {
        label: clean_case_value(data.get(label, "") if data else "", field_by_label[label].is_repeatable)
        for label in labels
    }
    for field in fields:
        if field.is_manager_only and not can_edit_manager_only:
            cleaned[field.label] = clean_case_value((existing_data or {}).get(field.label, ""), field.is_repeatable)
            continue
        if field.is_required and not case_value_has_content(cleaned.get(field.label, "")):
            raise HTTPException(status_code=400, detail={"status": 1, "message": f"{field.label} 為必填欄位"})
        if field.field_type in {"select", "cascade_select"}:
            valid_values = cascade_option_values(field.options) if field.field_type == "cascade_select" else option_values(field.options)
            for item in case_value_items(cleaned.get(field.label, "")):
                if item and item not in valid_values:
                    raise HTTPException(status_code=400, detail={"status": 1, "message": f"{field.label} 的選項不正確"})
    return cleaned


@router.get("/fields")
async def get_lead_fields(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*LEAD_READ_ROLES)),
):
    ensure_default_fields(db)
    fields = (
        db.query(LeadField)
        .order_by(LeadField.sort_order.asc(), LeadField.id.asc())
        .all()
    )
    return {
        "status": 0,
        "data": {
            "fields": [serialize_field(field) for field in fields],
            "canEditFields": user.role_key in LEAD_MANAGER_ROLES,
        },
    }


@router.post("/fields")
async def create_lead_field(
    payload: LeadFieldPayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*LEAD_MANAGER_ROLES)),
):
    label, field_type, options = validate_field_payload(payload)
    exists = db.query(LeadField).filter(LeadField.label == label).first()
    if exists:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "欄位名稱已存在"})
    sort_order = payload.sortOrder
    if sort_order is None:
        sort_order = db.query(LeadField).count()
    field = LeadField(
        label=label,
        field_type=field_type,
        options=options,
        sort_order=sort_order,
        is_required=payload.isRequired,
        is_manager_only=payload.isManagerOnly,
        is_repeatable=payload.isRepeatable,
        is_active=payload.isActive,
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return {"status": 0, "data": serialize_field(field)}


@router.patch("/fields/{field_id}")
async def update_lead_field(
    field_id: int,
    payload: LeadFieldPayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*LEAD_MANAGER_ROLES)),
):
    field = db.query(LeadField).filter(LeadField.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail={"status": 1, "message": "找不到欄位"})

    label, field_type, options = validate_field_payload(payload)
    exists = db.query(LeadField).filter(LeadField.label == label, LeadField.id != field_id).first()
    if exists:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "欄位名稱已存在"})

    field.label = label
    field.field_type = field_type
    field.options = options
    if payload.sortOrder is not None:
        field.sort_order = payload.sortOrder
    field.is_required = payload.isRequired
    field.is_manager_only = payload.isManagerOnly
    field.is_repeatable = payload.isRepeatable
    field.is_active = payload.isActive
    db.add(field)
    db.commit()
    db.refresh(field)
    return {"status": 0, "data": serialize_field(field)}


@router.delete("/fields/{field_id}")
async def delete_lead_field(
    field_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*LEAD_MANAGER_ROLES)),
):
    field = db.query(LeadField).filter(LeadField.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail={"status": 1, "message": "找不到欄位"})
    db.delete(field)
    db.commit()
    return {"status": 0, "data": {"id": field_id}}


@router.get("/cases")
async def list_lead_cases(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*LEAD_READ_ROLES)),
):
    ensure_default_fields(db)
    cases = db.query(LeadCase).order_by(LeadCase.updated_at.desc(), LeadCase.id.desc()).all()
    return {"status": 0, "data": [serialize_case(case) for case in cases]}


@router.get("/cases/export-xlsx")
async def export_lead_cases_xlsx(
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*LEAD_READ_ROLES)),
):
    fields = active_fields(db)
    cases = db.query(LeadCase).order_by(LeadCase.updated_at.desc(), LeadCase.id.desc()).all()
    headers = [field.label for field in fields]
    rows = []
    for case in cases:
        data = case.data or {}
        row = []
        for field in fields:
            value = data.get(field.label, "")
            row.append("; ".join(str(item) for item in value) if isinstance(value, list) else str(value or ""))
        rows.append(row)

    filename = f"lead-management-{datetime.now().strftime('%Y-%m-%d')}.xlsx"
    return Response(
        content=build_xlsx_bytes(headers, rows),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/cases")
async def create_lead_case(
    payload: LeadCasePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*LEAD_READ_ROLES)),
):
    case = LeadCase(
        data=clean_case_data(
            db,
            payload.data,
            can_edit_manager_only=is_manager(user),
            existing_data={},
        ),
        created_by=int(user.user_id),
        updated_by=int(user.user_id),
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return {"status": 0, "data": serialize_case(case)}


@router.post("/cases/import")
async def import_lead_cases(
    payload: LeadCasesImportPayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*LEAD_READ_ROLES)),
):
    if not payload.items:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "匯入資料不可為空"})

    created_cases: list[LeadCase] = []
    can_edit_manager_only = is_manager(user)
    for item in payload.items:
        case = LeadCase(
            data=clean_case_data(
                db,
                item.data,
                can_edit_manager_only=can_edit_manager_only,
                existing_data={},
            ),
            created_by=int(user.user_id),
            updated_by=int(user.user_id),
        )
        db.add(case)
        created_cases.append(case)

    db.commit()
    for case in created_cases:
        db.refresh(case)

    return {
        "status": 0,
        "data": {
            "createdCount": len(created_cases),
            "items": [serialize_case(case) for case in created_cases],
        },
    }


@router.post("/cases/import-xlsx")
async def import_lead_cases_from_xlsx(
    payload: LeadCasesXlsxImportPayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*LEAD_READ_ROLES)),
):
    try:
        content = base64.b64decode(payload.contentBase64, validate=True)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "Invalid XLSX content"}) from exc

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "XLSX file is too large"})

    rows = read_xlsx_rows(content)
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "XLSX needs a header row and at least one data row"})

    headers = [header.strip() for header in rows[0]]
    fields = active_fields(db)
    known_headers = {field.label for field in fields}
    if not any(header in known_headers for header in headers):
        raise HTTPException(status_code=400, detail={"status": 1, "message": "XLSX headers do not match lead fields"})

    created_cases: list[LeadCase] = []
    can_edit_manager_only = is_manager(user)
    for row in rows[1:1001]:
        data = build_case_data_from_import_row(fields, headers, row)
        if not any(case_value_has_content(value) for value in data.values()):
            continue
        case = LeadCase(
            data=clean_case_data(
                db,
                data,
                can_edit_manager_only=can_edit_manager_only,
                existing_data={},
            ),
            created_by=int(user.user_id),
            updated_by=int(user.user_id),
        )
        db.add(case)
        created_cases.append(case)

    if not created_cases:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "XLSX has no importable rows"})

    db.commit()
    for case in created_cases:
        db.refresh(case)

    return {
        "status": 0,
        "data": {
            "createdCount": len(created_cases),
            "items": [serialize_case(case) for case in created_cases],
        },
    }


@router.patch("/cases/{case_id}")
async def update_lead_case(
    case_id: int,
    payload: LeadCasePayload,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*LEAD_READ_ROLES)),
):
    case = db.query(LeadCase).filter(LeadCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail={"status": 1, "message": "找不到洽案"})
    case.data = clean_case_data(
        db,
        payload.data,
        can_edit_manager_only=is_manager(user),
        existing_data=case.data or {},
    )
    case.updated_by = int(user.user_id)
    db.add(case)
    db.commit()
    db.refresh(case)
    return {"status": 0, "data": serialize_case(case)}


@router.delete("/cases/{case_id}")
async def delete_lead_case(
    case_id: int,
    db: Session = Depends(get_db),
    user: AuthPayload = Depends(role_required(*LEAD_READ_ROLES)),
):
    case = db.query(LeadCase).filter(LeadCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail={"status": 1, "message": "找不到洽案"})
    db.delete(case)
    db.commit()
    return {"status": 0, "data": {"id": case_id}}
