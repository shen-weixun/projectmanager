import { useEffect, useMemo, useState } from "react"
import { CalendarDays, ChevronDown, Plus, Trash2 } from "lucide-react"
import { toast } from "react-toastify"
import GanttChart from "@/components/Gantt"
import type { GanttTask } from "@/components/Gantt"
import { Button } from "@/components/ui/button"
import {
  baseInputClass,
  cardBaseClass,
  cardBodyClass,
  cardHeaderBaseClass,
  centerInputClass,
  selectWrapperClass,
  tableCellClass,
  tableHeaderClass,
} from "@/components/project/projectDetailStyles"
import type { EditableScheduleItem, ProjectDetailForm } from "@/components/project/projectDetailTypes"
import {
  createProjectOptionAPI,
  createProjectScheduleAPI,
  deleteProjectScheduleAPI,
  updateProjectScheduleAPI,
} from "@/services/apis"

type ProjectScheduleListProps = {
  projectId: number
  form: ProjectDetailForm
  isEditing: boolean
  items: EditableScheduleItem[]
  statusOptions: string[]
  onStatusOptionsChange: (statuses: string[]) => void
  getStatusStyle: (status?: string) => {
    progress: number
    progressColor: string
    progressSelectedColor: string
    backgroundColor: string
    backgroundSelectedColor: string
  }
  onItemsChange: (items: EditableScheduleItem[]) => void
  onError: (error: unknown) => void
}

// 新增時程表單的預設值。
const emptySchedule = {
  name: "",
  assignee: "",
  startDate: "",
  endDate: "",
  status: "尚未開始",
}

const ProjectScheduleList = ({
  projectId,
  form,
  isEditing,
  items,
  statusOptions,
  onStatusOptionsChange,
  getStatusStyle,
  onItemsChange,
  onError,
}: ProjectScheduleListProps) => {
  // 管理新增時程表單、狀態選單與目前正在儲存的列。
  const [newSchedule, setNewSchedule] = useState(emptySchedule)
  const [activeStatusPicker, setActiveStatusPicker] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())

  // 狀態選項由後端選項與目前輸入值組成，避免和專案主表狀態互相影響。
  const scheduleStatusOptions = useMemo(() => {
    const values = [
      ...statusOptions,
      newSchedule.status,
    ]
    return Array.from(new Set(values.map((status) => status.trim()).filter(Boolean)))
  }, [newSchedule.status, statusOptions])

  // 新狀態會正式寫入後端選項表，之後其他專案也能從 API 撈到。
  const ensureStatusOption = async (status: string) => {
    const value = status.trim()
    if (!value || statusOptions.includes(value)) return

    const response = await createProjectOptionAPI("schedule_status", value)
    if (response.status === -1) {
      onError(response.error)
      return
    }
    onStatusOptionsChange([...statusOptions, value])
  }

  useEffect(() => {
    // 離開編輯模式時清空新增時程表單，避免下次編輯帶入舊資料。
    if (!isEditing) {
      setNewSchedule(emptySchedule)
      setActiveStatusPicker(null)
    }
  }, [isEditing])

  // 延遲關閉狀態選單，讓滑鼠點選選項事件可以先完成。
  const closeStatusPickerSoon = () => {
    window.setTimeout(() => setActiveStatusPicker(null), 120)
  }

  // 記錄單列是否正在儲存，用來暫時停用該列輸入。
  const setSaving = (id: number, saving: boolean) => {
    setSavingIds((prev) => {
      const next = new Set(prev)
      if (saving) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  // 將專案時程清單轉成甘特圖資料，沒有時程時改用專案主檔日期顯示。
  const ganttTasks: GanttTask[] = useMemo(() => {
    const scheduleTasks = items
      .filter((item) => item.startDate && item.endDate)
      .map((item) => {
        const style = getStatusStyle(item.status)
        return {
          id: String(item.id),
          name: item.name,
          customer: form.customer,
          projectName: form.name,
          assignee: item.assignee,
          planTime: item.startDate,
          group: form.group,
          type: "task" as const,
          start: new Date(item.startDate),
          end: new Date(item.endDate),
          progress: style.progress,
          customFields: form.customFields.filter((field) => field.label.trim()),
          styles: {
            progressColor: style.progressColor,
            progressSelectedColor: style.progressSelectedColor,
            backgroundColor: style.backgroundColor,
            backgroundSelectedColor: style.backgroundSelectedColor,
          },
        }
      })

    if (scheduleTasks.length > 0) {
      return scheduleTasks
    }

    const projectStartDate = form.planStartDate || form.startDate || form.preStartDate
    if (!projectStartDate || !form.dueDate) {
      return []
    }

    const style = getStatusStyle(form.status)
    return [{
      id: `project-${form.id}`,
      name: form.name,
      customer: form.customer,
      projectName: form.name,
      assignee: form.projectOwner,
      planLabel: form.planStartDate ? "計劃時間" : "專案開始時間",
      planTime: projectStartDate,
      group: form.group,
      type: "task" as const,
      start: new Date(projectStartDate),
      end: new Date(form.dueDate),
      progress: style.progress,
      customFields: form.customFields.filter((field) => field.label.trim()),
      styles: {
        progressColor: style.progressColor,
        progressSelectedColor: style.progressSelectedColor,
        backgroundColor: style.backgroundColor,
        backgroundSelectedColor: style.backgroundSelectedColor,
      },
    }]
  }, [form, getStatusStyle, items])

  // 從時程清單整理出人員標注，供甘特圖上方快速辨識。
  const assigneeTags = useMemo(
    () => Array.from(new Set(items.map((item) => item.assignee.trim()).filter(Boolean))),
    [items]
  )

  // 新增時程並把後端回傳資料同步到父層清單。
  const handleAdd = async () => {
    const name = newSchedule.name.trim()
    if (!name || !newSchedule.startDate || !newSchedule.endDate) {
      toast.error("時程名稱、開始時間與結束時間不可為空", { position: "top-center" })
      return
    }
    if (newSchedule.startDate > newSchedule.endDate) {
      toast.error("時程開始時間不能晚於結束時間", { position: "top-center" })
      return
    }

    const response = await createProjectScheduleAPI(projectId, {
      name,
      assignee: newSchedule.assignee.trim(),
      startDate: newSchedule.startDate,
      endDate: newSchedule.endDate,
      status: newSchedule.status,
    })

    if (response.status === -1) {
      onError(response.error)
      return
    }

    await ensureStatusOption(response.data.status)
    onItemsChange([...items, response.data])
    setNewSchedule(emptySchedule)
    setActiveStatusPicker(null)
  }

  // 先在前端即時更新指定欄位，等 blur 或狀態選擇時再送出儲存。
  const handleChange = (rowId: number, key: keyof Omit<EditableScheduleItem, "id">, value: string) => {
    onItemsChange(items.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)))
  }

  // 欄位離開焦點時儲存該筆時程。
  const handleBlur = async (row: EditableScheduleItem) => {
    await saveRow(row)
  }

  // 驗證並更新單筆時程資料。
  const saveRow = async (row: EditableScheduleItem) => {
    if (!row.name.trim() || !row.startDate || !row.endDate) {
      toast.error("時程名稱、開始時間與結束時間不可為空", { position: "top-center" })
      return
    }
    if (row.startDate > row.endDate) {
      toast.error("時程開始時間不能晚於結束時間", { position: "top-center" })
      return
    }

    setSaving(row.id, true)
    const response = await updateProjectScheduleAPI(projectId, row.id, {
      name: row.name.trim(),
      assignee: row.assignee.trim(),
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
    })
    setSaving(row.id, false)

    if (response.status === -1) {
      onError(response.error)
      return
    }

    await ensureStatusOption(response.data.status)
    onItemsChange(items.map((item) => (item.id === row.id ? response.data : item)))
  }

  // 選擇狀態後立即更新前端清單並送出儲存。
  const handleStatusSelect = async (row: EditableScheduleItem, status: string) => {
    setActiveStatusPicker(null)
    const nextRow = { ...row, status }
    onItemsChange(items.map((item) => (item.id === row.id ? nextRow : item)))
    await saveRow(nextRow)
  }

  // 刪除指定時程，成功後同步移除父層清單資料。
  const handleDelete = async (rowId: number) => {
    const response = await deleteProjectScheduleAPI(projectId, rowId)
    if (response.status === -1) {
      onError(response.error)
      return
    }
    onItemsChange(items.filter((row) => row.id !== rowId))
  }

  return (
    <section className={`${cardBaseClass} border-t-violet-600`}>
      <div className={`${cardHeaderBaseClass} bg-violet-50`}>
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-violet-700" />
          <h3 className="text-violet-950">專案時程與甘特圖</h3>
        </div>
      </div>

      <div className={cardBodyClass}>
        {isEditing && (
          <div className="mb-8 rounded-lg border border-slate-300 bg-slate-100 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
              <input className={baseInputClass} placeholder="時程名稱" value={newSchedule.name} onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })} />
              <input className={baseInputClass} placeholder="項目負責人" value={newSchedule.assignee} onChange={(e) => setNewSchedule({ ...newSchedule, assignee: e.target.value })} />
              <input type="date" className={baseInputClass} value={newSchedule.startDate} onChange={(e) => setNewSchedule({ ...newSchedule, startDate: e.target.value })} />
              <input type="date" className={baseInputClass} value={newSchedule.endDate} onChange={(e) => setNewSchedule({ ...newSchedule, endDate: e.target.value })} />
              <div className={selectWrapperClass}>
                <input className={`${baseInputClass} pr-8`} placeholder="狀態" value={newSchedule.status} onBlur={closeStatusPickerSoon} onChange={(e) => setNewSchedule({ ...newSchedule, status: e.target.value })} onFocus={() => setActiveStatusPicker("new")} />
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                {activeStatusPicker === "new" && (
                  <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg">
                    {scheduleStatusOptions.map((status) => (
                      <button key={status} type="button" className="block w-full px-3 py-2 text-left text-base font-semibold text-slate-800 transition-colors hover:bg-slate-100" onMouseDown={(e) => e.preventDefault()} onClick={() => { setNewSchedule({ ...newSchedule, status }); setActiveStatusPicker(null) }}>
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button className="h-[46px] w-full bg-slate-800 text-base font-bold text-white hover:bg-slate-900" onClick={handleAdd}>
                <Plus className="mr-2 h-5 w-5" /> 新增時程
              </Button>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-300 bg-slate-50 px-5 py-4">
          <div className="flex flex-wrap items-center gap-5 text-base font-bold text-slate-700">
            {scheduleStatusOptions.map((status) => (
              <div key={status} className="inline-flex items-center gap-2.5">
                <span className="inline-block h-3.5 w-3.5 rounded-full shadow-sm" style={{ backgroundColor: getStatusStyle(status).progressColor }} />
                <span>{status}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-base text-slate-700">
            <span className="font-extrabold text-slate-900">人員標注：</span>
            {assigneeTags.length > 0 ? (
              assigneeTags.map((name) => <span key={name} className="rounded-md border border-slate-300 bg-white px-3 py-1 font-semibold">{name}</span>)
            ) : (
              <span className="font-medium">尚未設定</span>
            )}
          </div>
        </div>

        <div className="mb-8 overflow-x-auto rounded-lg border border-slate-300">
          <table className="w-full text-base">
            <thead>
              <tr>
                <th className={`${tableHeaderClass} w-[22%]`}>時程名稱</th>
                <th className={`${tableHeaderClass} w-[14%]`}>項目負責人</th>
                <th className={`${tableHeaderClass} w-[18%]`}>計劃開始時間</th>
                <th className={`${tableHeaderClass} w-[18%]`}>結束時間</th>
                <th className={`${tableHeaderClass} w-[12%]`}>狀態</th>
                {isEditing && <th className={`${tableHeaderClass} w-[10%]`}>操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={isEditing ? 6 : 5} className="py-10 text-center font-medium text-slate-500">尚未新增時程</td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50">
                    <td className={tableCellClass}><input className={centerInputClass} value={row.name} disabled={!isEditing || savingIds.has(row.id)} onBlur={() => handleBlur(row)} onChange={(e) => handleChange(row.id, "name", e.target.value)} /></td>
                    <td className={tableCellClass}><input className={centerInputClass} value={row.assignee} disabled={!isEditing || savingIds.has(row.id)} onBlur={() => handleBlur(row)} onChange={(e) => handleChange(row.id, "assignee", e.target.value)} /></td>
                    <td className={tableCellClass}><input type={isEditing ? "date" : "text"} className={centerInputClass} value={row.startDate} disabled={!isEditing || savingIds.has(row.id)} onBlur={() => handleBlur(row)} onChange={(e) => handleChange(row.id, "startDate", e.target.value)} /></td>
                    <td className={tableCellClass}><input type={isEditing ? "date" : "text"} className={centerInputClass} value={row.endDate} disabled={!isEditing || savingIds.has(row.id)} onBlur={() => handleBlur(row)} onChange={(e) => handleChange(row.id, "endDate", e.target.value)} /></td>
                    <td className={tableCellClass}>
                      <div className={selectWrapperClass}>
                        <input className={`${centerInputClass} pr-8 disabled:pr-0`} value={row.status} disabled={!isEditing || savingIds.has(row.id)} onBlur={() => { closeStatusPickerSoon(); void handleBlur(row) }} onChange={(e) => handleChange(row.id, "status", e.target.value)} onFocus={() => setActiveStatusPicker(`row-${row.id}`)} />
                        {isEditing && <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />}
                        {isEditing && activeStatusPicker === `row-${row.id}` && (
                          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg">
                            {scheduleStatusOptions.map((status) => (
                              <button key={status} type="button" className="block w-full px-3 py-2 text-left text-base font-semibold text-slate-800 transition-colors hover:bg-slate-100" onMouseDown={(e) => e.preventDefault()} onClick={() => void handleStatusSelect(row, status)}>
                                {status}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    {isEditing && (
                      <td className={`${tableCellClass} text-center`}>
                        <button type="button" onClick={() => handleDelete(row.id)} className="rounded-md p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          {ganttTasks.length > 0 ? (
            <GanttChart tasks={ganttTasks} variant="schedule" />
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-16 text-center text-base font-semibold text-slate-500">
              新增時程後將自動產生甘特圖
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default ProjectScheduleList
