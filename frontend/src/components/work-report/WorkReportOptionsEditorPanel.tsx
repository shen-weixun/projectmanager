import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import WorkReportOptionPill from '@/components/work-report/WorkReportOptionPill'
import WorkReportOptionSelect from '@/components/work-report/WorkReportOptionSelect'
import type { WorkReportOptionItem } from '@/utils/workReportOptions'
import {
  OPTION_COLOR_STYLES,
  WORK_REPORT_OPTION_COLORS,
  normalizeOptionColor,
  normalizeOptionsList,
} from '@/utils/workReportOptions'

type Props = {
  header: string
  roleLabel: string
  options: WorkReportOptionItem[]
  onChange: (options: WorkReportOptionItem[]) => void
}

export default function WorkReportOptionsEditorPanel({
  header,
  roleLabel,
  options,
  onChange,
}: Props) {
  const [newValue, setNewValue] = useState('')
  const [newColor, setNewColor] = useState<WorkReportOptionItem['color']>('slate')
  const [previewValue, setPreviewValue] = useState('')

  const addOption = () => {
    const value = newValue.trim()
    if (!value) return
    if (options.some((opt) => opt.value === value)) {
      alert('此選項已存在')
      return
    }
    const next = [...options, { value, color: newColor }]
    onChange(next)
    setNewValue('')
    setPreviewValue(value)
  }

  const removeOption = (value: string) => {
    onChange(options.filter((opt) => opt.value !== value))
    if (previewValue === value) setPreviewValue('')
  }

  const updateOptionColor = (value: string, color: WorkReportOptionItem['color']) => {
    onChange(options.map((opt) => (opt.value === value ? { ...opt, color } : opt)))
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-800">{header}</p>
          <p className="text-xs text-slate-500">{roleLabel} 下拉選單選項</p>
        </div>
        <div className="text-xs text-slate-400">共 {options.length} 項</div>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {options.length === 0 ? (
          <span className="text-xs text-slate-400">尚未建立選項</span>
        ) : (
          options.map((opt) => (
            <div
              key={opt.value}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 pl-1 pr-1 py-0.5"
            >
              <WorkReportOptionPill label={opt.value} color={opt.color} />
              <div className="flex items-center gap-0.5 px-1">
                {WORK_REPORT_OPTION_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={`設為 ${color}`}
                    onClick={() => updateOptionColor(opt.value, color)}
                    className={`h-5 w-5 rounded-md border border-white shadow-sm ring-1 transition ${
                      opt.color === color ? 'ring-slate-800 scale-110' : 'ring-transparent opacity-90'
                    } ${OPTION_COLOR_STYLES[color].bg}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => removeOption(opt.value)}
                className="p-1 text-slate-400 hover:text-red-600"
                aria-label="刪除選項"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-semibold text-slate-600 mb-1">新增選項</label>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addOption()
              }
            }}
            placeholder="例如：開發、測試、完成"
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">標籤顏色</label>
          <select
            value={newColor}
            onChange={(e) => setNewColor(normalizeOptionColor(e.target.value))}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm min-w-[100px]"
          >
            {WORK_REPORT_OPTION_COLORS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={addOption}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900"
        >
          <Plus size={14} />
          新增
        </button>
      </div>

      {options.length > 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-3">
          <p className="text-xs font-semibold text-slate-600 mb-2">預覽（填寫時樣式）</p>
          <div className="max-w-xs">
            <WorkReportOptionSelect
              options={normalizeOptionsList(options)}
              value={previewValue}
              onChange={setPreviewValue}
            />
          </div>
        </div>
      )}
    </div>
  )
}
