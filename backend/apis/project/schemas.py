# Project API Schema：定義專案主檔、選項與子資源請求 payload。
from pydantic import BaseModel, Field, model_validator


# 自訂欄位格式：讓前端可在專案主檔中追加任意標籤與內容。
class CustomFieldSchema(BaseModel):
    # 前端產生的識別值；後端目前以 JSON 原樣保存，不另外建立資料表。
    id: str = ""

    # 自訂欄位顯示名稱，例如合約編號、特殊需求。
    label: str = ""

    # 自訂欄位內容。
    value: str = ""


class CustomTableColumnSchema(BaseModel):
    id: str = ""
    label: str = ""


class CustomTableSchema(BaseModel):
    id: str = ""
    title: str = ""
    columns: list[CustomTableColumnSchema] = Field(default_factory=list)
    rows: list[dict[str, str]] = Field(default_factory=list)


# 專案時程項目格式：供專案詳情頁的時程表與甘特圖使用。
class ScheduleItemSchema(BaseModel):
    # 新增時可省略；更新或回傳時會帶資料庫 id。
    id: int | str | None = None

    # 時程名稱，建立時由 ScheduleCreatePayload 強制不可空。
    name: str | None = None

    # 此時程負責人，允許空白代表尚未指派。
    assignee: str | None = None

    # 起訖日期使用前端傳入的 YYYY-MM-DD 字串。
    startDate: str | None = None
    endDate: str | None = None

    # 沿用專案狀態選項，預設為尚未開始。
    status: str = "尚未開始"

    @model_validator(mode="after")
    def validate_dates(self) -> "ScheduleItemSchema":
        # 避免甘特圖出現反向時程。
        if self.startDate and self.endDate and self.startDate > self.endDate:
            raise ValueError("時程開始時間不能晚於結束時間")
        return self


# 專案待辦項目格式：描述專案內部需完成事項。
class TodoItemSchema(BaseModel):
    id: int | str | None = None

    # 待辦內容，建立時由 TodoCreatePayload 強制不可空。
    item: str | None = None

    # 待辦負責人與狀態允許先空白，方便逐步補資料。
    assignee: str | None = None
    status: str = "尚未開始"

    # 期限與備註皆為選填。
    dueDate: str | None = None
    note: str | None = None


# 專案查核點格式：記錄查核項目、日期、負責人與詳細描述。
class CheckpointItemSchema(BaseModel):
    id: int | str | None = None

    # 查核點名稱，建立時由 CheckpointCreatePayload 強制不可空。
    checkpoint: str | None = None

    # 查核日期、負責人、簡短備註與詳細說明皆可後補。
    reviewDate: str | None = None
    assignee: str | None = None
    status: str = "尚未開始"
    note: str | None = None
    description: str | None = None


# 建立專案主檔的輸入格式
# 建立時專案名稱必填，其餘欄位允許先空白以符合前端新增流程。
class ProjectCreatePayload(BaseModel):
    # Field(...) 代表必填；min/max_length 會由 Pydantic 在進入 API 前先驗證。
    name: str = Field(..., min_length=1, max_length=255)

    # 客戶、類別、組別與負責人會寫入專案主檔，供列表篩選與詳情顯示。
    customer: str = ""
    category: str = ""
    group: str = ""
    projectOwner: str = ""

    # 專案狀態與三種日期供列表排序、甘特圖與詳情頁使用。
    status: str = "尚未開始"
    startDate: str = ""
    preStartDate: str = ""
    planStartDate: str = ""
    dueDate: str = ""
    registeredAddress: str = ""
    mailingAddress: str = ""
    contact1: str = ""
    contactPhone1: str = ""
    contact2: str = ""
    contactPhone2: str = ""
    contact3: str = ""
    contactPhone3: str = ""
    description: str = ""

    # 自訂欄位以 JSON 存在 Project.custom_fields。
    # default_factory 可避免多個 request 共用同一個 list 實例。
    customFields: list[CustomFieldSchema] = Field(default_factory=list)
    customTables: list[CustomTableSchema] = Field(default_factory=list)

    # Initial child table rows can be created together with the project.
    scheduleItems: list[ScheduleItemSchema] = Field(default_factory=list)
    todoItems: list[TodoItemSchema] = Field(default_factory=list)
    checkpointItems: list[CheckpointItemSchema] = Field(default_factory=list)

    # model_validator(mode="after") 會在欄位型別驗證完成後，檢查跨欄位規則。
    @model_validator(mode="after")
    def validate_project_dates(self) -> "ProjectCreatePayload":
        # 有填結束日時，專案開始與計劃開始都不能晚於結束日。
        due = self.dueDate
        if due:
            if self.preStartDate and self.preStartDate > due:
                raise ValueError("專案開始時間不能晚於結束時間")
            if self.planStartDate and self.planStartDate > due:
                raise ValueError("計劃開始時間不能晚於結束時間")
        return self


# 更新專案主檔的輸入格式
# 全部欄位皆可選填，只更新前端實際送出的欄位。
class ProjectUpdatePayload(BaseModel):
    # 更新 payload 不使用 Field(...)，代表欄位可省略；route 會用 exclude_none / exclude_unset 處理部分更新。
    name: str | None = None
    customer: str | None = None
    category: str | None = None
    group: str | None = None
    projectOwner: str | None = None
    status: str | None = None
    startDate: str | None = None
    preStartDate: str | None = None
    planStartDate: str | None = None
    dueDate: str | None = None
    registeredAddress: str | None = None
    mailingAddress: str | None = None
    contact1: str | None = None
    contactPhone1: str | None = None
    contact2: str | None = None
    contactPhone2: str | None = None
    contact3: str | None = None
    contactPhone3: str | None = None
    description: str | None = None
    customFields: list[CustomFieldSchema] | None = None
    customTables: list[CustomTableSchema] | None = None

    # 更新時同樣需要跨欄位日期檢查，但只檢查本次 payload 內可判斷的組合。
    @model_validator(mode="after")
    def validate_project_dates(self) -> "ProjectUpdatePayload":
        # 單次更新同時帶日期時，先在 schema 層擋下明顯錯誤。
        due = self.dueDate
        if due:
            if self.preStartDate and self.preStartDate > due:
                raise ValueError("專案開始時間不能晚於結束時間")
            if self.planStartDate and self.planStartDate > due:
                raise ValueError("計劃開始時間不能晚於結束時間")
        return self


# 專案選項新增格式：目前只允許 status 與 category，由 options API 再檢查。
class OptionCreatePayload(BaseModel):
    optionType: str
    value: str


# 專案選項更新格式：設定頁可改名稱、啟用狀態與排序。
class OptionUpdatePayload(BaseModel):
    value: str | None = None
    isActive: bool | None = None
    sortOrder: int | None = None


# 新增時程專用 Payload：建立時時程名稱與起訖日期必填。
class ScheduleCreatePayload(ScheduleItemSchema):
    # 子資源建立 API 透過 Field(...) 把共用 schema 的選填欄位改成必填欄位。
    name: str = Field(..., min_length=1, max_length=255)
    startDate: str = Field(..., min_length=1, max_length=20)
    endDate: str = Field(..., min_length=1, max_length=20)


# 新增待辦專用 Payload：建立時待辦內容必填。
class TodoCreatePayload(TodoItemSchema):
    item: str = Field(..., min_length=1, max_length=500)


# 新增查核點專用 Payload：建立時查核點名稱必填。
class CheckpointCreatePayload(CheckpointItemSchema):
    checkpoint: str = Field(..., min_length=1, max_length=500)
