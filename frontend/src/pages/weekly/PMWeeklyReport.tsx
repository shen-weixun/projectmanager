import { useEffect, useMemo, useState } from "react"
import { CalendarRange, Search } from "lucide-react"
import AddProjectButton from "@/components/weekly/AddProjectButton"
import ArchiveWeekButton from "@/components/weekly/ArchiveWeekButton"
import ClosedProjectsTable from "@/components/weekly/ClosedProjectsTable"
import PMTable from "@/components/weekly/PMTable"
import PMTabs from "@/components/weekly/PMTabs"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  archivePMWeekAPI,
  createPMProjectAPI,
  deletePMProjectAPI,
  getPMArchiveLogsAPI,
  getPMEditLogsAPI,
  getPMHistoryAPI,
  getPMProjectsAPI,
  updatePMProjectAPI,
} from "@/services/apis"
import { getRoleKey } from "@/utils/auth"
import {
  ACTIVE_STAGES,
  CLOSED_STAGES,
  PRIORITY_LABEL,
  PROJECT_STAGE_LABEL,
  type PMHistoryRecord,
  type PMProject,
  type PMTabKey,
  type Priority,
  type ProjectStage,
} from "@/types/api"

// 將週報起訖日期組成畫面顯示用的週次文字。
const createWeekRangeLabel = (weekStartDate: string, weekEndDate: string) =>
  `${weekStartDate} ~ ${weekEndDate}`

// 依照指定日期計算該週週一到週日的日期範圍。
const getCurrentWeekRange = (baseDate: Date) => {
  const day = baseDate.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = new Date(baseDate)
  start.setDate(baseDate.getDate() + mondayOffset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return {
    weekStartDate: start.toISOString().slice(0, 10),
    weekEndDate: end.toISOString().slice(0, 10),
  }
}

type OngoingSortField = "manager" | "assistants" | "stage" | "priority"
type SortDirection = "asc" | "desc"
type PMEditLog = {
  id: number
  projectId: number
  projectName: string
  fieldKey: string
  fieldLabel: string
  oldValue: string
  newValue: string
  editedByName: string
  editedAt: string
}

type PMArchiveLog = {
  id: number
  archivedByName: string
  archivedAt: string
  weekRange: string
  archivedCount: number
}

// PM工作表欄位顯示名稱映射
const pmFieldLabelMap: Partial<Record<keyof PMProject, string>> = {
  projectName: "專案名稱",
  vendor: "廠商",
  executionTime: "執行時間",
  manager: "主管",
  assistants: "協辦",
  stage: "執行階段",
  priority: "優先度",
  summary: "摘要",
  plannedExecution: "預計執行",
  actualExecution: "實際執行",
  lastWeekProgress: "上週進度",
  thisWeekTodo: "本週待辦",
  notes: "備註",
}

// 可查看封存紀錄與執行封存的 PM 管理角色。
const PM_MANAGER_ROLE_KEYS = ["super", "boss", "pm_leader"]

const PMPage = () => {
  // 依登入角色判斷是否開放 PM 週報管理功能。
  const roleKey = getRoleKey()
  const canManagePM = PM_MANAGER_ROLE_KEYS.includes(roleKey ?? "")

  // 管理 PM 週報頁籤、清單資料、歷史資料、紀錄與篩選排序狀態。
  const [activeTab, setActiveTab] = useState<PMTabKey>("ongoing")
  const [projects, setProjects] = useState<PMProject[]>([])
  const [historyRecords, setHistoryRecords] = useState<PMHistoryRecord[]>([])
  const [editLogs, setEditLogs] = useState<PMEditLog[]>([])
  const [archiveLogs, setArchiveLogs] = useState<PMArchiveLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [pendingDeleteProject, setPendingDeleteProject] = useState<PMProject | null>(null)
  const [currentEditorName, setCurrentEditorName] = useState("Josh")
  const [currentWeekBase] = useState(new Date())
  const [managerFilter, setManagerFilter] = useState("")
  const [assistantsFilter, setAssistantsFilter] = useState("")
  const [stageFilter, setStageFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [sortField, setSortField] = useState<OngoingSortField>("manager")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [historySearch, setHistorySearch] = useState("")
  const [historyVendor, setHistoryVendor] = useState("all")
  const [historyManager, setHistoryManager] = useState("all")
  const [historyPriority, setHistoryPriority] = useState<Priority | "all">("all")
  const [selectedWeek, setSelectedWeek] = useState("all")

  // 固定以進入頁面當下日期計算本週範圍。
  const currentWeek = getCurrentWeekRange(currentWeekBase)

  // 一次載入 PM 專案、歷史週報、編輯紀錄與管理者封存紀錄。
  const fetchPMData = async () => {
    setErrorMessage("")
    const [projectsRes, historyRes, editLogsRes, archiveLogsRes] = await Promise.all([
      getPMProjectsAPI(),
      getPMHistoryAPI(),
      getPMEditLogsAPI(),
      canManagePM ? getPMArchiveLogsAPI() : Promise.resolve({ status: 0, data: [] }),
    ])

    if (
      projectsRes.status !== 0 ||
      historyRes.status !== 0 ||
      editLogsRes.status !== 0 ||
      archiveLogsRes.status !== 0
    ) {
      setErrorMessage("PM 資料載入失敗，請確認後端 API 與資料庫狀態")
      return
    }

    setProjects(projectsRes.data)
    setHistoryRecords(historyRes.data)
    setEditLogs(editLogsRes.data as PMEditLog[])
    setArchiveLogs(archiveLogsRes.data as PMArchiveLog[])
  }

  useEffect(() => {
    // 初次進入頁面時載入 PM 週報資料，並統一控制載入狀態。
    const load = async () => {
      setIsLoading(true)
      await fetchPMData()
      setIsLoading(false)
    }

    void load()
  }, [])

  // 篩出目前仍需在進行中工作表維護的 PM 專案。
  const activeProjects = useMemo(
    () => projects.filter((project) => ACTIVE_STAGES.includes(project.stage)),
    [projects]
  )

  // 篩出已結案或取消的 PM 專案，供查詢頁籤顯示。
  const closedProjects = useMemo(
    () => projects.filter((project) => CLOSED_STAGES.includes(project.stage)),
    [projects]
  )

  // 提供頁籤顯示各分類筆數。
  const counts: Record<PMTabKey, number> = {
    ongoing: activeProjects.length,
    closed: closedProjects.length,
    history: historyRecords.length,
  }

  // 處理表格欄位更新，成功後同步更新清單與編輯紀錄。
  const handleFieldChange = async <K extends keyof PMProject>(
    projectId: number,
    field: K,
    value: PMProject[K]
  ) => {
    const targetProject = projects.find((project) => project.id === projectId)
    if (!targetProject) {
      return
    }

    const oldValue = targetProject[field]
    if (oldValue === value) {
      return
    }

    if (field === "stage") {
      const nextStage = value as ProjectStage
      const closing = nextStage === "closed"
      const cancelling = nextStage === "cancelled"

      if ((closing || cancelling) && nextStage !== targetProject.stage) {
        const confirmed = window.confirm(
          `確認將「${targetProject.projectName}」標記為${PROJECT_STAGE_LABEL[nextStage]}？`
        )

        if (!confirmed) {
          return
        }
      }
    }

    const response = await updatePMProjectAPI(projectId, {
      [field]: value,
      editedByName: currentEditorName.trim() || "未指定",
    } as Partial<PMProject> & { editedByName?: string })

    if (response.status !== 0) {
      setErrorMessage("PM 資料更新失敗，已重新載入後端資料")
      await fetchPMData()
      return
    }

    setProjects((prev) =>
      prev.map((project) => (project.id === projectId ? response.data : project))
    )
    const editLogsRes = await getPMEditLogsAPI()
    if (editLogsRes.status === 0) {
      setEditLogs(editLogsRes.data as PMEditLog[])
    }
  }

  // 建立一筆預設 PM 專案，讓使用者可直接在表格中編輯內容。
  const handleAddProject = async () => {
    const response = await createPMProjectAPI({
      projectName: "新專案",
      vendor: "",
      executionTime: "",
      manager: "",
      assistants: "",
      stage: "not_started",
      priority: "medium",
      summary: "",
      plannedExecution: "",
      actualExecution: "",
      lastWeekProgress: "",
      thisWeekTodo: "",
      notes: "",
    })

    if (response.status !== 0) {
      setErrorMessage("新增 PM 專案失敗，請確認後端 API 與資料庫狀態")
      return
    }

    setProjects((prev) => [response.data, ...prev])
    setActiveTab("ongoing")
  }

  // 暫存要刪除的專案，先交由確認視窗完成二次確認。
  const handleDeleteProject = (projectId: number) => {
    const targetProject = projects.find((project) => project.id === projectId)
    if (!targetProject) {
      return
    }

    setPendingDeleteProject(targetProject)
  }

  // 確認後呼叫刪除 API，完成後重新載入後端最新資料。
  const confirmDeleteProject = async () => {
    if (!pendingDeleteProject) {
      return
    }

    const response = await deletePMProjectAPI(pendingDeleteProject.id)
    if (response.status !== 0) {
      setErrorMessage("刪除 PM 專案失敗，已重新載入後端資料")
      setPendingDeleteProject(null)
      await fetchPMData()
      return
    }

    setPendingDeleteProject(null)
    await fetchPMData()
  }

  // 將目前進行中的 PM 專案封存成本週歷史週報。
  const handleArchiveWeek = async () => {
    if (activeProjects.length === 0) {
      return
    }

    const confirmed = window.confirm(
      `確認封存 ${currentWeek.weekStartDate} ~ ${currentWeek.weekEndDate} 的週報資料？`
    )
    if (!confirmed) {
      return
    }

    const response = await archivePMWeekAPI(currentEditorName.trim() || "未指定")
    if (response.status !== 0) {
      setErrorMessage("封存 PM 週報失敗，已重新載入後端資料")
      await fetchPMData()
      return
    }

    await fetchPMData()
    setActiveTab("history")
  }

  // 從進行中專案整理主管篩選候選值。
  const managerOptions = useMemo(
    () => Array.from(new Set(activeProjects.map((project) => project.manager).filter(Boolean))),
    [activeProjects]
  )

  // 從進行中專案整理協辦篩選候選值。
  const assistantsOptions = useMemo(
    () => Array.from(new Set(activeProjects.map((project) => project.assistants).filter(Boolean))),
    [activeProjects]
  )

  // 從進行中專案整理階段篩選候選值。
  const stageOptions = useMemo(
    () => Array.from(new Set(activeProjects.map((project) => project.stage))),
    [activeProjects]
  )

  // 從進行中專案整理優先度篩選候選值。
  const priorityOptions = useMemo(
    () => Array.from(new Set(activeProjects.map((project) => project.priority))),
    [activeProjects]
  )

  // 依目前篩選條件與排序設定產生工作表實際顯示資料。
  const tableProjects = useMemo(() => {
    const normalizedManager = managerFilter.trim().toLowerCase()
    const normalizedAssistants = assistantsFilter.trim().toLowerCase()
    const normalizedStage = stageFilter.trim().toLowerCase()
    const normalizedPriority = priorityFilter.trim().toLowerCase()

    const filtered = activeProjects.filter((project) => {
      const managerMatch =
        normalizedManager === "" ||
        project.manager.toLowerCase().includes(normalizedManager)
      const assistantsMatch =
        normalizedAssistants === "" ||
        project.assistants.toLowerCase().includes(normalizedAssistants)
      const stageLabel = PROJECT_STAGE_LABEL[project.stage].toLowerCase()
      const stageMatch =
        normalizedStage === "" ||
        project.stage.toLowerCase().includes(normalizedStage) ||
        stageLabel.includes(normalizedStage)
      const priorityLabel = PRIORITY_LABEL[project.priority].toLowerCase()
      const priorityMatch =
        normalizedPriority === "" ||
        project.priority.toLowerCase().includes(normalizedPriority) ||
        priorityLabel.includes(normalizedPriority)
      return managerMatch && assistantsMatch && stageMatch && priorityMatch
    })

    return [...filtered].sort((left, right) => {
      const leftValue =
        sortField === "stage"
          ? PROJECT_STAGE_LABEL[left.stage]
          : sortField === "priority"
            ? PRIORITY_LABEL[left.priority]
            : left[sortField]
      const rightValue =
        sortField === "stage"
          ? PROJECT_STAGE_LABEL[right.stage]
          : sortField === "priority"
            ? PRIORITY_LABEL[right.priority]
            : right[sortField]

      const result = String(leftValue).localeCompare(String(rightValue), "zh-TW", {
        numeric: true,
      })
      return sortDirection === "asc" ? result : -result
    })
  }, [
    activeProjects,
    assistantsFilter,
    managerFilter,
    priorityFilter,
    sortDirection,
    sortField,
    stageFilter,
  ])

  // 從歷史週報整理可選週次。
  const historyWeekOptions = useMemo(() => {
    const weekLabels = Array.from(
      new Set(historyRecords.map((record) => createWeekRangeLabel(record.weekStartDate, record.weekEndDate)))
    )
    return weekLabels
  }, [historyRecords])

  // 從歷史週報整理廠商篩選候選值。
  const historyVendorOptions = useMemo(
    () => Array.from(new Set(historyRecords.map((record) => record.vendor).filter(Boolean))),
    [historyRecords]
  )

  // 從歷史週報整理主管篩選候選值。
  const historyManagerOptions = useMemo(
    () => Array.from(new Set(historyRecords.map((record) => record.manager).filter(Boolean))),
    [historyRecords]
  )

  // 依週次、廠商、主管、優先度與關鍵字篩選歷史週報。
  const filteredHistory = useMemo(() => {
    return historyRecords.filter((record) => {
      const weekLabel = createWeekRangeLabel(record.weekStartDate, record.weekEndDate)
      const weekMatch = selectedWeek === "all" || weekLabel === selectedWeek
      const vendorMatch = historyVendor === "all" || record.vendor === historyVendor
      const managerMatch = historyManager === "all" || record.manager === historyManager
      const priorityMatch =
        historyPriority === "all" || record.prioritySnapshot === historyPriority
      const searchValue = historySearch.trim().toLowerCase()
      const searchMatch =
        searchValue === "" ||
        record.projectName.toLowerCase().includes(searchValue) ||
        record.vendor.toLowerCase().includes(searchValue)
      return weekMatch && vendorMatch && managerMatch && priorityMatch && searchMatch
    })
  }, [
    historyManager,
    historyPriority,
    historyRecords,
    historySearch,
    historyVendor,
    selectedWeek,
  ])

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1760px] pb-14">
      <section className="rounded-[2rem] border border-slate-300 bg-[#f1f5f9] p-6 shadow-lg shadow-slate-300/40 sm:p-7">
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-5 py-4 text-slate-800 shadow-sm">
          <CalendarRange className="size-5 text-slate-600" />
          <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            當週範圍
          </div>
          <div className="text-lg font-bold">
            {currentWeek.weekStartDate} ~ {currentWeek.weekEndDate}
          </div>
        </div>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <PMTabs activeTab={activeTab} onChange={setActiveTab} counts={counts} />
          <div className="flex flex-wrap items-center gap-3">
            {canManagePM && (
              <ArchiveWeekButton
                onClick={handleArchiveWeek}
                disabled={activeProjects.length === 0 || isLoading}
              />
            )}
            <AddProjectButton onClick={handleAddProject} />
          </div>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-rose-300 bg-rose-50 px-5 py-4 text-base font-semibold text-rose-800">
            {errorMessage}
          </div>
        )}

        {isLoading && (
          <div className="mt-5 rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base font-semibold text-slate-700">
            正在載入 PM 資料...
          </div>
        )}

        {activeTab === "ongoing" && (
          <div className="mt-6">
            <div className="mb-5 grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-300 xl:grid-cols-7">
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                  編輯人員
                </div>
                <Input
                  value={currentEditorName}
                  onChange={(event) => setCurrentEditorName(event.target.value)}
                  placeholder="輸入目前編輯人員"
                />
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                  主管
                </div>
                <Input
                  list="pm-manager-options"
                  value={managerFilter}
                  onChange={(event) => setManagerFilter(event.target.value)}
                  placeholder="輸入或選擇主管"
                />
                <datalist id="pm-manager-options">
                  {managerOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                  協辦
                </div>
                <Input
                  list="pm-assistants-options"
                  value={assistantsFilter}
                  onChange={(event) => setAssistantsFilter(event.target.value)}
                  placeholder="輸入或選擇協辦"
                />
                <datalist id="pm-assistants-options">
                  {assistantsOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                  執行階段
                </div>
                <Input
                  list="pm-stage-options"
                  value={stageFilter}
                  onChange={(event) => setStageFilter(event.target.value)}
                  placeholder="輸入或選擇階段"
                />
                <datalist id="pm-stage-options">
                  {stageOptions.map((option) => (
                    <option key={option} value={PROJECT_STAGE_LABEL[option]} />
                  ))}
                </datalist>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                  優先度
                </div>
                <Input
                  list="pm-priority-options"
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                  placeholder="輸入或選擇優先度"
                />
                <datalist id="pm-priority-options">
                  {priorityOptions.map((option) => (
                    <option key={option} value={PRIORITY_LABEL[option]} />
                  ))}
                </datalist>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                  排序欄位
                </div>
                <Select
                  value={sortField}
                  onValueChange={(value) => setSortField(value as OngoingSortField)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">主管</SelectItem>
                    <SelectItem value="assistants">協辦</SelectItem>
                    <SelectItem value="stage">執行階段</SelectItem>
                    <SelectItem value="priority">優先度</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                  排序方向
                </div>
                <Select
                  value={sortDirection}
                  onValueChange={(value) => setSortDirection(value as SortDirection)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">升冪</SelectItem>
                    <SelectItem value="desc">降冪</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <PMTable
              projects={tableProjects}
              onFieldChange={handleFieldChange}
              onDeleteProject={handleDeleteProject}
            />
            <div className="mt-5 rounded-2xl bg-white p-6 ring-1 ring-slate-300">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">編輯紀錄</h3>
                  <p className="mt-2 text-base leading-7 text-slate-500">
                    當週暫存紀錄，管理人員按下封存後會自動清空。
                  </p>
                </div>
                <div className="rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">
                  最近 {editLogs.length} 筆
                </div>
              </div>
              <div className="mt-5 overflow-x-auto rounded-[1.25rem] border border-slate-400">
                <table className="min-w-[980px] w-full border-collapse text-center">
                  <thead className="bg-slate-200 text-base font-bold text-slate-800">
                    <tr>
                      <th className="border-b border-slate-400 px-5 py-4">編輯人員</th>
                      <th className="border-b border-slate-400 px-5 py-4">修改時間</th>
                      <th className="border-b border-slate-400 px-5 py-4">專案名稱</th>
                      <th className="border-b border-slate-400 px-5 py-4">欄位</th>
                      <th className="border-b border-slate-400 px-5 py-4">舊值</th>
                      <th className="border-b border-slate-400 px-5 py-4">新值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editLogs.map((log) => (
                      <tr key={log.id} className="border-t border-slate-300 align-middle hover:bg-slate-100/80">
                        <td className="border-r border-slate-300 px-5 py-4 text-base font-medium text-slate-900">
                          {log.editedByName}
                        </td>
                        <td className="border-r border-slate-300 px-5 py-4 text-base text-slate-700">
                          {log.editedAt}
                        </td>
                        <td className="border-r border-slate-300 px-5 py-4 text-base font-medium text-slate-900">
                          {log.projectName}
                        </td>
                        <td className="border-r border-slate-300 px-5 py-4 text-base text-slate-700">
                          {pmFieldLabelMap[log.fieldKey as keyof PMProject] ?? log.fieldLabel}
                        </td>
                        <td className="border-r border-slate-300 px-5 py-4 text-base text-slate-700">
                          {log.oldValue || "-"}
                        </td>
                        <td className="px-5 py-4 text-base text-slate-700">
                          {log.newValue || "-"}
                        </td>
                      </tr>
                    ))}
                    {editLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-14 text-center text-base text-slate-600">
                          目前還沒有編輯紀錄，修改任一欄位後會顯示在這裡。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {canManagePM && (
              <div className="mt-5 rounded-2xl bg-white p-6 ring-1 ring-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">封存紀錄</h3>
                    <p className="mt-2 text-base leading-7 text-slate-500">
                      保留每次封存的時間、人員與週次範圍，供管理追蹤使用。
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">
                    累計 {archiveLogs.length} 筆
                  </div>
                </div>
                <div className="mt-5 overflow-x-auto rounded-[1.25rem] border border-slate-400">
                  <table className="min-w-[760px] w-full border-collapse text-center">
                    <thead className="bg-slate-200 text-base font-bold text-slate-800">
                      <tr>
                        <th className="border-b border-slate-400 px-5 py-4">封存人員</th>
                        <th className="border-b border-slate-400 px-5 py-4">封存時間</th>
                        <th className="border-b border-slate-400 px-5 py-4">週次</th>
                        <th className="border-b border-slate-400 px-5 py-4">封存專案數</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archiveLogs.map((log) => (
                        <tr key={log.id} className="border-t border-slate-300 align-middle hover:bg-slate-100/80">
                          <td className="border-r border-slate-300 px-5 py-4 text-base font-medium text-slate-900">
                            {log.archivedByName}
                          </td>
                          <td className="border-r border-slate-300 px-5 py-4 text-base text-slate-700">
                            {log.archivedAt}
                          </td>
                          <td className="border-r border-slate-300 px-5 py-4 text-base text-slate-700">
                            {log.weekRange}
                          </td>
                          <td className="px-5 py-4 text-base text-slate-700">
                            {log.archivedCount}
                          </td>
                        </tr>
                      ))}
                      {archiveLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-14 text-center text-base text-slate-600">
                            目前還沒有封存紀錄，按下封存後會顯示在這裡。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "closed" && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-300">
              <h2 className="text-2xl font-bold text-slate-900">已結案 / 已撤案紀錄</h2>
              <p className="mt-2 text-base leading-7 text-slate-500">
                此區偏查詢用途，從進行中專案改成已結案或已撤案後，會自動移出工作表。
              </p>
            </div>
            <ClosedProjectsTable projects={closedProjects} />
          </div>
        )}

        {activeTab === "history" && (
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 rounded-2xl bg-white p-6 ring-1 ring-slate-300 xl:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.target.value)}
                  placeholder="搜尋專案名稱或廠商"
                  className="pl-9"
                />
              </div>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="週次篩選" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部週次</SelectItem>
                  {historyWeekOptions.map((week) => (
                    <SelectItem key={week} value={week}>
                      {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={historyVendor} onValueChange={setHistoryVendor}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="廠商篩選" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部廠商</SelectItem>
                  {historyVendorOptions.map((vendor) => (
                    <SelectItem key={vendor} value={vendor}>
                      {vendor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={historyManager} onValueChange={setHistoryManager}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="主管篩選" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部主管</SelectItem>
                  {historyManagerOptions.map((manager) => (
                    <SelectItem key={manager} value={manager}>
                      {manager}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={historyPriority}
                onValueChange={(value) => setHistoryPriority(value as Priority | "all")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="優先度篩選" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部優先度</SelectItem>
                  {(Object.keys(PRIORITY_LABEL) as Priority[]).map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {PRIORITY_LABEL[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto rounded-[1.5rem] border border-slate-400 bg-white shadow-sm">
              <table className="min-w-[1280px] w-full text-left">
                <thead className="bg-slate-200 text-base font-bold text-slate-800">
                  <tr>
                    <th className="border-b border-slate-400 px-5 py-4">週次</th>
                    <th className="border-b border-slate-400 px-5 py-4">專案名稱</th>
                    <th className="border-b border-slate-400 px-5 py-4">廠商</th>
                    <th className="border-b border-slate-400 px-5 py-4">主管</th>
                    <th className="border-b border-slate-400 px-5 py-4">階段快照</th>
                    <th className="border-b border-slate-400 px-5 py-4">優先度快照</th>
                    <th className="border-b border-slate-400 px-5 py-4">上週進度</th>
                    <th className="border-b border-slate-400 px-5 py-4">本週待辦</th>
                    <th className="border-b border-slate-400 px-5 py-4">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((record, index) => {
                    const previousRecord = filteredHistory[index - 1]
                    const isNewWeek =
                      index === 0 ||
                      previousRecord.weekStartDate !== record.weekStartDate ||
                      previousRecord.weekEndDate !== record.weekEndDate

                    return (
                      <>
                        {isNewWeek && (
                          <tr key={`${record.weekStartDate}-${record.weekEndDate}`}>
                            <td
                              colSpan={9}
                              className="border-t border-slate-400 bg-slate-100 px-5 py-4 text-left text-lg font-bold tracking-[0.08em] text-slate-800"
                            >
                              週次 {record.weekStartDate} ~ {record.weekEndDate}
                            </td>
                          </tr>
                        )}
                        <tr
                          key={record.id}
                          className="border-t border-slate-300 align-top hover:bg-slate-100/80"
                        >
                          <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">
                            {record.weekStartDate} ~ {record.weekEndDate}
                          </td>
                          <td className="border-r border-slate-300 px-5 py-4 text-lg font-medium text-slate-900">{record.projectName}</td>
                          <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">{record.vendor || "-"}</td>
                          <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">{record.manager || "-"}</td>
                          <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">
                            {PROJECT_STAGE_LABEL[record.stageSnapshot]}
                          </td>
                          <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">
                            {PRIORITY_LABEL[record.prioritySnapshot]}
                          </td>
                          <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">{record.lastWeekProgress || "-"}</td>
                          <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">{record.thisWeekTodo || "-"}</td>
                          <td className="px-5 py-4 text-lg text-slate-700">{record.notes || "-"}</td>
                        </tr>
                      </>
                    )
                  })}
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-14 text-center text-base text-slate-500">
                        沒有符合篩選條件的歷史週報資料
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pendingDeleteProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-6 text-center shadow-2xl shadow-slate-900/20">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-lg font-bold text-rose-700">
                !
              </div>
              <h3 className="mt-4 text-2xl font-bold text-slate-900">確認刪除專案</h3>
              <p className="mt-3 text-base leading-7 text-slate-600">
                將刪除「{pendingDeleteProject.projectName}」以及相關歷史與編輯紀錄。
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-base font-semibold text-slate-700 transition hover:bg-slate-100"
                  onClick={() => setPendingDeleteProject(null)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-rose-700"
                  onClick={confirmDeleteProject}
                >
                  確認刪除
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default PMPage
