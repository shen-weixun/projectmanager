import { useMemo, useState } from "react"
import { ChevronDown, Info, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  baseInputClass,
  cardBaseClass,
  cardBodyClass,
  cardHeaderBaseClass,
  labelClass,
  sectionTitleClass,
  selectWrapperClass,
} from "@/components/project/projectDetailStyles"
import type { EditableCustomField, ProjectDetailForm } from "@/components/project/projectDetailTypes"

type ProjectBaseInfoProps = {
  form: ProjectDetailForm
  isEditing: boolean
  categoryOptions: string[]
  groups: { id: number; groupName: string }[]
  statusOptions: string[]
  newCustomField: Pick<EditableCustomField, "label" | "value">
  onFormChange: (form: ProjectDetailForm) => void
  onNewCustomFieldChange: (field: Pick<EditableCustomField, "label" | "value">) => void
  onAddCustomField: () => void
  onCustomFieldChange: (fieldId: string, key: keyof Omit<EditableCustomField, "id">, value: string) => void
  onDeleteCustomField: (fieldId: string) => void
}

const ProjectBaseInfo = ({
  form,
  isEditing,
  categoryOptions,
  groups,
  statusOptions,
  newCustomField,
  onFormChange,
  onNewCustomFieldChange,
  onAddCustomField,
  onCustomFieldChange,
  onDeleteCustomField,
}: ProjectBaseInfoProps) => {
  // 控制專案類別與狀態自訂選單目前開啟的項目。
  const [activePicker, setActivePicker] = useState<"category" | "status" | null>(null)

  // 依目前輸入內容篩選可選的專案類別。
  const filteredCategories = useMemo(() => {
    const keyword = form.category.trim().toLowerCase()
    if (!keyword) return categoryOptions
    return categoryOptions.filter((category) =>
      category.toLowerCase().includes(keyword)
    )
  }, [categoryOptions, form.category])

  // 依目前輸入內容篩選可選的專案狀態。
  const filteredStatuses = useMemo(() => {
    const keyword = form.status.trim().toLowerCase()
    if (!keyword) return statusOptions
    return statusOptions.filter((status) =>
      status.toLowerCase().includes(keyword)
    )
  }, [statusOptions, form.status])

  // 延遲關閉選單，讓滑鼠點選選項事件可以先完成。
  const closePickerSoon = () => {
    window.setTimeout(() => setActivePicker(null), 120)
  }

  return (
    <section className={`${cardBaseClass} border-t-blue-600`}>
      <div className={`${cardHeaderBaseClass} bg-blue-50`}>
        <div className="flex items-center gap-3">
          <Info className="h-6 w-6 text-blue-700" />
          <h3 className="text-blue-950">基本資訊</h3>
        </div>
      </div>
      <div className={`${cardBodyClass} flex flex-col gap-10`}>
        <div>
          <h4 className={sectionTitleClass}>專案核心與時程</h4>
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>客戶</label>
              <input className={baseInputClass} value={form.customer} disabled={!isEditing} onChange={(e) => onFormChange({ ...form, customer: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>專案名稱</label>
              <input className={baseInputClass} value={form.name} disabled={!isEditing} onChange={(e) => onFormChange({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>專案類別</label>
              <div className={selectWrapperClass}>
                <input className={`${baseInputClass} pr-8 disabled:pr-0`} value={form.category} disabled={!isEditing} onBlur={closePickerSoon} onChange={(e) => { onFormChange({ ...form, category: e.target.value }); setActivePicker("category") }} onFocus={() => setActivePicker("category")} />
                {isEditing && <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />}
                {isEditing && activePicker === "category" && (
                  <div className="absolute z-50 mt-2 max-h-56 w-full overflow-y-auto overflow-x-hidden rounded-md border border-slate-300 bg-white shadow-lg">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((category) => (
                        <button key={category} type="button" className="block w-full px-3 py-2 text-left text-base font-semibold text-slate-800 transition-colors hover:bg-slate-100" onMouseDown={(e) => e.preventDefault()} onClick={() => { onFormChange({ ...form, category }); setActivePicker(null) }}>
                          {category}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-base font-semibold text-slate-500">無符合項目，可直接輸入新類別</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>負責組別</label>
              <input list="project-detail-groups" className={baseInputClass} value={form.group} disabled={!isEditing} onChange={(e) => onFormChange({ ...form, group: e.target.value })} />
              <datalist id="project-detail-groups">
                {groups.map((group) => <option key={group.id} value={group.groupName} />)}
              </datalist>
            </div>
            <div>
              <label className={labelClass}>專案負責人</label>
              <input className={baseInputClass} value={form.projectOwner} disabled={!isEditing} onChange={(e) => onFormChange({ ...form, projectOwner: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>專案狀態</label>
              <div className={selectWrapperClass}>
                <input className={`${baseInputClass} pr-8 disabled:pr-0`} value={form.status} disabled={!isEditing} onBlur={closePickerSoon} onChange={(e) => { onFormChange({ ...form, status: e.target.value }); setActivePicker("status") }} onFocus={() => setActivePicker("status")} />
                {isEditing && <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />}
                {isEditing && activePicker === "status" && (
                  <div className="absolute z-50 mt-2 max-h-56 w-full overflow-y-auto overflow-x-hidden rounded-md border border-slate-300 bg-white shadow-lg">
                    {filteredStatuses.length > 0 ? (
                      filteredStatuses.map((status) => (
                        <button key={status} type="button" className="block w-full px-3 py-2 text-left text-base font-semibold text-slate-800 transition-colors hover:bg-slate-100" onMouseDown={(e) => e.preventDefault()} onClick={() => { onFormChange({ ...form, status }); setActivePicker(null) }}>
                          {status}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-base font-semibold text-slate-500">無符合項目，可直接輸入新狀態</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>專案開始時間</label>
              <input type={isEditing ? "date" : "text"} className={baseInputClass} value={form.preStartDate} disabled={!isEditing} onChange={(e) => onFormChange({ ...form, preStartDate: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>計劃時間</label>
              <input
                type={isEditing ? "date" : "text"}
                className={baseInputClass}
                value={form.planStartDate || form.startDate}
                disabled={!isEditing}
                onChange={(e) => onFormChange({ ...form, planStartDate: e.target.value, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>結束時間</label>
              <input type={isEditing ? "date" : "text"} className={baseInputClass} value={form.dueDate} disabled={!isEditing} onChange={(e) => onFormChange({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
        </div>

        <div>
          <h4 className={sectionTitleClass}>地址資訊</h4>
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            <div>
              <label className={labelClass}>營登地址</label>
              <input className={baseInputClass} value={form.registeredAddress} disabled={!isEditing} onChange={(e) => onFormChange({ ...form, registeredAddress: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>通訊地址</label>
              <input className={baseInputClass} value={form.mailingAddress} disabled={!isEditing} onChange={(e) => onFormChange({ ...form, mailingAddress: e.target.value })} />
            </div>
          </div>
        </div>

        <div>
          <h4 className={sectionTitleClass}>聯絡窗口</h4>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {([1, 2, 3] as const).map((index) => {
              // 依聯絡人序號組出對應表單欄位 key，避免重複寫三組 JSX。
              const contactKey = `contact${index}` as const
              const phoneKey = `contactPhone${index}` as const
              return (
                <div key={index} className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <div>
                    <label className={labelClass}>聯絡人 {index}</label>
                    <input className={baseInputClass} value={form[contactKey]} disabled={!isEditing} onChange={(e) => onFormChange({ ...form, [contactKey]: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>聯絡人 {index} 電話</label>
                    <input className={baseInputClass} value={form[phoneKey]} disabled={!isEditing} onChange={(e) => onFormChange({ ...form, [phoneKey]: e.target.value })} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h4 className={sectionTitleClass}>專案描述</h4>
          <textarea
            className={`${baseInputClass} min-h-[120px] resize-y leading-relaxed`}
            value={form.description}
            disabled={!isEditing}
            placeholder={isEditing ? "請輸入專案描述..." : "無描述"}
            onChange={(e) => onFormChange({ ...form, description: e.target.value })}
          />
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h4 className={sectionTitleClass}>自訂欄位</h4>
            {isEditing && (
              <div className="grid w-full grid-cols-1 gap-3 md:w-auto md:grid-cols-[12rem_16rem_auto]">
                <input className={baseInputClass} placeholder="欄位標頭" value={newCustomField.label} onChange={(e) => onNewCustomFieldChange({ ...newCustomField, label: e.target.value })} />
                <input className={baseInputClass} placeholder="欄位內容" value={newCustomField.value} onChange={(e) => onNewCustomFieldChange({ ...newCustomField, value: e.target.value })} />
                <Button type="button" className="h-[46px] whitespace-nowrap bg-slate-800 px-5 text-base font-bold text-white hover:bg-slate-900" onClick={onAddCustomField}>
                  <Plus className="mr-2 h-5 w-5" /> 新增欄位
                </Button>
              </div>
            )}
          </div>

          {form.customFields.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {form.customFields.map((field) => (
                <div key={field.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <input className={`${baseInputClass} font-bold`} value={field.label} disabled={!isEditing} onChange={(e) => onCustomFieldChange(field.id, "label", e.target.value)} />
                    {isEditing && (
                      <button type="button" className="mt-1 rounded-md p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600" onClick={() => onDeleteCustomField(field.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <textarea className={`${baseInputClass} min-h-[80px] resize-y leading-relaxed`} value={field.value} disabled={!isEditing} onChange={(e) => onCustomFieldChange(field.id, "value", e.target.value)} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm font-semibold text-slate-500">
              尚未新增自訂欄位
            </div>
          )}
        </div>

        <div>
          <h4 className={sectionTitleClass}>自訂表格</h4>

          {form.customTables.length > 0 ? (
            <div className="space-y-6">
              {form.customTables.map((table) => (
                <div key={table.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h5 className="mb-3 text-base font-bold text-slate-900">
                    {table.title || "未命名表格"}
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="min-w-[640px] w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-600">
                          {table.columns.map((column) => (
                            <th key={column.id} className="px-3 py-2 font-semibold">
                              {column.label || column.id}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.length > 0 ? (
                          table.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-slate-200 last:border-b-0">
                              {table.columns.map((column) => (
                                <td key={column.id} className="px-3 py-3 text-slate-800">
                                  {row[column.id] || "-"}
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={Math.max(table.columns.length, 1)} className="px-3 py-6 text-center font-medium text-slate-500">
                              尚未新增資料列
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm font-semibold text-slate-500">
              尚未新增自訂表格
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default ProjectBaseInfo
