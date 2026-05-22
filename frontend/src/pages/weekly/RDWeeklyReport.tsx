import { useEffect, useMemo, useState } from "react"
import { CalendarRange } from "lucide-react"
import AddProjectButton from "@/components/weekly/AddProjectButton"
import ArchiveWeekButton from "@/components/weekly/ArchiveWeekButton"
import ClosedProjectsTable from "@/components/weekly/ClosedProjectsTable"
import PMTabs from "@/components/weekly/PMTabs"
import RDTable from "@/components/weekly/RDTable"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  archiveRDWeekAPI,
  createRDReportAPI,
  deleteRDReportAPI,
  getRDArchiveLogsAPI,
  getRDEditLogsAPI,
  getRDHistoryAPI,
  getRDReportsAPI,
  updateRDReportAPI,
} from "@/services/apis"
import { getRoleKey } from "@/utils/auth"
import {
  RD_ACTIVE_STATUSES,
  RD_CLOSED_STATUSES,
  RD_STATUS_LABEL,
  type PMTabKey,
  type RDHistoryRecord,
  type RDItemStatus,
  type RDReport,
} from "@/types/api"

type RDEditLog = {
  id: number
  reportId: number
  projectName: string
  fieldKey: string
  fieldLabel: string
  oldValue: string
  newValue: string
  editedByName: string
  editedAt: string
}

type RDArchiveLog = {
  id: number
  archivedByName: string
  archivedAt: string
  weekRange: string
  archivedCount: number
}

type RDSortField = "vendor" | "executor" | "itemStatus"
type SortDirection = "asc" | "desc"

// RD 工作表欄位顯示名稱映射，供編輯紀錄顯示中文欄位名。
const fieldLabelMap: Partial<Record<keyof RDReport, string>> = {
  vendor: "廠商",
  projectName: "專案名稱",
  executor: "執行人",
  itemStatus: "項目狀態",
  taskName: "工項",
  itemContent: "項目內容",
  plannedStart: "預計開始",
  plannedEnd: "預計完成",
  actualCompleted: "實際完成",
  notes: "備註",
}

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

// 可查看封存紀錄與執行封存的 RD 管理角色。
const RD_MANAGER_ROLE_KEYS = ["super", "boss", "rd_leader"]

const RDPage = () => {
  // 依登入角色判斷是否開放 RD 週報管理功能。
  const roleKey = getRoleKey()
  const canManageRD = RD_MANAGER_ROLE_KEYS.includes(roleKey ?? "")

  // 管理 RD 週報頁籤、工項清單、歷史資料、紀錄與篩選排序狀態。
  const [activeTab, setActiveTab] = useState<PMTabKey>("ongoing")
  const [reports, setReports] = useState<RDReport[]>([])
  const [historyRecords, setHistoryRecords] = useState<RDHistoryRecord[]>([])
  const [editLogs, setEditLogs] = useState<RDEditLog[]>([])
  const [archiveLogs, setArchiveLogs] = useState<RDArchiveLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [pendingDeleteReport, setPendingDeleteReport] = useState<RDReport | null>(null)
  const [currentEditorName, setCurrentEditorName] = useState("Josh")
  const [currentWeekBase] = useState(new Date())
  const [vendorFilter, setVendorFilter] = useState("")
  const [executorFilter, setExecutorFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [sortField, setSortField] = useState<RDSortField>("vendor")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [historySearch, setHistorySearch] = useState("")
  const [selectedWeek, setSelectedWeek] = useState("all")

  // 固定以進入頁面當下日期計算本週範圍。
  const currentWeek = getCurrentWeekRange(currentWeekBase)

  // 一次載入 RD 工項、歷史週報、編輯紀錄與管理者封存紀錄。
  const fetchRDData = async () => {
    setErrorMessage("")
    const [reportsRes, historyRes, editLogsRes, archiveLogsRes] = await Promise.all([
      getRDReportsAPI(),
      getRDHistoryAPI(),
      getRDEditLogsAPI(),
      canManageRD ? getRDArchiveLogsAPI() : Promise.resolve({ status: 0, data: [] }),
    ])

    if (
      reportsRes.status !== 0 ||
      historyRes.status !== 0 ||
      editLogsRes.status !== 0 ||
      archiveLogsRes.status !== 0
    ) {
      setErrorMessage("讀取 RD 週報資料失敗，請確認後端 API 與資料庫狀態")
      return
    }

    setReports(reportsRes.data)
    setHistoryRecords(historyRes.data)
    setEditLogs(editLogsRes.data as RDEditLog[])
    setArchiveLogs(archiveLogsRes.data as RDArchiveLog[])
  }

  useEffect(() => {
    // 避免元件卸載後，非同步載入完成仍更新 loading 狀態。
    let ignore = false

    // 初次進入頁面時載入 RD 週報資料，並統一控制載入狀態。
    const load = async () => {
      setIsLoading(true)
      await fetchRDData()
      if (!ignore) {
        setIsLoading(false)
      }
    }

    void load()
    return () => {
      ignore = true
    }
  }, [])

  // 篩出目前仍需在進行中工作表維護的 RD 工項。
  const activeReports = useMemo(
    () => reports.filter((report) => RD_ACTIVE_STATUSES.includes(report.itemStatus)),
    [reports]
  )
  // 篩出已完成確認的 RD 工項，供已確認完成頁籤顯示。
  const closedReports = useMemo(
    () => reports.filter((report) => RD_CLOSED_STATUSES.includes(report.itemStatus)),
    [reports]
  )

  // 提供頁籤顯示各分類筆數。
  const counts: Record<PMTabKey, number> = {
    ongoing: activeReports.length,
    closed: closedReports.length,
    history: historyRecords.length,
  }

  // 處理表格欄位更新，成功後同步更新清單與編輯紀錄。
  const handleFieldChange = async <K extends keyof RDReport>(
    reportId: number,
    field: K,
    value: RDReport[K]
  ) => {
    const target = reports.find((report) => report.id === reportId)
    if (!target || target[field] === value) {
      return
    }

    if (field === "itemStatus" && value === "confirmed_done") {
      const confirmed = window.confirm(
        `確認將「${target.projectName} / ${target.taskName || "未命名工項"}」標記為${RD_STATUS_LABEL[value as RDItemStatus]}？`
      )
      if (!confirmed) {
        await fetchRDData()
        return
      }
    }

    const response = await updateRDReportAPI(reportId, {
      [field]: value,
      editedByName: currentEditorName.trim() || "系統",
    } as Partial<RDReport> & { editedByName: string })

    if (response.status !== 0) {
      setErrorMessage("更新 RD 工項失敗，已重新載入後端資料")
      await fetchRDData()
      return
    }

    setReports((prev) => prev.map((report) => (report.id === reportId ? response.data : report)))
    const editLogsRes = await getRDEditLogsAPI()
    if (editLogsRes.status === 0) {
      setEditLogs(editLogsRes.data as RDEditLog[])
    }
  }

  // 建立一筆預設 RD 工項，讓使用者可直接在表格中編輯內容。
  const handleAddReport = async () => {
    const response = await createRDReportAPI({
      vendor: "",
      projectName: "新 RD 項目",
      executor: "",
      itemStatus: "planning",
      taskName: "",
      itemContent: "",
      plannedStart: "",
      plannedEnd: "",
      actualCompleted: "",
      notes: "",
    })

    if (response.status !== 0) {
      setErrorMessage("新增 RD 工項失敗，請確認後端 API 與資料庫狀態")
      return
    }

    setReports((prev) => [response.data, ...prev])
    setActiveTab("ongoing")
  }

  // 暫存要刪除的工項，先交由確認視窗完成二次確認。
  const handleDeleteReport = (reportId: number) => {
    const target = reports.find((report) => report.id === reportId)
    if (!target) {
      return
    }

    setPendingDeleteReport(target)
  }

  // 確認後呼叫刪除 API，完成後重新載入後端最新資料。
  const confirmDeleteReport = async () => {
    if (!pendingDeleteReport) {
      return
    }

    const response = await deleteRDReportAPI(pendingDeleteReport.id)
    if (response.status !== 0) {
      setErrorMessage("刪除 RD 工項失敗，已重新載入後端資料")
      setPendingDeleteReport(null)
      await fetchRDData()
      return
    }

    setPendingDeleteReport(null)
    await fetchRDData()
  }

  // 將目前進行中的 RD 工項封存成本週歷史週報。
  const handleArchiveWeek = async () => {
    if (activeReports.length === 0) {
      return
    }

    const confirmed = window.confirm(
      `確認封存 ${currentWeek.weekStartDate} ~ ${currentWeek.weekEndDate} 的 RD 週報資料？`
    )
    if (!confirmed) {
      return
    }

    const response = await archiveRDWeekAPI(currentEditorName.trim() || "系統")
    if (response.status !== 0) {
      setErrorMessage("封存 RD 週報失敗，請確認後端 API 與資料庫狀態")
      return
    }

    await fetchRDData()
    setActiveTab("history")
  }

  // 依目前篩選條件與排序設定產生工作表實際顯示資料。
  const tableReports = useMemo(() => {
    const normalizedVendor = vendorFilter.trim().toLowerCase()
    const normalizedExecutor = executorFilter.trim().toLowerCase()
    const normalizedStatus = statusFilter.trim().toLowerCase()
    const filtered = activeReports.filter((report) => {
      const vendorMatch = normalizedVendor === "" || report.vendor.toLowerCase().includes(normalizedVendor)
      const executorMatch = normalizedExecutor === "" || report.executor.toLowerCase().includes(normalizedExecutor)
      const statusLabel = RD_STATUS_LABEL[report.itemStatus].toLowerCase()
      const statusMatch =
        normalizedStatus === "" ||
        report.itemStatus.toLowerCase().includes(normalizedStatus) ||
        statusLabel.includes(normalizedStatus)
      return vendorMatch && executorMatch && statusMatch
    })

    return [...filtered].sort((left, right) => {
      const leftValue = sortField === "itemStatus" ? RD_STATUS_LABEL[left.itemStatus] : left[sortField]
      const rightValue = sortField === "itemStatus" ? RD_STATUS_LABEL[right.itemStatus] : right[sortField]
      const result = String(leftValue).localeCompare(String(rightValue), "zh-TW", { numeric: true })
      return sortDirection === "asc" ? result : -result
    })
  }, [activeReports, executorFilter, sortDirection, sortField, statusFilter, vendorFilter])

  // 從歷史週報整理可選週次。
  const historyWeekOptions = useMemo(
    () => Array.from(new Set(historyRecords.map((record) => createWeekRangeLabel(record.weekStartDate, record.weekEndDate)))),
    [historyRecords]
  )

  // 依週次與關鍵字篩選歷史週報。
  const filteredHistory = useMemo(() => {
    return historyRecords.filter((record) => {
      const weekLabel = createWeekRangeLabel(record.weekStartDate, record.weekEndDate)
      const weekMatch = selectedWeek === "all" || weekLabel === selectedWeek
      const searchValue = historySearch.trim().toLowerCase()
      const searchMatch =
        searchValue === "" ||
        record.projectName.toLowerCase().includes(searchValue) ||
        record.vendor.toLowerCase().includes(searchValue) ||
        record.executor.toLowerCase().includes(searchValue)
      return weekMatch && searchMatch
    })
  }, [historyRecords, historySearch, selectedWeek])

  // 將歷史資料依週次插入分組列，讓表格可用週次分段顯示。
  const groupedHistoryRows = useMemo(() => {
    const rows: Array<
      | { type: "week"; weekLabel: string; id: string }
      | { type: "record"; record: RDHistoryRecord; id: number }
    > = []
    let currentWeekLabel = ""

    filteredHistory.forEach((record) => {
      const weekLabel = createWeekRangeLabel(record.weekStartDate, record.weekEndDate)
      if (weekLabel !== currentWeekLabel) {
        rows.push({ type: "week", weekLabel, id: weekLabel })
        currentWeekLabel = weekLabel
      }
      rows.push({ type: "record", record, id: record.id })
    })

    return rows
  }, [filteredHistory])

  // 將已完成 RD 工項轉成共用的已結案表格資料格式。
  const closedProjects = useMemo(
    () =>
      closedReports.map((report) => ({
        id: report.id,
        projectName: `${report.projectName} / ${report.taskName || "未命名工項"}`,
        vendor: report.vendor,
        manager: report.executor,
        stage: "closed" as const,
        priority: "medium" as const,
        summary: report.itemContent,
        plannedExecution: report.plannedStart,
        actualExecution: report.actualCompleted,
        lastWeekProgress: "",
        thisWeekTodo: "",
        notes: report.notes,
        executionTime: `${report.plannedStart} ~ ${report.plannedEnd}`,
        assistants: "",
        closedAt: report.closedAt,
        cancelledAt: report.cancelledAt,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      })),
    [closedReports]
  )

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
          <PMTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            counts={counts}
            labels={{ ongoing: "進行中工項", closed: "已確認完成", history: "歷史週報" }}
          />
          <div className="flex flex-wrap items-center gap-3">
            {canManageRD && (
              <ArchiveWeekButton onClick={handleArchiveWeek} disabled={activeReports.length === 0} />
            )}
            <AddProjectButton onClick={handleAddReport} />
          </div>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-base font-semibold text-rose-700">
            {errorMessage}
          </div>
        )}

        {isLoading && (
          <div className="mt-5 rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base font-semibold text-slate-600">
            載入 RD 週報資料中...
          </div>
        )}

        {activeTab === "ongoing" && (
          <div className="mt-6">
            <div className="mb-5 grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-300 xl:grid-cols-6">
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">編輯人員</div>
                <Input value={currentEditorName} onChange={(e) => setCurrentEditorName(e.target.value)} placeholder="輸入目前編輯人員" />
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">廠商</div>
                <Input value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} placeholder="輸入廠商" />
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">執行人</div>
                <Input value={executorFilter} onChange={(e) => setExecutorFilter(e.target.value)} placeholder="輸入執行人" />
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">項目狀態</div>
                <Input value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="輸入或選擇狀態" />
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">排序欄位</div>
                <Select value={sortField} onValueChange={(value) => setSortField(value as RDSortField)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendor">廠商</SelectItem>
                    <SelectItem value="executor">執行人</SelectItem>
                    <SelectItem value="itemStatus">項目狀態</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">排序方向</div>
                <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as SortDirection)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">升冪</SelectItem>
                    <SelectItem value="desc">降冪</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <RDTable reports={tableReports} onFieldChange={handleFieldChange} onDeleteReport={handleDeleteReport} />

            <div className="mt-5 rounded-2xl bg-white p-6 ring-1 ring-slate-300">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">編輯紀錄</h3>
                  <p className="mt-2 text-base leading-7 text-slate-500">當週暫存紀錄，管理人員按下封存後會自動清空。</p>
                </div>
                <div className="rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">最近 {editLogs.length} 筆</div>
              </div>
              <div className="mt-5 overflow-x-auto rounded-[1.25rem] border border-slate-400">
                <table className="min-w-[980px] w-full border-collapse text-center">
                  <thead className="bg-slate-200 text-base font-bold text-slate-800">
                    <tr>
                      <th className="border-b border-slate-400 px-5 py-4">編輯人員</th>
                      <th className="border-b border-slate-400 px-5 py-4">修改時間</th>
                      <th className="border-b border-slate-400 px-5 py-4">項目</th>
                      <th className="border-b border-slate-400 px-5 py-4">欄位</th>
                      <th className="border-b border-slate-400 px-5 py-4">舊值</th>
                      <th className="border-b border-slate-400 px-5 py-4">新值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editLogs.map((log) => (
                      <tr key={log.id} className="border-t border-slate-300 align-middle hover:bg-slate-100/80">
                        <td className="border-r border-slate-300 px-5 py-4 text-base font-medium text-slate-900">{log.editedByName}</td>
                        <td className="border-r border-slate-300 px-5 py-4 text-base text-slate-700">{log.editedAt}</td>
                        <td className="border-r border-slate-300 px-5 py-4 text-base font-medium text-slate-900">{log.projectName}</td>
                        <td className="border-r border-slate-300 px-5 py-4 text-base text-slate-700">{fieldLabelMap[log.fieldKey as keyof RDReport] ?? log.fieldLabel}</td>
                        <td className="border-r border-slate-300 px-5 py-4 text-base text-slate-700">{log.oldValue || "-"}</td>
                        <td className="px-5 py-4 text-base text-slate-700">{log.newValue || "-"}</td>
                      </tr>
                    ))}
                    {editLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-14 text-center text-base text-slate-600">目前還沒有編輯紀錄，修改任一欄位後會顯示在這裡。</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {canManageRD && (
              <div className="mt-5 rounded-2xl bg-white p-6 ring-1 ring-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">封存紀錄</h3>
                    <p className="mt-2 text-base leading-7 text-slate-500">保留每次封存的時間、人員與週次範圍，供管理追蹤使用。</p>
                  </div>
                  <div className="rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">累計 {archiveLogs.length} 筆</div>
                </div>
                <div className="mt-5 overflow-x-auto rounded-[1.25rem] border border-slate-400">
                  <table className="min-w-[760px] w-full border-collapse text-center">
                    <thead className="bg-slate-200 text-base font-bold text-slate-800">
                      <tr>
                        <th className="border-b border-slate-400 px-5 py-4">封存人員</th>
                        <th className="border-b border-slate-400 px-5 py-4">封存時間</th>
                        <th className="border-b border-slate-400 px-5 py-4">週次</th>
                        <th className="border-b border-slate-400 px-5 py-4">封存工項數</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archiveLogs.map((log) => (
                        <tr key={log.id} className="border-t border-slate-300 align-middle hover:bg-slate-100/80">
                          <td className="border-r border-slate-300 px-5 py-4 text-base font-medium text-slate-900">{log.archivedByName}</td>
                          <td className="border-r border-slate-300 px-5 py-4 text-base text-slate-700">{log.archivedAt}</td>
                          <td className="border-r border-slate-300 px-5 py-4 text-base text-slate-700">{log.weekRange}</td>
                          <td className="px-5 py-4 text-base text-slate-700">{log.archivedCount}</td>
                        </tr>
                      ))}
                      {archiveLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-14 text-center text-base text-slate-600">目前還沒有封存紀錄，按下封存後會顯示在這裡。</td>
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
              <h2 className="text-2xl font-bold text-slate-900">已確認完成</h2>
              <p className="mt-2 text-base leading-7 text-slate-500">此區偏查詢用途，當項目狀態切換為已確認完成後，會自動移出進行中工作表。</p>
            </div>
            <ClosedProjectsTable projects={closedProjects} />
          </div>
        )}

        {activeTab === "history" && (
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 rounded-2xl bg-white p-6 ring-1 ring-slate-300 xl:grid-cols-[1.4fr_repeat(2,minmax(0,1fr))]">
              <Input value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="搜尋專案名稱 / 廠商 / 執行人" />
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-full"><SelectValue placeholder="週次篩選" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部週次</SelectItem>
                  {historyWeekOptions.map((week) => (
                    <SelectItem key={week} value={week}>{week}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-md border border-slate-300 bg-slate-50 px-4 text-sm text-slate-600">
                歷史資料共 {filteredHistory.length} 筆
              </div>
            </div>
            <div className="overflow-x-auto rounded-[1.5rem] border border-slate-400 bg-white shadow-sm">
              <table className="min-w-[1380px] w-full text-center">
                <thead className="bg-slate-200 text-base font-bold text-slate-800">
                  <tr>
                    {["週次", "廠商", "專案名稱", "執行人", "項目狀態", "工項", "項目內容", "預計開始", "預計完成", "實際完成", "備註"].map((label) => (
                      <th key={label} className="border-b border-slate-400 px-5 py-4">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupedHistoryRows.map((row) => {
                    if (row.type === "week") {
                      return (
                        <tr key={row.id} className="border-y-4 border-slate-700 bg-slate-800">
                          <td colSpan={11} className="px-6 py-4 text-left text-xl font-extrabold tracking-wide text-white">
                            {row.weekLabel}
                          </td>
                        </tr>
                      )
                    }

                    const { record } = row
                    return (
                      <tr key={record.id} className="border-t border-slate-300 align-middle hover:bg-slate-100/80">
                        <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">{record.weekStartDate} ~ {record.weekEndDate}</td>
                        <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">{record.vendor}</td>
                        <td className="border-r border-slate-300 px-5 py-4 text-lg font-medium text-slate-900">{record.projectName}</td>
                        <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">{record.executor}</td>
                        <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">{RD_STATUS_LABEL[record.itemStatusSnapshot]}</td>
                        <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">{record.taskNameSnapshot || "-"}</td>
                        <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">{record.itemContentSnapshot || "-"}</td>
                        <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">{record.plannedStartSnapshot || "-"}</td>
                        <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">{record.plannedEndSnapshot || "-"}</td>
                        <td className="border-r border-slate-300 px-5 py-4 text-lg text-slate-700">{record.actualCompletedSnapshot || "-"}</td>
                        <td className="px-5 py-4 text-lg text-slate-700">{record.notesSnapshot || "-"}</td>
                      </tr>
                    )
                  })}
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-14 text-center text-base text-slate-600">沒有符合篩選條件的歷史週報資料</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pendingDeleteReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-6 text-center shadow-2xl shadow-slate-900/20">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-lg font-bold text-rose-700">
                !
              </div>
              <h3 className="mt-4 text-2xl font-bold text-slate-900">確認刪除 RD 工項</h3>
              <p className="mt-3 text-base leading-7 text-slate-600">
                將刪除「{pendingDeleteReport.projectName} / {pendingDeleteReport.taskName || "未命名工項"}」以及相關歷史與編輯紀錄。
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-base font-semibold text-slate-700 transition hover:bg-slate-100"
                  onClick={() => setPendingDeleteReport(null)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-rose-700"
                  onClick={confirmDeleteReport}
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

export default RDPage
