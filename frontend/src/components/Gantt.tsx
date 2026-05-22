import React, { useMemo, useState } from 'react'
import { ViewMode, Gantt } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'

type CustomField = {
  label: string
  value: string
}

export type GanttTask = {
  id: string
  name: string
  customer?: string
  projectName?: string
  assignee?: string
  planLabel?: string
  planTime?: string
  group?: string
  type: 'task' | 'milestone' | 'project'
  start: Date
  end: Date
  progress: number
  customFields?: CustomField[]
  isDisabled?: boolean
  styles?: {
    backgroundColor?: string
    backgroundSelectedColor?: string
    progressColor: string
    progressSelectedColor: string
  }
}
interface Props {
  tasks: GanttTask[]
  variant?: 'project' | 'schedule'
}

type TaskListHeaderProps = {
  headerHeight: number
  fontFamily: string
  fontSize: string
}

type TaskListTableProps = {
  rowHeight: number
  tasks: GanttTask[]
  selectedTaskId: string
  setSelectedTask: (taskId: string) => void
  fontFamily: string
  fontSize: string
}

type TooltipTask = {
  name: string
  customer?: string
  assignee?: string
  planLabel?: string
  planTime?: string
  projectName?: string
  group?: string
  start: Date
  end: Date
  customFields?: CustomField[]
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

const getVisibleCustomFields = (customFields?: CustomField[]) =>
  (customFields ?? []).filter((field) => field.label.trim())

const getTaskListColumns = (tasks: GanttTask[], variant: NonNullable<Props['variant']>) => {
  const labels = new Set<string>()

  tasks.forEach((task) => {
    getVisibleCustomFields(task.customFields).forEach((field) => {
      labels.add(field.label.trim())
    })
  })

  if (variant === 'schedule') {
    return [
      '工項名稱',
      '項目負責人',
      '開始時間',
      '結束時間',
      ...Array.from(labels),
    ]
  }

  return [
    '客戶',
    '專案名稱',
    '計劃時間',
    '開始時間',
    '結束時間',
    ...Array.from(labels),
  ]
}

const CustomTooltip = ({ task, variant = 'project' }: { task: TooltipTask; variant?: Props['variant'] }) => {
  const customFields = getVisibleCustomFields(task.customFields)

  if (variant === 'schedule') {
    return (
      <div className="pointer-events-none relative z-[9999] min-w-64 rounded-md border border-gray-200 bg-white p-3 shadow-2xl">
        <p className="mb-2 text-base font-semibold text-gray-900">{task.projectName?.trim() || task.name}</p>
        <div className="space-y-1 text-sm font-medium text-gray-700">
          <p>工項：{task.name}</p>
          <p>項目負責人：{task.assignee?.trim() || '未指定'}</p>
          <p>開始：{formatDate(task.start)}</p>
          <p>結束：{formatDate(task.end)}</p>
          {customFields.length > 0 && (
            <div className="mt-2 border-t border-gray-200 pt-2">
              {customFields.map((field) => (
                <p key={`${field.label}-${field.value}`}>
                  {field.label.trim()}：{field.value.trim() || '-'}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-none relative z-[9999] min-w-64 rounded-md border border-gray-200 bg-white p-3 shadow-2xl">
      <p className="mb-2 text-base font-semibold text-gray-900">{task.name}</p>
      <div className="space-y-1 text-sm font-medium text-gray-700">
        <p>專案：{task.projectName?.trim() || task.name}</p>
        <p>計劃時間：{task.planTime?.trim() || '-'}</p>
        <p>開始：{formatDate(task.start)}</p>
        <p>結束：{formatDate(task.end)}</p>
        <p>負責組別：{task.group?.trim() || '未指定'}</p>
        <p>客戶：{task.customer?.trim() || '未指定'}</p>
        {customFields.length > 0 && (
          <div className="mt-2 border-t border-gray-200 pt-2">
            {customFields.map((field) => (
              <p key={`${field.label}-${field.value}`}>
                {field.label.trim()}：{field.value.trim() || '-'}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const getGridTemplateColumns = (columnCount: number, variant: NonNullable<Props['variant']>) => {
  if (variant === 'schedule') {
    const fixedColumns = [
      'minmax(180px, 1.6fr)',
      'minmax(140px, 1fr)',
      'minmax(120px, 1fr)',
      'minmax(120px, 1fr)',
    ]
    const customColumns = Array.from({
      length: Math.max(columnCount - fixedColumns.length, 0),
    }).map(() => 'minmax(140px, 1fr)')

    return [...fixedColumns, ...customColumns].join(' ')
  }

  const fixedColumns = [
    'minmax(160px, 1.4fr)',
    'minmax(180px, 1.6fr)',
    'minmax(180px, 1.4fr)',
    'minmax(120px, 1fr)',
    'minmax(120px, 1fr)',
  ]
  const customColumns = Array.from({
    length: Math.max(columnCount - fixedColumns.length, 0),
  }).map(() => 'minmax(140px, 1fr)')

  return [...fixedColumns, ...customColumns].join(' ')
}

const TaskListHeader = ({
  headerHeight,
  fontFamily,
  fontSize,
  columns,
  variant,
}: TaskListHeaderProps & { columns: string[]; variant: NonNullable<Props['variant']> }) => (
  <div
    className="border-b border-slate-300 bg-slate-100 text-slate-700"
    style={{
      height: headerHeight,
      fontFamily,
      fontSize,
      display: 'grid',
      gridTemplateColumns: getGridTemplateColumns(columns.length, variant),
    }}
  >
    {columns.map((column) => (
      <div
        key={column}
        className="flex items-center border-r border-slate-200 px-3 font-bold last:border-r-0"
      >
        <span className="truncate">{column}</span>
      </div>
    ))}
  </div>
)

const TaskListTable = ({
  rowHeight,
  tasks,
  selectedTaskId,
  setSelectedTask,
  fontFamily,
  fontSize,
  columns,
  variant,
}: TaskListTableProps & { columns: string[]; variant: NonNullable<Props['variant']> }) => (
  <div style={{ fontFamily, fontSize }}>
    {tasks.map((task) => {
      const fieldMap = new Map(
        getVisibleCustomFields(task.customFields).map((field) => [
          field.label.trim(),
          field.value.trim() || '-',
        ])
      )
      const columnValueMap: Record<string, string> = {
        客戶: task.customer?.trim() || '-',
        專案名稱: task.projectName?.trim() || task.name,
        工項名稱: task.name,
        項目負責人: task.assignee?.trim() || '-',
        階段: task.planLabel?.trim() || '-',
        計劃時間: task.planTime?.trim() || '-',
        開始時間: formatDate(task.start),
        結束時間: formatDate(task.end),
      }

      return (
        <button
          key={task.id}
          type="button"
          className={`grid w-full border-b border-slate-200 text-left transition-colors hover:bg-slate-50 ${selectedTaskId === task.id ? 'bg-blue-50' : 'bg-white'
            }`}
          style={{
            height: rowHeight,
            gridTemplateColumns: getGridTemplateColumns(columns.length, variant),
          }}
          onClick={() => setSelectedTask(task.id)}
        >
          {columns.map((column, index) => (
            <div
              key={`${task.id}-${column}`}
              className="flex items-center border-r border-slate-200 px-3 text-slate-700 last:border-r-0"
            >
              <span className={index <= 1 ? 'truncate font-semibold' : 'truncate'}>
                {columnValueMap[column] || fieldMap.get(column) || '-'}
              </span>
            </div>
          ))}
        </button>
      )
    })}
  </div>
)

const GanttChart = ({ tasks, variant = 'project' }: Props) => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day)
  const isDayView = viewMode === ViewMode.Day
  const taskListColumns = useMemo(() => getTaskListColumns(tasks, variant), [tasks, variant])
  const ganttKey = useMemo(
    () =>
      tasks
        .map((task) =>
          [
            task.id,
            task.name,
            task.start.toISOString(),
            task.end.toISOString(),
            ...(task.customFields ?? []).map(
              (field) => `${field.label.trim()}:${field.value.trim()}`
            ),
          ].join('|')
        )
        .join('::'),
    [tasks]
  )
  const listCellWidth = useMemo(() => {
    const width =
      160 +
      180 +
      180 +
      120 +
      120 +
      Math.max(taskListColumns.length - 5, 0) * 140
    return `${width}px`
  }, [taskListColumns.length])

  const viewModeOptions = [
    { label: '日', value: ViewMode.Day },
    { label: '週', value: ViewMode.Week },
    { label: '月', value: ViewMode.Month },
  ]

  const CustomTaskListHeader = React.useCallback(
    (props: any) => <TaskListHeader {...props} columns={taskListColumns} variant={variant} />,
    [taskListColumns, variant]
  )

  const CustomTaskListTable = React.useCallback(
    (props: any) => <TaskListTable {...props} columns={taskListColumns} variant={variant} />,
    [taskListColumns, variant]
  )

  const CustomTooltipContent = React.useCallback(
    (props: any) => <CustomTooltip {...props} variant={variant} />,
    [variant]
  )

  return (
    <div className="relative z-30 overflow-visible rounded-md border border-gray-200 bg-gray-50 p-2">
      <div className="mb-3 flex flex-wrap gap-2">
        {viewModeOptions.map((option) => (
          <button
            key={option.label}
            type="button"
            className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${viewMode === option.value
              ? 'border-slate-800 bg-slate-800 text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            onClick={() => setViewMode(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="gantt-readable relative z-30 overflow-visible pb-24 pt-6">
        <Gantt
          key={ganttKey}
          tasks={tasks}
          viewMode={viewMode}
          locale="zh-TW"
          listCellWidth={listCellWidth}
          columnWidth={isDayView ? 72 : 58}
          rowHeight={42}
          barCornerRadius={2}
          barFill={70}
          handleWidth={8}
          fontFamily="-apple-system, BlinkMacSystemFont, 'PingFang TC', 'Microsoft JhengHei', 'Noto Sans TC', sans-serif"
          fontSize={isDayView ? '14px' : '16px'}
          barProgressColor="#9ca3af"
          barProgressSelectedColor="#6b7280"
          barBackgroundColor="#e5e7eb"
          barBackgroundSelectedColor="#d1d5db"
          TooltipContent={CustomTooltipContent}
          TaskListHeader={CustomTaskListHeader}
          TaskListTable={CustomTaskListTable}
        />
      </div>
    </div>
  )
}

export default GanttChart
