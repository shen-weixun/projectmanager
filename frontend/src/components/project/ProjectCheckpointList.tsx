import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, ChevronDown, Plus, Trash2 } from "lucide-react"
import { toast } from "react-toastify"
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
import type { EditableCheckpointItem } from "@/components/project/projectDetailTypes"
import {
  createProjectOptionAPI,
  createProjectCheckpointAPI,
  deleteProjectCheckpointAPI,
  updateProjectCheckpointAPI,
} from "@/services/apis"

type ProjectCheckpointListProps = {
  projectId: number
  isEditing: boolean
  items: EditableCheckpointItem[]
  statusOptions: string[]
  onStatusOptionsChange: (statuses: string[]) => void
  onItemsChange: (items: EditableCheckpointItem[]) => void
  onError: (error: unknown) => void
}

// 新增查核點表單的預設值。
const emptyCheckpoint = {
  checkpoint: "",
  reviewDate: "",
  assignee: "",
  status: "尚未開始",
  note: "",
  description: "",
}

const ProjectCheckpointList = ({
  projectId,
  isEditing,
  items,
  statusOptions,
  onStatusOptionsChange,
  onItemsChange,
  onError,
}: ProjectCheckpointListProps) => {
  // 管理新增查核點表單、狀態選單與目前正在儲存的列。
  const [newCheckpoint, setNewCheckpoint] = useState(emptyCheckpoint)
  const [activeStatusPicker, setActiveStatusPicker] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())

  // 狀態選項由後端選項與目前輸入值組成，避免和專案主表狀態互相影響。
  const checkpointStatusOptions = useMemo(() => {
    const values = [
      ...statusOptions,
      newCheckpoint.status,
    ]
    return Array.from(new Set(values.map((status) => status.trim()).filter(Boolean)))
  }, [newCheckpoint.status, statusOptions])

  // 新狀態會正式寫入後端選項表，之後其他專案也能從 API 撈到。
  const ensureStatusOption = async (status: string) => {
    const value = status.trim()
    if (!value || statusOptions.includes(value)) return

    const response = await createProjectOptionAPI("checkpoint_status", value)
    if (response.status === -1) {
      onError(response.error)
      return
    }
    onStatusOptionsChange([...statusOptions, value])
  }

  useEffect(() => {
    // 離開編輯模式時清空新增檢查點表單，避免下次編輯帶入舊資料。
    if (!isEditing) {
      setNewCheckpoint(emptyCheckpoint)
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

  // 新增查核點並把後端回傳資料同步到父層清單。
  const handleAdd = async () => {
    const checkpoint = newCheckpoint.checkpoint.trim()
    if (!checkpoint) {
      toast.error("查核點不可為空", { position: "top-center" })
      return
    }

    const response = await createProjectCheckpointAPI(projectId, {
      checkpoint,
      reviewDate: newCheckpoint.reviewDate,
      assignee: newCheckpoint.assignee.trim(),
      status: newCheckpoint.status.trim() || "尚未開始",
      note: newCheckpoint.note.trim(),
      description: newCheckpoint.description.trim(),
    })

    if (response.status === -1) {
      onError(response.error)
      return
    }

    await ensureStatusOption(response.data.status)
    onItemsChange([...items, response.data])
    setNewCheckpoint(emptyCheckpoint)
    setActiveStatusPicker(null)
  }

  // 先在前端即時更新指定欄位，等 blur 時再送出儲存。
  const handleChange = (rowId: number, key: keyof Omit<EditableCheckpointItem, "id">, value: string) => {
    onItemsChange(items.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)))
  }

  // 欄位離開焦點時驗證並更新該筆查核點。
  const handleBlur = async (row: EditableCheckpointItem) => {
    if (!row.checkpoint.trim()) {
      toast.error("查核點不可為空", { position: "top-center" })
      return
    }

    setSaving(row.id, true)
    const response = await updateProjectCheckpointAPI(projectId, row.id, {
      checkpoint: row.checkpoint.trim(),
      reviewDate: row.reviewDate,
      assignee: row.assignee.trim(),
      status: row.status.trim() || "尚未開始",
      note: row.note.trim(),
      description: row.description.trim(),
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
  const handleStatusSelect = async (row: EditableCheckpointItem, status: string) => {
    setActiveStatusPicker(null)
    const nextRow = { ...row, status }
    onItemsChange(items.map((item) => (item.id === row.id ? nextRow : item)))
    await handleBlur(nextRow)
  }

  // 刪除指定查核點，成功後同步移除父層清單資料。
  const handleDelete = async (rowId: number) => {
    const response = await deleteProjectCheckpointAPI(projectId, rowId)
    if (response.status === -1) {
      onError(response.error)
      return
    }
    onItemsChange(items.filter((row) => row.id !== rowId))
  }

  return (
    <section className={`${cardBaseClass} border-t-emerald-600`}>
      <div className={`${cardHeaderBaseClass} bg-emerald-50`}>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-700" />
          <h3 className="text-emerald-950">專案查核點</h3>
        </div>
      </div>

      <div className={cardBodyClass}>
        {isEditing && (
          <div className="mb-8 rounded-lg border border-slate-300 bg-slate-100 p-5">
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(14rem,2fr)_12rem_minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_auto]">
              <input className={baseInputClass} placeholder="查核點名稱" value={newCheckpoint.checkpoint} onChange={(e) => setNewCheckpoint({ ...newCheckpoint, checkpoint: e.target.value })} />
              <input type="date" className={baseInputClass} value={newCheckpoint.reviewDate} onChange={(e) => setNewCheckpoint({ ...newCheckpoint, reviewDate: e.target.value })} />
              <input className={baseInputClass} placeholder="項目負責人" value={newCheckpoint.assignee} onChange={(e) => setNewCheckpoint({ ...newCheckpoint, assignee: e.target.value })} />
              <div className={selectWrapperClass}>
                <input className={`${baseInputClass} pr-8`} placeholder="狀態" value={newCheckpoint.status} onBlur={closeStatusPickerSoon} onChange={(e) => setNewCheckpoint({ ...newCheckpoint, status: e.target.value })} onFocus={() => setActiveStatusPicker("new")} />
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                {activeStatusPicker === "new" && (
                  <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg">
                    {checkpointStatusOptions.map((status) => (
                      <button key={status} type="button" className="block w-full px-3 py-2 text-left text-base font-semibold text-slate-800 transition-colors hover:bg-slate-100" onMouseDown={(e) => e.preventDefault()} onClick={() => { setNewCheckpoint({ ...newCheckpoint, status }); setActiveStatusPicker(null) }}>
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input className={baseInputClass} placeholder="簡短備註" value={newCheckpoint.note} onChange={(e) => setNewCheckpoint({ ...newCheckpoint, note: e.target.value })} />
              <Button className="h-[46px] whitespace-nowrap bg-slate-800 px-6 text-base font-bold text-white hover:bg-slate-900" onClick={handleAdd}>
                <Plus className="mr-2 h-5 w-5" /> 新增
              </Button>
            </div>
            <textarea className={`${baseInputClass} min-h-[80px]`} placeholder="詳細查核描述..." value={newCheckpoint.description} onChange={(e) => setNewCheckpoint({ ...newCheckpoint, description: e.target.value })} />
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-300">
          <table className="w-full text-base">
            <thead>
              <tr>
                <th className={`${tableHeaderClass} w-[28%] text-left`}>查核點</th>
                <th className={`${tableHeaderClass} w-[14%]`}>查核時間</th>
                <th className={`${tableHeaderClass} w-[14%]`}>項目負責人</th>
                <th className={`${tableHeaderClass} w-[12%]`}>狀態</th>
                <th className={`${tableHeaderClass} w-[14%]`}>備註</th>
                <th className={tableHeaderClass}>查核描述</th>
                {isEditing && <th className={`${tableHeaderClass} w-[8%]`}>操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={isEditing ? 7 : 6} className="py-10 text-center font-medium text-slate-500">尚未建立任何查核點</td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50">
                    <td className={tableCellClass}><input className={centerInputClass} value={row.checkpoint} disabled={!isEditing || savingIds.has(row.id)} onBlur={() => handleBlur(row)} onChange={(e) => handleChange(row.id, "checkpoint", e.target.value)} /></td>
                    <td className={tableCellClass}><input type={isEditing ? "date" : "text"} className={centerInputClass} value={row.reviewDate} disabled={!isEditing || savingIds.has(row.id)} onBlur={() => handleBlur(row)} onChange={(e) => handleChange(row.id, "reviewDate", e.target.value)} /></td>
                    <td className={tableCellClass}><input className={centerInputClass} value={row.assignee} disabled={!isEditing || savingIds.has(row.id)} onBlur={() => handleBlur(row)} onChange={(e) => handleChange(row.id, "assignee", e.target.value)} /></td>
                    <td className={tableCellClass}>
                      <div className={selectWrapperClass}>
                        <input className={`${centerInputClass} pr-8 disabled:pr-0`} value={row.status} disabled={!isEditing || savingIds.has(row.id)} onBlur={() => { closeStatusPickerSoon(); void handleBlur(row) }} onChange={(e) => handleChange(row.id, "status", e.target.value)} onFocus={() => setActiveStatusPicker(`row-${row.id}`)} />
                        {isEditing && <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />}
                        {isEditing && activeStatusPicker === `row-${row.id}` && (
                          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg">
                            {checkpointStatusOptions.map((status) => (
                              <button key={status} type="button" className="block w-full px-3 py-2 text-left text-base font-semibold text-slate-800 transition-colors hover:bg-slate-100" onMouseDown={(e) => e.preventDefault()} onClick={() => void handleStatusSelect(row, status)}>
                                {status}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={tableCellClass}><input className={centerInputClass} value={row.note} disabled={!isEditing || savingIds.has(row.id)} onBlur={() => handleBlur(row)} onChange={(e) => handleChange(row.id, "note", e.target.value)} /></td>
                    <td className={tableCellClass}><textarea className={`${centerInputClass} min-h-[50px] resize-y`} value={row.description} disabled={!isEditing || savingIds.has(row.id)} onBlur={() => handleBlur(row)} onChange={(e) => handleChange(row.id, "description", e.target.value)} /></td>
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
      </div>
    </section>
  )
}

export default ProjectCheckpointList
