import { ViewMode } from 'gantt-task-react'

type TimelineTask = { start: Date; end: Date }

const addToDate = (date: Date, count: number, unit: 'day' | 'month' | 'year' | 'hour') => {
  const next = new Date(date)
  if (unit === 'day') next.setDate(next.getDate() + count)
  if (unit === 'month') next.setMonth(next.getMonth() + count)
  if (unit === 'year') next.setFullYear(next.getFullYear() + count)
  if (unit === 'hour') next.setHours(next.getHours() + count)
  return next
}

const startOfDay = (date: Date) => {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

const getMonday = (date: Date) => {
  const next = startOfDay(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  return next
}

/** 與 gantt-task-react 內部相同的日期區間估算，用於計算欄寬。 */
export const estimateGanttDateRange = (
  tasks: TimelineTask[],
  viewMode: ViewMode,
  preStepsCount = 1
): [Date, Date] => {
  if (!tasks.length) {
    const today = startOfDay(new Date())
    return [addToDate(today, -7, 'day'), addToDate(today, 30, 'day')]
  }

  let newStartDate = tasks[0].start
  let newEndDate = tasks[0].start

  for (const task of tasks) {
    if (task.start < newStartDate) newStartDate = task.start
    if (task.end > newEndDate) newEndDate = task.end
  }

  switch (viewMode) {
    case ViewMode.Year:
      newStartDate = startOfDay(addToDate(newStartDate, -1, 'year'))
      newEndDate = startOfDay(addToDate(newEndDate, 1, 'year'))
      break
    case ViewMode.Month:
      newStartDate = startOfDay(addToDate(newStartDate, -1 * preStepsCount, 'month'))
      newEndDate = startOfDay(addToDate(newEndDate, 1, 'year'))
      break
    case ViewMode.Week:
      newStartDate = addToDate(getMonday(startOfDay(newStartDate)), -7 * preStepsCount, 'day')
      newEndDate = startOfDay(addToDate(newEndDate, 45, 'day'))
      break
    case ViewMode.Day:
    default:
      newStartDate = addToDate(startOfDay(newStartDate), -1 * preStepsCount, 'day')
      newEndDate = addToDate(startOfDay(newEndDate), 19, 'day')
      break
  }

  return [newStartDate, newEndDate]
}

const seedDates = (startDate: Date, endDate: Date, viewMode: ViewMode) => {
  const dates: Date[] = [new Date(startDate)]
  let currentDate = new Date(startDate)

  while (currentDate < endDate) {
    switch (viewMode) {
      case ViewMode.Year:
        currentDate = addToDate(currentDate, 1, 'year')
        break
      case ViewMode.Month:
        currentDate = addToDate(currentDate, 1, 'month')
        break
      case ViewMode.Week:
        currentDate = addToDate(currentDate, 7, 'day')
        break
      case ViewMode.Day:
      default:
        currentDate = addToDate(currentDate, 1, 'day')
        break
    }
    dates.push(new Date(currentDate))
  }

  return dates
}

export const getGanttTimelineDates = (
  tasks: TimelineTask[],
  viewMode: ViewMode,
  preStepsCount = 1
) => {
  const [startDate, endDate] = estimateGanttDateRange(tasks, viewMode, preStepsCount)
  return seedDates(startDate, endDate, viewMode)
}

export const estimateGanttDateCount = (
  tasks: TimelineTask[],
  viewMode: ViewMode,
  preStepsCount = 1
) => getGanttTimelineDates(tasks, viewMode, preStepsCount).length

/** 依欄寬決定日檢視時間軸標籤間隔，避免標籤重疊。 */
export const getGanttDayLabelStep = (columnWidth: number): number => {
  if (columnWidth >= 44) return 1
  if (columnWidth >= 34) return 2
  if (columnWidth >= 28) return 5
  return 7
}

export const shouldShowGanttDayLabel = (date: Date, step: number): boolean => {
  if (step <= 1) return true
  if (date.getDate() === 1) return true
  return date.getDate() % step === 0
}

export const getGanttViewDate = (tasks: TimelineTask[]) => {
  if (!tasks.length) return new Date()
  return tasks.reduce((min, task) => (task.start < min ? task.start : min), tasks[0].start)
}
