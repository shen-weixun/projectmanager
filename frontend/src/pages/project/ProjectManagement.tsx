import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Filter, CalendarDays, LayoutGrid, ChevronLeft, ChevronRight , Search} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import GanttChart from '@/components/Gantt'
import type { GanttTask } from '@/components/Gantt'
import useAPIErrorHandler from '@/hooks/useAPIErrorHandler'
import NewProjectModal from '@/pages/project/NewProjectModal'
import { getGroupsAPI, getProjectOptionsAPI, getProjectsAPI, getProjectGanttAPI } from '@/services/apis'
import type { Project } from '@/types/api'

type SortKey = 'planStartDate' | 'dueDate' | 'name' | 'status'
type SortDirection = 'asc' | 'desc'

// 專案狀態對應甘特圖與狀態標籤使用的顏色設定。
const statusColorMap: Record<
  string,
  {
    label: string
    progressColor: string
    progressSelectedColor: string
    backgroundColor: string
    backgroundSelectedColor: string
  }
> = {
  尚未開始: {
    label: '尚未開始',
    progressColor: '#9ca3af',
    progressSelectedColor: '#6b7280',
    backgroundColor: '#e5e7eb',
    backgroundSelectedColor: '#d1d5db',
  },
  進行中: {
    label: '進行中',
    progressColor: '#facc15',
    progressSelectedColor: '#eab308',
    backgroundColor: '#fef3c7',
    backgroundSelectedColor: '#fde68a',
  },
  已完成: {
    label: '已完成',
    progressColor: '#16a34a',
    progressSelectedColor: '#15803d',
    backgroundColor: '#dcfce7',
    backgroundSelectedColor: '#bbf7d0',
  },
  已結案: {
    label: '已結案',
    progressColor: '#2563eb',
    progressSelectedColor: '#1d4ed8',
    backgroundColor: '#dbeafe',
    backgroundSelectedColor: '#bfdbfe',
  },
  未成案: {
    label: '未成案',
    progressColor: '#ea580c',
    progressSelectedColor: '#c2410c',
    backgroundColor: '#ffedd5',
    backgroundSelectedColor: '#fed7aa',
  },
  未過案: {
    label: '未過案',
    progressColor: '#dc2626',
    progressSelectedColor: '#b91c1c',
    backgroundColor: '#fee2e2',
    backgroundSelectedColor: '#fecaca',
  },
  撤案: {
    label: '撤案',
    progressColor: '#7c3aed',
    progressSelectedColor: '#6d28d9',
    backgroundColor: '#ede9fe',
    backgroundSelectedColor: '#ddd6fe',
  },
}

// 專案總覽頁區塊共用樣式，維持篩選、甘特圖與明細區塊外觀一致。
const cardBaseClass = 'rounded-xl border border-slate-300 bg-white shadow-sm mb-8 transition-all overflow-visible border-t-4'
const cardHeaderBaseClass = 'px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 text-xl font-bold text-slate-900'
const cardBodyClass = 'p-6'

const ProjectManagementPage = () => {
  // 統一處理專案總覽頁 API 錯誤。
  const handleError = useAPIErrorHandler()

  // 管理專案列表、甘特圖資料、篩選選項、分頁與排序條件。
  const [projects, setProjects] = useState<Project[]>([])
  const [ganttProjects, setGanttProjects] = useState<Project[]>([])
  const [groups, setGroups] = useState<{ id: number; groupName: string }[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])

  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 12

  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [keyword, setKeyword] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('planStartDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])

  // 載入組別與專案狀態選項，供篩選條件使用。
  const fetchFilters = async () => {
    try {
      const [groupsRes, optionsRes] = await Promise.all([
        getGroupsAPI(),
        getProjectOptionsAPI(),
      ])
      if (groupsRes.status === 0) setGroups(groupsRes.data || [])
      if (optionsRes.status === 0) {
        setStatusOptions(optionsRes.data?.statuses || [])
        setCategoryOptions(optionsRes.data?.categories || [])  // 補這行
      }
    } catch (error) {
      handleError(error)
    }
  }

  // 依目前分頁、篩選與排序條件載入專案列表與甘特圖資料。
  const fetchProjects = async () => {
    try {
      const params: any = { page, pageSize, sortKey, sortDirection }
      if (selectedGroup) params.group = selectedGroup
      if (selectedStatuses.length > 0) params.status = selectedStatuses.join(',')
      if (selectedCategories.length > 0) params.category = selectedCategories.join(',')
      if (keyword.trim()) params.keyword = keyword.trim()
      const [projectsRes, ganttRes] = await Promise.all([
        getProjectsAPI(params),
        getProjectGanttAPI({
          group: selectedGroup ? selectedGroup : undefined,
          status: selectedStatuses.length > 0 ? selectedStatuses.join(',') : undefined,
          keyword: keyword.trim() || undefined
        })
      ])

      if (projectsRes.status === 0) {
        setProjects(projectsRes.data.items)
        setTotal(projectsRes.data.total)
      } else {
        handleError(projectsRes.error)
      }

      if (ganttRes.status === 0) {
        setGanttProjects(ganttRes.data)
      } else {
        handleError(ganttRes.error)
      }
    } catch (error) {
      handleError(error)
    }
  }

  useEffect(() => {
    // 初次進入頁面時載入篩選選項。
    fetchFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // 篩選、排序或分頁改變時重新載入專案資料。
    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortKey, sortDirection, selectedGroup, selectedStatuses, keyword,selectedCategories])

  // 篩選條件改變後回到第一頁，避免停留在沒有資料的頁碼。
  const handleFilterChange = () => {
    setPage(1)
  }

  // 切換多選篩選條件，已選擇則移除，未選擇則加入。
  const toggleSelection = (value: string, selected: string[], setSelected: Dispatch<SetStateAction<string[]>>) => {
    setSelected((prev) => prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value])
    handleFilterChange()
  }

  // 依總筆數與每頁筆數計算分頁總頁數。
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // 將專案資料轉成甘特圖元件需要的任務格式與狀態色彩。
  const ganttTasks: GanttTask[] = useMemo(() => {
    return ganttProjects
      .filter((p) => !!(p.planStartDate || p.startDate || p.preStartDate) && !!p.dueDate)
      .map((p) => {
        const isStarted = p.status === '進行中' || p.status === '已結案'
        const planLabel = isStarted ? '開始時間' : '計劃時間'
        const planTime = isStarted
          ? (p.startDate || p.preStartDate || p.planStartDate || '')
          : (p.planStartDate || p.startDate || p.preStartDate || '')

        return {
          id: p.id.toString(),
          name: `${planLabel}｜${p.name}`,
          customer: p.customer || '',
          projectName: p.name,
          planLabel,
          planTime,
          group: p.group || '',
          type: 'task',
          start: new Date(planTime),
          end: new Date(p.dueDate),
          progress: p.status === '已完成' || p.status === '已結案' ? 100 : p.status === '進行中' ? 50 : 0,
          customFields: [],
          isDisabled: false,
          styles: {
            progressColor: (statusColorMap[p.status] ?? statusColorMap['尚未開始']).progressColor,
            progressSelectedColor: (statusColorMap[p.status] ?? statusColorMap['尚未開始']).progressSelectedColor,
            backgroundColor: (statusColorMap[p.status] ?? statusColorMap['尚未開始']).backgroundColor,
            backgroundSelectedColor: (statusColorMap[p.status] ?? statusColorMap['尚未開始']).backgroundSelectedColor,
          },
        }
      })
  }, [ganttProjects])

  return (
    <div className="mx-auto w-full max-w-[1400px] bg-orange-50 min-h-screen pb-16">
      <div className="sticky top-0 z-20 mb-8 flex items-center justify-between border-b border-slate-300 bg-white/95 px-8 py-5 backdrop-blur-md shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">專案總覽</h1>
          <p className="mt-1 text-base font-semibold text-slate-600">
            目前條件共篩選出 {total} 筆專案資料
          </p>
        </div>
        <div className="flex items-center gap-4">
          <NewProjectModal
            onCreate={() => {
              setPage(1)
              setSelectedGroup('')
              setSelectedStatuses([])
              fetchProjects()
            }}
          />
        </div>
      </div>

      <div className="px-8">
        <section className={`${cardBaseClass} border-t-blue-600`}>
          <div className={`${cardHeaderBaseClass} bg-blue-50`}>
            <div className="flex items-center gap-3">
              <Filter className="h-6 w-6 text-blue-700" />
              <h3 className="text-blue-950">篩選與排序</h3>
            </div>
          </div>
          {/* 關鍵字搜尋 */}
          <div>
            <div className="mb-3">
              <span className="text-sm font-bold tracking-wide text-slate-700 uppercase">
                關鍵字搜尋
              </span>
            </div>
            <div className="relative max-w-lg">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="輸入客戶名稱、專案名稱或日期..."
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value)
                  handleFilterChange()
                }}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm font-bold text-slate-700 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => { setKeyword(''); handleFilterChange(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="清除搜尋"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="h-px w-full bg-slate-200"></div>
          <div className={`${cardBodyClass} flex flex-col gap-6`}>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold tracking-wide text-slate-700 uppercase">
                  負責組別
                </span>
                <button
                  type="button"
                  className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                  onClick={() => { setSelectedGroup(''); handleFilterChange(); }}
                >
                  清除選擇
                </button>
              </div>
              <div className="relative max-w-sm">
                <input
                  type="text"
                  list="group-options"
                  placeholder="請選擇或輸入組別..."
                  value={selectedGroup}
                  onChange={(e) => { setSelectedGroup(e.target.value); handleFilterChange(); }}
                  className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
                <datalist id="group-options">
                  {groups.map((group) => (
                    <option key={group.id} value={group.groupName} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="h-px w-full bg-slate-200"></div>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="mb-3">
                  <span className="text-sm font-bold tracking-wide text-slate-700 uppercase">
                    專案狀態
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    className={`h-10 whitespace-nowrap rounded-lg border px-4 text-sm font-bold transition-colors ${selectedStatuses.length === 0
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    onClick={() => { setSelectedStatuses([]); handleFilterChange(); }}
                  >
                    全部狀態
                  </button>
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`h-10 whitespace-nowrap rounded-lg border px-4 text-sm font-bold transition-colors ${selectedStatuses.includes(status)
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      onClick={() => toggleSelection(status, selectedStatuses, setSelectedStatuses)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-px w-full bg-slate-200"></div>

              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold tracking-wide text-slate-700 uppercase">
                      專案類別
                    </span>
                    <button
                      type="button"
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                      onClick={() => { setSelectedCategories([]); handleFilterChange(); }}
                    >
                      清除選擇
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      className={`h-10 whitespace-nowrap rounded-lg border px-4 text-sm font-bold transition-colors ${
                        selectedCategories.length === 0
                          ? 'border-slate-800 bg-slate-800 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                      onClick={() => { setSelectedCategories([]); handleFilterChange(); }}
                    >
                      全部類別
                    </button>
                    {categoryOptions.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={`h-10 whitespace-nowrap rounded-lg border px-4 text-sm font-bold transition-colors ${
                          selectedCategories.includes(category)
                            ? 'border-blue-600 bg-blue-50 text-blue-800'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                        onClick={() => toggleSelection(category, selectedCategories, setSelectedCategories)}
                      >
                        {category}
                      </button>
                    ))}
                    {categoryOptions.length === 0 && (
                      <span className="text-sm text-slate-400">尚未建立任何類別，請至設定 → 專案類別管理新增</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 lg:w-[320px]">
                <div className="mb-3">
                  <span className="text-sm font-bold tracking-wide text-slate-700 uppercase">
                    排序方式
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-full">
                    <select
                      value={sortKey}
                      onChange={(e) => { setSortKey(e.target.value as SortKey); handleFilterChange(); }}
                      className="h-10 w-full appearance-none rounded-lg border border-slate-400 bg-white px-4 pr-10 text-sm font-bold text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                    >
                      <option value="planStartDate">計劃開始時間</option>
                      <option value="dueDate">結束日期</option>
                      <option value="name">專案名稱</option>
                      <option value="status">專案狀態</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  </div>
                  <button
                    type="button"
                    className="h-10 shrink-0 whitespace-nowrap rounded-lg border border-slate-400 bg-white px-4 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50"
                    onClick={() => { setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc')); handleFilterChange(); }}
                  >
                    {sortDirection === 'asc' ? '升冪排列' : '降冪排列'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${cardBaseClass} border-t-violet-600`}>
          <div className={`${cardHeaderBaseClass} bg-violet-50`}>
            <div className="flex items-center gap-3">
              <CalendarDays className="h-6 w-6 text-violet-700" />
              <h3 className="text-violet-950">甘特圖與進度</h3>
            </div>
          </div>
          <div className={cardBodyClass}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-300 bg-slate-50 px-5 py-4">
              <div className="flex flex-wrap items-center gap-5 text-base font-bold text-slate-700">
                {statusOptions.map((status) => (
                  <div key={status} className="inline-flex items-center gap-2.5">
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full shadow-sm"
                      style={{
                        backgroundColor: (statusColorMap[status] ?? statusColorMap['尚未開始']).progressColor,
                      }}
                    />
                    <span>{status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-300 bg-white p-2">
              <ErrorBoundary
                fallback={
                  <div className="py-16 text-center text-base font-semibold text-red-500">
                    載入甘特圖失敗
                  </div>
                }
              >
                {ganttTasks.length > 0 ? (
                  <GanttChart tasks={ganttTasks} />
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-16 text-center text-base font-semibold text-slate-500">
                    無符合條件的甘特圖資料可顯示
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </div>
        </section>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-6 w-6 text-slate-800" />
            <h2 className="text-2xl font-extrabold text-slate-900">專案明細</h2>
          </div>

          <div className="flex items-center gap-4 text-sm font-bold text-slate-600">
            <span>第 {page} / {totalPages} 頁</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white py-20 text-center text-lg font-semibold text-slate-500 shadow-sm">
            沒有符合條件的專案
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 mb-8">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex h-full flex-col rounded-xl border border-slate-300 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <h2 className="line-clamp-2 text-xl font-bold text-slate-900 leading-tight">
                    {project.name}
                  </h2>
                  <span
                    className="shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-extrabold"
                    style={{
                      color: (statusColorMap[project.status] ?? statusColorMap['尚未開始']).progressSelectedColor,
                      borderColor: (statusColorMap[project.status] ?? statusColorMap['尚未開始']).progressColor,
                      backgroundColor: (statusColorMap[project.status] ?? statusColorMap['尚未開始']).backgroundColor,
                    }}
                  >
                    {project.status}
                  </span>
                </div>

                <div className="mb-6 grid gap-2.5 text-sm font-semibold text-slate-600">
                  <p className="flex items-center gap-2 truncate">
                    <span className="w-16 text-slate-400">負責組別</span>
                    <span className="text-slate-800">{project.group}</span>
                  </p>
                  <p className="flex items-center gap-2 truncate">
                    <span className="w-16 text-slate-400">專案負責人</span>
                    <span className="text-slate-800">{project.projectOwner || project.owner}</span>
                  </p>
                  <div className="mt-1 flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span>
                      計劃 {project.planStartDate || project.startDate || project.preStartDate || '-'}
                      <span className="mx-1 text-slate-400">→</span>
                      {project.dueDate}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/project-management/${project.id}`}
                  state={{ project }}
                  className="mt-auto inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-800 px-4 text-sm font-bold text-white transition-colors hover:bg-slate-900"
                >
                  查看專案詳情
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectManagementPage
