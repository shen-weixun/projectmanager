import { useCallback, useEffect, useState } from "react"
import { toast } from "react-toastify"
import { useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import ProjectBaseInfo from "@/components/project/ProjectBaseInfo"
import ProjectCheckpointList from "@/components/project/ProjectCheckpointList"
import ProjectScheduleList from "@/components/project/ProjectScheduleList"
import ProjectTodoList from "@/components/project/ProjectTodoList"
import type {
  EditableCheckpointItem,
  EditableCustomField,
  EditableScheduleItem,
  EditableTodoItem,
  ProjectDetailForm,
  ProjectDetailSnapshot,
  ProjectStatus,
} from "@/components/project/projectDetailTypes"
import useAPIErrorHandler from "@/hooks/useAPIErrorHandler"
import {
  createProjectOptionAPI,
  getGroupsAPI,
  getProjectDetailAPI,
  getProjectOptionsAPI,
  updateProjectAPI,
} from "@/services/apis"
import type { ProjectDetail, ProjectUpdatePayload } from "@/types/api"

// 將空白狀態統一補成預設狀態，避免表單與甘特圖收到空值。
const normalizeProjectStatus = (status?: string): ProjectStatus =>
  (status || "").trim() || "尚未開始"

// 產生前端暫存自訂欄位使用的唯一 ID。
const createCustomFieldId = () =>
  `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

// 建立專案詳情表單預設值，供載入前或無資料時初始化使用。
const createEmptyProjectForm = (id: number): ProjectDetailForm => ({
  id,
  customer: "",
  name: "",
  group: "",
  projectOwner: "",
  status: "尚未開始",
  startDate: "",
  preStartDate: "",
  planStartDate: "",
  dueDate: "",
  category: "",
  description: "",
  registeredAddress: "",
  mailingAddress: "",
  contact1: "",
  contactPhone1: "",
  contact2: "",
  contactPhone2: "",
  contact3: "",
  contactPhone3: "",
  customFields: [],
  customTables: [],
})

// 將後端專案詳情資料整理成頁面表單與子清單可直接使用的快照。
const mapProjectDetailToSnapshot = (detail: ProjectDetail): ProjectDetailSnapshot => ({
  form: {
    id: detail.id,
    customer: detail.customer || "",
    name: detail.name,
    group: detail.group || "",
    projectOwner: detail.projectOwner || detail.owner || "",
    status: normalizeProjectStatus(detail.status),
    startDate: detail.startDate || "",
    preStartDate: detail.preStartDate || "",
    planStartDate: detail.planStartDate || "",
    dueDate: detail.dueDate || "",
    category: detail.category || "",
    description: detail.description || "",
    registeredAddress: detail.registeredAddress || "",
    mailingAddress: detail.mailingAddress || "",
    contact1: detail.contact1 || "",
    contactPhone1: detail.contactPhone1 || "",
    contact2: detail.contact2 || "",
    contactPhone2: detail.contactPhone2 || "",
    contact3: detail.contact3 || "",
    contactPhone3: detail.contactPhone3 || "",
    customFields: (detail.customFields || []).map((field) => ({
      id: String(field.id),
      label: field.label,
      value: field.value,
    })),
    customTables: (detail.customTables || []).map((table) => ({
      id: String(table.id),
      title: table.title,
      columns: table.columns.map((column) => ({
        id: String(column.id),
        label: column.label,
      })),
      rows: table.rows || [],
    })),
  },
  scheduleItems: (detail.scheduleItems || []).map((item) => ({
    id: item.id,
    name: item.name,
    assignee: item.assignee || "",
    startDate: item.startDate,
    endDate: item.endDate,
    status: normalizeProjectStatus(item.status),
  })),
  todoItems: (detail.todoItems || []).map((item) => ({
    id: item.id,
    item: item.item,
    assignee: item.assignee || "",
    status: item.status || "",
    dueDate: item.dueDate || "",
    note: item.note || "",
  })),
  checkpointItems: (detail.checkpointItems || []).map((item) => ({
    id: item.id,
    checkpoint: item.checkpoint,
    reviewDate: item.reviewDate || "",
    assignee: item.assignee || "",
    status: normalizeProjectStatus(item.status),
    note: item.note || "",
    description: item.description || "",
  })),
})

// 將表單資料轉成更新專案 API 需要的 payload 格式。
const mapFormToPayload = (form: ProjectDetailForm): ProjectUpdatePayload => ({
  name: form.name.trim(),
  customer: form.customer,
  category: form.category.trim(),
  group: form.group,
  projectOwner: form.projectOwner,
  owner: form.projectOwner,
  status: form.status.trim() || "尚未開始",
  startDate: form.startDate,
  preStartDate: form.preStartDate,
  planStartDate: form.planStartDate,
  dueDate: form.dueDate,
  registeredAddress: form.registeredAddress,
  mailingAddress: form.mailingAddress,
  contact1: form.contact1,
  contactPhone1: form.contactPhone1,
  contact2: form.contact2,
  contactPhone2: form.contactPhone2,
  contact3: form.contact3,
  contactPhone3: form.contactPhone3,
  description: form.description,
  customFields: form.customFields.map((field) => ({
    id: field.id,
    label: field.label,
    value: field.value,
  })),
  customTables: form.customTables,
})

// 專案狀態對應甘特圖進度與色彩設定。
const statusStyleMap: Record<
  ProjectStatus,
  {
    progress: number
    progressColor: string
    progressSelectedColor: string
    backgroundColor: string
    backgroundSelectedColor: string
  }
> = {
  未成案: { progress: 0, progressColor: "#ea580c", progressSelectedColor: "#c2410c", backgroundColor: "#ffedd5", backgroundSelectedColor: "#fed7aa" },
  未過案: { progress: 0, progressColor: "#dc2626", progressSelectedColor: "#b91c1c", backgroundColor: "#fee2e2", backgroundSelectedColor: "#fecaca" },
  撤案: { progress: 0, progressColor: "#7c3aed", progressSelectedColor: "#6d28d9", backgroundColor: "#ede9fe", backgroundSelectedColor: "#ddd6fe" },
  尚未開始: { progress: 0, progressColor: "#6b7280", progressSelectedColor: "#4b5563", backgroundColor: "#f3f4f6", backgroundSelectedColor: "#e5e7eb" },
  進行中: { progress: 50, progressColor: "#d97706", progressSelectedColor: "#b45309", backgroundColor: "#fef3c7", backgroundSelectedColor: "#fde68a" },
  已完成: { progress: 100, progressColor: "#16a34a", progressSelectedColor: "#15803d", backgroundColor: "#dcfce7", backgroundSelectedColor: "#bbf7d0" },
  已結案: { progress: 100, progressColor: "#2563eb", progressSelectedColor: "#1d4ed8", backgroundColor: "#dbeafe", backgroundSelectedColor: "#bfdbfe" },
}

// 取得狀態樣式，無對應狀態時使用尚未開始樣式。
const getStatusStyle = (status?: string) =>
  statusStyleMap[status || ""] ?? statusStyleMap["尚未開始"]

// 檢查使用者輸入的狀態或類別是否已存在於後端選項。
const hasOption = (options: string[], value: string) =>
  options.some((option) => option.trim() === value)

const ProjectDetailPage = () => {
  // 從路由取得專案 ID，並準備共用錯誤處理。
  const { projectId } = useParams()
  const handleError = useAPIErrorHandler()
  const numericProjectId = Number(projectId ?? 0)

  // 管理專案主檔表單、編輯狀態、選項資料與各子清單資料。
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<ProjectDetailForm>(() => createEmptyProjectForm(numericProjectId))
  const [savedForm, setSavedForm] = useState<ProjectDetailForm | null>(null)
  const [newCustomField, setNewCustomField] = useState({ label: "", value: "" })
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [groups, setGroups] = useState<{ id: number; groupName: string }[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [todoStatusOptions, setTodoStatusOptions] = useState<string[]>([])
  const [scheduleStatusOptions, setScheduleStatusOptions] = useState<string[]>([])
  const [checkpointStatusOptions, setCheckpointStatusOptions] = useState<string[]>([])
  const [todoItems, setTodoItems] = useState<EditableTodoItem[]>([])
  const [checkpointItems, setCheckpointItems] = useState<EditableCheckpointItem[]>([])
  const [scheduleItems, setScheduleItems] = useState<EditableScheduleItem[]>([])

  // 載入組別、狀態與類別選項，供主檔表單下拉與新增選項判斷使用。
  const fetchOptions = useCallback(async () => {
    try {
      const [groupsRes, optionsRes] = await Promise.all([getGroupsAPI(), getProjectOptionsAPI()])
      if (groupsRes.status === -1) {
        handleError(groupsRes.error)
        return
      }
      if (optionsRes.status === -1) {
        handleError(optionsRes.error)
        return
      }
      setGroups(groupsRes.data || [])
      setStatusOptions(optionsRes.data?.statuses || [])
      setCategoryOptions(optionsRes.data?.categories || [])
      setTodoStatusOptions(optionsRes.data?.todoStatuses || [])
      setScheduleStatusOptions(optionsRes.data?.scheduleStatuses || [])
      setCheckpointStatusOptions(optionsRes.data?.checkpointStatuses || [])
    } catch (error) {
      handleError(error)
    }
  }, [handleError])

  useEffect(() => {
    // 初次進入與選項重整時載入專案表單選項。
    void fetchOptions()
  }, [fetchOptions])

  useEffect(() => {
    // 依路由專案 ID 載入主檔、時程、待辦與查核點資料。
    const fetchDetail = async () => {
      if (!numericProjectId) {
        setLoadError("無效的專案編號")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setLoadError("")
      setIsEditing(false)

      try {
        const res = await getProjectDetailAPI(numericProjectId)
        if (res.status === -1) {
          setLoadError("專案資料載入失敗")
          handleError(res.error)
          return
        }

        const snapshot = mapProjectDetailToSnapshot(res.data)
        setSavedForm(snapshot.form)
        setForm(snapshot.form)
        setScheduleItems(snapshot.scheduleItems)
        setTodoItems(snapshot.todoItems)
        setCheckpointItems(snapshot.checkpointItems)
      } catch (error) {
        handleError(error)
        setLoadError("專案資料載入失敗")
      } finally {
        setIsLoading(false)
      }
    }

    void fetchDetail()
  }, [numericProjectId, handleError])

  // 新增前端暫存自訂欄位，儲存主檔時一併送到後端。
  const handleAddCustomField = () => {
    if (!newCustomField.label.trim()) {
      toast.error("自訂欄位標頭不可為空", { position: "top-center" })
      return
    }

    setForm((prev) => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        {
          id: createCustomFieldId(),
          label: newCustomField.label.trim(),
          value: newCustomField.value.trim(),
        },
      ],
    }))
    setNewCustomField({ label: "", value: "" })
  }

  // 更新指定自訂欄位的標題或內容。
  const handleCustomFieldChange = (
    fieldId: string,
    key: keyof Omit<EditableCustomField, "id">,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.map((field) =>
        field.id === fieldId ? { ...field, [key]: value } : field
      ),
    }))
  }

  // 從表單中移除指定自訂欄位。
  const handleDeleteCustomField = (fieldId: string) => {
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((field) => field.id !== fieldId),
    }))
  }

  // 儲存專案主檔，必要時先建立新的狀態或類別選項。
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("專案名稱不可為空", { position: "top-center" })
      return
    }

    try {
      const nextStatus = form.status.trim()
      const nextCategory = form.category.trim()

      if (nextStatus && !hasOption(statusOptions, nextStatus)) {
        const statusRes = await createProjectOptionAPI("status", nextStatus)
        if (statusRes.status === -1) {
          handleError(statusRes.error)
          return
        }
      }

      if (nextCategory && !hasOption(categoryOptions, nextCategory)) {
        const categoryRes = await createProjectOptionAPI("category", nextCategory)
        if (categoryRes.status === -1) {
          handleError(categoryRes.error)
          return
        }
      }

      const res = await updateProjectAPI(form.id, mapFormToPayload(form))
      if (res.status === -1) {
        handleError(res.error)
        return
      }

      const snapshot = mapProjectDetailToSnapshot(res.data)
      setSavedForm(snapshot.form)
      setForm(snapshot.form)
      setIsEditing(false)
      await fetchOptions()
    } catch (error) {
      handleError(error)
    }
  }

  // 取消編輯時還原成最近一次儲存的主檔快照。
  const handleCancel = () => {
    if (savedForm) {
      setForm(savedForm)
    }
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] items-center justify-center bg-slate-100">
        <div className="animate-pulse text-lg font-semibold text-slate-500">載入專案資料中...</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] items-center justify-center bg-slate-100 px-8">
        <div className="rounded-xl border border-rose-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="text-lg font-bold text-rose-700">{loadError}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1400px] bg-slate-100 pb-16">
      <div className="sticky top-0 z-20 mb-8 flex items-center justify-between border-b border-slate-300 bg-white/95 px-8 py-5 shadow-sm backdrop-blur-md">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">{form.name || "專案詳情"}</h2>
          <p className="mt-1 text-base font-semibold text-slate-600">專案編號：#{form.id}</p>
        </div>
        <div className="flex items-center gap-4">
          {isEditing ? (
            <>
              <Button variant="outline" className="h-10 border-slate-400 px-6 text-base font-bold text-slate-700 hover:bg-slate-100" onClick={handleCancel}>
                取消
              </Button>
              <Button className="h-10 bg-blue-700 px-6 text-base font-bold text-white hover:bg-blue-800" onClick={handleSave}>
                儲存主檔
              </Button>
            </>
          ) : (
            <Button className="h-10 bg-slate-800 px-6 text-base font-bold hover:bg-slate-900" onClick={() => setIsEditing(true)}>
              編輯專案
            </Button>
          )}
        </div>
      </div>

      <div className="px-8">
        <ProjectBaseInfo
          form={form}
          isEditing={isEditing}
          categoryOptions={categoryOptions}
          groups={groups}
          statusOptions={statusOptions}
          newCustomField={newCustomField}
          onFormChange={setForm}
          onNewCustomFieldChange={setNewCustomField}
          onAddCustomField={handleAddCustomField}
          onCustomFieldChange={handleCustomFieldChange}
          onDeleteCustomField={handleDeleteCustomField}
        />

        <ProjectCheckpointList
          projectId={form.id}
          isEditing={isEditing}
          items={checkpointItems}
          statusOptions={checkpointStatusOptions}
          onStatusOptionsChange={setCheckpointStatusOptions}
          onItemsChange={setCheckpointItems}
          onError={handleError}
        />

        <ProjectTodoList
          projectId={form.id}
          isEditing={isEditing}
          items={todoItems}
          statusOptions={todoStatusOptions}
          onStatusOptionsChange={setTodoStatusOptions}
          onItemsChange={setTodoItems}
          onError={handleError}
        />

        <ProjectScheduleList
          projectId={form.id}
          form={form}
          isEditing={isEditing}
          items={scheduleItems}
          statusOptions={scheduleStatusOptions}
          onStatusOptionsChange={setScheduleStatusOptions}
          getStatusStyle={getStatusStyle}
          onItemsChange={setScheduleItems}
          onError={handleError}
        />
      </div>
    </div>
  )
}

export default ProjectDetailPage
