export type WorkReportOptionColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'slate'
  | 'purple'
  | 'dark'
  | 'rose'
  | 'brown'

export interface WorkReportOptionItem {
  value: string
  color: WorkReportOptionColor
}

export type OptionsByHeader = Record<string, WorkReportOptionItem[]>

export const WORK_REPORT_OPTION_COLORS: WorkReportOptionColor[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'slate',
  'purple',
  'dark',
  'rose',
  'brown',
]

export const OPTION_COLOR_STYLES: Record<
  WorkReportOptionColor,
  { bg: string; text: string; ring: string }
> = {
  red: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-300' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-300' },
  yellow: { bg: 'bg-amber-100', text: 'text-amber-800', ring: 'ring-amber-300' },
  green: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-300' },
  slate: { bg: 'bg-slate-200', text: 'text-slate-700', ring: 'ring-slate-300' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-300' },
  dark: { bg: 'bg-slate-800', text: 'text-white', ring: 'ring-slate-500' },
  rose: { bg: 'bg-rose-600', text: 'text-white', ring: 'ring-rose-400' },
  brown: { bg: 'bg-amber-900', text: 'text-amber-50', ring: 'ring-amber-700' },
}

const VALID_COLORS = new Set<string>(WORK_REPORT_OPTION_COLORS)

export const normalizeOptionColor = (color: unknown): WorkReportOptionColor => {
  const key = String(color ?? 'slate').trim().toLowerCase()
  return VALID_COLORS.has(key) ? (key as WorkReportOptionColor) : 'slate'
}

export const normalizeOptionItem = (raw: unknown): WorkReportOptionItem | null => {
  if (typeof raw === 'string') {
    const value = raw.trim()
    return value ? { value, color: 'slate' } : null
  }
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    const value = String(record.value ?? '').trim()
    if (!value) return null
    return { value, color: normalizeOptionColor(record.color) }
  }
  return null
}

export const normalizeOptionsList = (raw: unknown): WorkReportOptionItem[] => {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const items: WorkReportOptionItem[] = []
  for (const entry of raw) {
    const item = normalizeOptionItem(entry)
    if (!item || seen.has(item.value)) continue
    seen.add(item.value)
    items.push(item)
  }
  return items
}

export const normalizeOptionsByHeader = (raw: unknown): OptionsByHeader => {
  if (!raw || typeof raw !== 'object') return {}
  const result: OptionsByHeader = {}
  for (const [header, values] of Object.entries(raw as Record<string, unknown>)) {
    const key = header.trim()
    if (!key) continue
    result[key] = normalizeOptionsList(values)
  }
  return result
}

export const serializeOptionsForApi = (
  options: OptionsByHeader
): Record<string, WorkReportOptionItem[]> => {
  const result: Record<string, WorkReportOptionItem[]> = {}
  for (const [header, items] of Object.entries(options)) {
    result[header] = normalizeOptionsList(items)
  }
  return result
}

export const findOptionStyle = (
  options: WorkReportOptionItem[],
  value: string
) => {
  const item = options.find((opt) => opt.value === value)
  return OPTION_COLOR_STYLES[item?.color ?? 'slate']
}
