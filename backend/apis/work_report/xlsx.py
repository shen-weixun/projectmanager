import io
import re
import zipfile
import xml.etree.ElementTree as ET
from html import escape
from typing import Any

from fastapi import HTTPException


XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
WORK_REPORT_META_HEADERS = ["使用者", "表格名稱"]


def column_name(index: int) -> str:
    name = ""
    value = index + 1
    while value:
        value, remainder = divmod(value - 1, 26)
        name = chr(ord("A") + remainder) + name
    return name


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
    relation_id = (
        first_sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
        if first_sheet is not None
        else None
    )
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
        raise HTTPException(status_code=400, detail={"status": 1, "message": "XLSX 檔案格式不正確"}) from exc

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


def xlsx_cell(row_index: int, column_index: int, value: Any) -> str:
    cell_ref = f"{column_name(column_index)}{row_index}"
    text = escape(str(value if value is not None else ""), quote=False)
    return f'<c r="{cell_ref}" t="inlineStr"><is><t xml:space="preserve">{text}</t></is></c>'


def build_xlsx_bytes(sheet_name: str, headers: list[str], rows: list[list[str]]) -> bytes:
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
    workbook_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="{escape(sheet_name[:31], quote=True)}" sheetId="1" r:id="rId1"/></sheets>
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


def build_work_report_xlsx_rows(blocks: list[dict[str, Any]], data_headers: list[str]) -> list[list[str]]:
    rows: list[list[str]] = []
    for block in blocks:
        for table in block.get("tables", []):
            table_rows = (table.get("table_data") or {}).get("rows") or []
            for row in table_rows:
                rows.append([
                    str(block.get("user_name", "")),
                    str(table.get("table_name", "")),
                    *[str((row or {}).get(header, "") or "") for header in data_headers],
                ])
    return rows


def parse_work_report_xlsx_tables(content: bytes, data_headers: list[str]) -> list[dict[str, Any]]:
    rows = read_xlsx_rows(content)
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "XLSX 需要標題列與至少一筆資料"})

    imported_headers = [header.strip() for header in rows[0]]
    table_name_index = imported_headers.index("表格名稱") if "表格名稱" in imported_headers else -1
    header_index = {header: imported_headers.index(header) for header in data_headers if header in imported_headers}
    if not header_index:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "XLSX 欄位與目前工作紀錄欄位不相符"})

    grouped: dict[str, list[dict[str, str]]] = {}
    for row in rows[1:1001]:
        table_name = row[table_name_index].strip() if 0 <= table_name_index < len(row) else "匯入資料"
        table_name = table_name or "匯入資料"
        data_row = {
            header: (row[index].strip() if index < len(row) else "")
            for header, index in header_index.items()
        }
        normalized_row = {header: data_row.get(header, "") for header in data_headers}
        if not any(normalized_row.values()):
            continue
        grouped.setdefault(table_name, []).append(normalized_row)

    if not grouped:
        raise HTTPException(status_code=400, detail={"status": 1, "message": "XLSX 沒有可匯入的資料"})

    return [
        {
            "table_name": table_name[:100],
            "table_data": {"headers": data_headers, "rows": table_rows},
        }
        for table_name, table_rows in grouped.items()
    ]
