import { useEffect, useState } from 'react'
import {
  Megaphone,
  FolderKanban,
  FileText,
  Users,
  Plus,
  X,
  ChevronRight,
  Check,
  Link,
  Star,
  Send,
  CircleCheck,
  BriefcaseBusiness,
  Handshake,
} from 'lucide-react'
import { getProjectDetailAPI, getProjectsAPI } from '@/services/apis'
import { getRoleKey } from '@/utils/auth'
import type { Project, ProjectDetail } from '@/types/api'

// ── 型別定義 ──────────────────────────────────────────────
type Announcement = {
  id: string
  tag: '重要' | '活動' | '系統' | '一般'
  title: string
  content: string
  date: string
}

type Document = {
  id: string
  category: string
  name: string
  icon: string
  link?: string
}

type TeamMember = {
  id: number
  name: string
  aliases: string[]
  jobTitle: string
  initial: string
  color: string
}

// ── 管理者角色 ─────────────────────────────────────────────
const ADMIN_ROLES = ['super', 'boss']

const isAdmin = () => ADMIN_ROLES.includes(getRoleKey() ?? '')

// ── 狀態顏色對應 ───────────────────────────────────────────
const statusStyle: Record<string, { bg: string; text: string; dot: string }> = {
  進行中:  { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400'  },
  尚未開始: { bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400'  },
  已完成:  { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-400'},
  已結案:  { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-400'   },
  未成案:  { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-400' },
  撤案:    { bg: 'bg-red-50',     text: 'text-red-600',    dot: 'bg-red-400'    },
  未過案:  { bg: 'bg-rose-50',    text: 'text-rose-600',   dot: 'bg-rose-400'   },
}
const defaultStatus = { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' }

// ── 標籤顏色 ──────────────────────────────────────────────
const tagStyle: Record<string, string> = {
  重要: 'bg-red-100 text-red-700 border-red-200',
  活動: 'bg-amber-100 text-amber-700 border-amber-200',
  系統: 'bg-blue-100 text-blue-700 border-blue-200',
  一般: 'bg-gray-100 text-gray-600 border-gray-200',
}

// ── 成員頭像顏色池 ─────────────────────────────────────────
const avatarColors = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500',  'bg-cyan-500',
  'bg-indigo-500','bg-teal-500',  'bg-pink-500',
]

// ── 預設公告（本地示範，管理者可新增/刪除）────────────────
const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    tag: '重要',
    title: '系統維護通知',
    content: '系統將於本週五進行例行維護，請提前做好準備。',
    date: '2026-05-23',
  },
  {
    id: '2',
    tag: '系統',
    title: '新功能上線',
    content: '用戶現在可以自定義個人主頁，歡迎體驗。',
    date: '2026-05-21',
  },
]

// ── 預設文件（管理者可新增/刪除）──────────────────────────
const DEFAULT_DOCUMENTS: Document[] = [
  { id: '1', category: '人事制度', name: '請假單',     icon: '📋' },
  { id: '2', category: '人事制度', name: '加班申請單', icon: '⏰' },
  { id: '3', category: '人事制度', name: '出差申請單', icon: '✈️' },
  { id: '4', category: '行政/財務', name: '採購申請單', icon: '🛒' },
  { id: '5', category: '行政/財務', name: '費用申請單', icon: '💰' },
]

// ── Storage key ────────────────────────────────────────────
const ANN_KEY = 'home_announcements'
const DOC_KEY = 'home_documents'

const loadJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

const saveJSON = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value))
}

const getDocumentHref = (link?: string) => {
  const trimmed = link?.trim()
  if (!trimmed) return ''
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getThisWeekRange = () => {
  const today = new Date()
  const day = today.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const weekStart = new Date(today)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(today.getDate() + mondayOffset)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return {
    start: formatDate(weekStart),
    end: formatDate(weekEnd),
  }
}

const getThisMonthRange = () => {
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  return {
    start: formatDate(monthStart),
    end: formatDate(monthEnd),
  }
}

const isDateInRange = (date: string | undefined, start: string, end: string) =>
  Boolean(date && date >= start && date <= end)

const isProjectInWeek = (project: Project, weekStart: string, weekEnd: string) => {
  const startDate = project.startDate || project.planStartDate || project.preStartDate
  const dueDate = project.dueDate
  if (!startDate || !dueDate) return false
  return startDate <= weekEnd && dueDate >= weekStart
}

const COMPLETED_STATUSES = ['已完成', '已結案', '完成', '結案']

const isCompletedStatus = (status?: string) =>
  COMPLETED_STATUSES.some((completedStatus) => status?.includes(completedStatus))

const normalizePointKey = (value?: string) => value?.trim().toLowerCase() ?? ''

const addPoints = (scores: Record<string, number>, assignee: string | undefined, points: number) => {
  const key = normalizePointKey(assignee)
  if (!key) return
  scores[key] = (scores[key] ?? 0) + points
}

const isOverdue = (date: string | undefined, today: string) => Boolean(date && date < today)

const calculateProjectPointScores = (projectDetails: ProjectDetail[]) => {
  const today = formatDate(new Date())
  const scores: Record<string, number> = {}

  projectDetails.forEach((project) => {
    if (isCompletedStatus(project.status)) {
      addPoints(scores, project.projectOwner || project.owner, 30)
    }

    project.todoItems?.forEach((item) => {
      if (isCompletedStatus(item.status)) {
        addPoints(scores, item.assignee, 5)
      } else if (isOverdue(item.dueDate, today)) {
        addPoints(scores, item.assignee, -3)
      }
    })

    project.scheduleItems?.forEach((item) => {
      if (isCompletedStatus(item.status)) {
        addPoints(scores, item.assignee, 10)
      } else if (isOverdue(item.endDate, today)) {
        addPoints(scores, item.assignee, -3)
      }
    })

    project.checkpointItems?.forEach((item) => {
      if (isCompletedStatus(item.status)) {
        addPoints(scores, item.assignee, 8)
      } else if (isOverdue(item.reviewDate, today)) {
        addPoints(scores, item.assignee, -3)
      }
    })
  })

  return scores
}

const getStoredUserAccount = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (!token) return ''

  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>
    return String(payload.account ?? payload.username ?? payload.name ?? '')
  } catch {
    return ''
  }
}

// ════════════════════════════════════════════════════════════
// HomePage Component
// ════════════════════════════════════════════════════════════
const HomePage = () => {
  const admin = isAdmin()

  // ── 公告 ─────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<Announcement[]>(() =>
    loadJSON(ANN_KEY, DEFAULT_ANNOUNCEMENTS)
  )
  const [showAnnForm, setShowAnnForm] = useState(false)
  const [annForm, setAnnForm] = useState<Omit<Announcement, 'id'>>({
    tag: '一般', title: '', content: '', date: new Date().toISOString().slice(0, 10),
  })

  const addAnnouncement = () => {
    if (!annForm.title.trim()) return
    const next = [
      { ...annForm, id: Date.now().toString() },
      ...announcements,
    ]
    setAnnouncements(next)
    saveJSON(ANN_KEY, next)
    setAnnForm({ tag: '一般', title: '', content: '', date: new Date().toISOString().slice(0, 10) })
    setShowAnnForm(false)
  }

  const removeAnnouncement = (id: string) => {
    const next = announcements.filter((a) => a.id !== id)
    setAnnouncements(next)
    saveJSON(ANN_KEY, next)
  }

  // ── 專案 ─────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)

  useEffect(() => {
    const weekRange = getThisWeekRange()
    getProjectsAPI({
      pageSize: 100,
      sortKey: 'planStartDate',
      sortDirection: 'asc',
      start: weekRange.start,
      end: weekRange.end,
    }).then((res) => {
      if (res.status === 0) {
        setProjects(
          res.data.items.filter((project) =>
            isProjectInWeek(project, weekRange.start, weekRange.end)
          )
        )
      }
      setProjectsLoading(false)
    })
  }, [])

  // ── 文件 ─────────────────────────────────────────────────
  const [documents, setDocuments] = useState<Document[]>(() =>
    loadJSON(DOC_KEY, DEFAULT_DOCUMENTS)
  )
  const [showDocForm, setShowDocForm] = useState(false)
  const [docForm, setDocForm] = useState({ category: '', name: '', icon: '📄', link: '' })
  const [editingLinkDocId, setEditingLinkDocId] = useState<string | null>(null)
  const [linkDraft, setLinkDraft] = useState('')

  const addDocument = () => {
    if (!docForm.name.trim() || !docForm.category.trim()) return
    const next = [
      ...documents,
      {
        ...docForm,
        category: docForm.category.trim(),
        name: docForm.name.trim(),
        link: docForm.link.trim(),
        id: Date.now().toString(),
      },
    ]
    setDocuments(next)
    saveJSON(DOC_KEY, next)
    setDocForm({ category: '', name: '', icon: '📄', link: '' })
    setShowDocForm(false)
  }

  const removeDocument = (id: string) => {
    const next = documents.filter((d) => d.id !== id)
    setDocuments(next)
    saveJSON(DOC_KEY, next)
  }

  const startEditingDocumentLink = (doc: Document) => {
    setEditingLinkDocId(doc.id)
    setLinkDraft(doc.link ?? '')
  }

  const saveDocumentLink = (id: string) => {
    const next = documents.map((doc) =>
      doc.id === id ? { ...doc, link: linkDraft.trim() } : doc
    )
    setDocuments(next)
    saveJSON(DOC_KEY, next)
    setEditingLinkDocId(null)
    setLinkDraft('')
  }

  const openDocumentLink = (doc: Document) => {
    const href = getDocumentHref(doc.link)
    if (!href) return
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  // ── 團隊成員 ──────────────────────────────────────────────
  const [members, setMembers] = useState<TeamMember[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [memberPointScores, setMemberPointScores] = useState<Record<string, number>>({})
  const [allProjects, setAllProjects] = useState<Project[]>([])

  useEffect(() => {
    fetch('/api/users/list', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') ?? sessionStorage.getItem('token') ?? ''}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.status === 0 && Array.isArray(data.data)) {
          const mapped: TeamMember[] = data.data.map(
            (u: { id: number; account: string; name: string; job_title?: string }, i: number) => ({
              id: u.id,
              name: u.account,
              aliases: [u.account, u.name].filter(Boolean),
              jobTitle: u.job_title ?? '—',
              initial: u.account?.charAt(0)?.toUpperCase() ?? '?',
              color: avatarColors[i % avatarColors.length],
            })
          )
          setMembers(mapped)
        } else {
          setMembers(FALLBACK_MEMBERS)
        }
      })
      .catch(() => setMembers(FALLBACK_MEMBERS))
      .finally(() => setMembersLoading(false))
  }, [])

  useEffect(() => {
    getProjectsAPI({ pageSize: 100 }).then(async (res) => {
      if (res.status !== 0) return
      setAllProjects(res.data.items)
      const details = await Promise.all(
        res.data.items.map((project) => getProjectDetailAPI(project.id))
      )
      setMemberPointScores(
        calculateProjectPointScores(
          details
            .filter((detail) => detail.status === 0)
            .map((detail) => detail.data)
        )
      )
    })
  }, [])

  // 依分類分組文件
  const docCategories = Array.from(new Set(documents.map((d) => d.category)))
  const getMemberPoints = (member: TeamMember) => {
    const aliases = Array.from(new Set(member.aliases.map(normalizePointKey).filter(Boolean)))
    return aliases.reduce((total, alias) => total + (memberPointScores[alias] ?? 0), 0)
  }
  const sortedMembers = [...members].sort((a, b) => getMemberPoints(b) - getMemberPoints(a))
  const currentUserKey = normalizePointKey(getStoredUserAccount())
  const currentMember = members.find((member) =>
    member.aliases.some((alias) => normalizePointKey(alias) === currentUserKey)
  )
  const currentUserPoints = currentMember
    ? getMemberPoints(currentMember)
    : memberPointScores[currentUserKey] ?? 0
  const monthRange = getThisMonthRange()
  const monthlySubmittedCount = allProjects.filter((project) =>
    isDateInRange(project.dueDate, monthRange.start, monthRange.end)
  ).length
  const monthlyPassedCount = allProjects.filter((project) =>
    isDateInRange(project.dueDate, monthRange.start, monthRange.end) && isCompletedStatus(project.status)
  ).length
  const activeProjectCount = allProjects.filter((project) => project.status === '進行中').length
  const monthlySignedCount = allProjects.filter((project) =>
    isDateInRange(project.dueDate, monthRange.start, monthRange.end) && project.status === '已結案'
  ).length
  const monthlyAchievementCards = [
    {
      label: '送件數',
      value: monthlySubmittedCount,
      icon: Send,
      iconClass: 'bg-blue-50 text-blue-600',
      cardClass: 'bg-blue-50/50',
    },
    {
      label: '過案數',
      value: monthlyPassedCount,
      icon: CircleCheck,
      iconClass: 'bg-emerald-50 text-emerald-600',
      cardClass: 'bg-emerald-50/50',
    },
    {
      label: '執行中專案',
      value: activeProjectCount,
      icon: BriefcaseBusiness,
      iconClass: 'bg-violet-50 text-violet-600',
      cardClass: 'bg-violet-50/50',
    },
    {
      label: '成功簽約',
      value: monthlySignedCount,
      icon: Handshake,
      iconClass: 'bg-orange-50 text-orange-600',
      cardClass: 'bg-orange-50/50',
    },
  ]

  return (
    <div className="w-full max-w-[1400px] mx-auto pb-10 space-y-6">

      <div className="grid grid-cols-1 justify-end gap-4 lg:grid-cols-[minmax(240px,320px)]">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-500">
            <Star size={28} />
          </span>
          <div className="min-w-0">
            <p className="text-3xl font-bold leading-none text-gray-900">{currentUserPoints}</p>
            <p className="mt-1 text-sm font-semibold text-gray-700">個人積點</p>
          </div>
        </div>
      </div>

      {/* ══ 第一列：公告 + 專案進度 ══════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── 公告事項 ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600">
                <Megaphone size={16} />
              </span>
              <h2 className="text-base font-bold text-gray-800">最新公告事項</h2>
            </div>
            {admin && (
              <button
                onClick={() => setShowAnnForm((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Plus size={14} />
                新增公告
              </button>
            )}
          </div>

          {/* 管理者新增表單 */}
          {admin && showAnnForm && (
            <div className="px-6 py-4 bg-blue-50/60 border-b border-blue-100 space-y-3">
              <div className="flex gap-2">
                <select
                  value={annForm.tag}
                  onChange={(e) => setAnnForm({ ...annForm, tag: e.target.value as Announcement['tag'] })}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {(['重要', '活動', '系統', '一般'] as const).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={annForm.date}
                  onChange={(e) => setAnnForm({ ...annForm, date: e.target.value })}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <input
                placeholder="公告標題"
                value={annForm.title}
                onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <textarea
                placeholder="公告內容（選填）"
                value={annForm.content}
                onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                rows={2}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={addAnnouncement}
                  className="flex items-center gap-1 text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Check size={13} /> 確認新增
                </button>
                <button
                  onClick={() => setShowAnnForm(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
            {announcements.length === 0 && (
              <p className="px-6 py-10 text-center text-sm text-gray-400">尚無公告</p>
            )}
            {announcements.map((ann) => (
              <div key={ann.id} className="flex items-start gap-3 px-6 py-3.5 hover:bg-gray-50/60 transition-colors group">
                <span className={`mt-0.5 shrink-0 text-xs font-bold px-1.5 py-0.5 rounded border ${tagStyle[ann.tag] ?? tagStyle['一般']}`}>
                  {ann.tag}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{ann.title}</p>
                  {ann.content && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{ann.content}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">{ann.date}</span>
                  {admin && (
                    <button
                      onClick={() => removeAnnouncement(ann.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 專案進度 ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50 text-violet-600">
                <FolderKanban size={16} />
              </span>
              <h2 className="text-base font-bold text-gray-800">本週專案</h2>
            </div>
            <a
              href="/project-management"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              查看更多 <ChevronRight size={13} />
            </a>
          </div>

          <div className="divide-y divide-gray-50 max-h-[320px] overflow-y-auto">
            {projectsLoading && (
              <p className="px-6 py-10 text-center text-sm text-gray-400">載入中...</p>
            )}
            {!projectsLoading && projects.length === 0 && (
              <p className="px-6 py-10 text-center text-sm text-gray-400">本週無專案資料</p>
            )}
            {projects.map((proj) => {
              const st = statusStyle[proj.status] ?? defaultStatus
              return (
                <a
                  key={proj.id}
                  href={`/project-management/${proj.id}`}
                  className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50/60 transition-colors group"
                >
                  <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${st.bg}`}>
                    <FolderKanban size={15} className={st.text} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                      {proj.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      公司：{proj.customer || '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {proj.projectOwner || proj.owner || '—'}
                      {proj.group ? ` · ${proj.group}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {proj.status}
                  </span>
                </a>
              )
            })}
          </div>
        </div>
      </div>

      {/* ══ 第二列：公司制度文件 + 我們的團隊 ════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── 公司制度文件 ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600">
                <FileText size={16} />
              </span>
              <h2 className="text-base font-bold text-gray-800">公司制度文件 / 表單</h2>
            </div>
            {admin && (
              <button
                onClick={() => setShowDocForm((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Plus size={14} />
                新增文件
              </button>
            )}
          </div>

          {/* 管理者新增表單 */}
          {admin && showDocForm && (
            <div className="px-6 py-4 bg-amber-50/60 border-b border-amber-100 space-y-3">
              <div className="flex gap-2">
                <input
                  placeholder="圖示（Emoji）"
                  value={docForm.icon}
                  onChange={(e) => setDocForm({ ...docForm, icon: e.target.value })}
                  className="w-20 text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <input
                  placeholder="分類（例如：人事制度）"
                  value={docForm.category}
                  onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <input
                placeholder="文件名稱"
                value={docForm.name}
                onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                placeholder="連結網址（例如：https://example.com/form）"
                value={docForm.link}
                onChange={(e) => setDocForm({ ...docForm, link: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={addDocument}
                  className="flex items-center gap-1 text-xs font-semibold bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
                >
                  <Check size={13} /> 確認新增
                </button>
                <button
                  onClick={() => setShowDocForm(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="px-6 py-4 max-h-[320px] overflow-y-auto space-y-5">
            {docCategories.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">尚無文件</p>
            )}
            {docCategories.map((cat) => (
              <div key={cat}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{cat}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {documents
                    .filter((d) => d.category === cat)
                    .map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => openDocumentLink(doc)}
                        title={doc.link ? getDocumentHref(doc.link) : '尚未設定連結'}
                        className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-100 bg-gray-50 transition-colors group ${
                          doc.link
                            ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-200'
                            : 'cursor-default hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-2xl">{doc.icon}</span>
                        <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{doc.name}</span>
                        {admin && (
                          <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              aria-label="編輯連結"
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditingDocumentLink(doc)
                              }}
                              className="text-gray-300 hover:text-blue-600 transition-colors"
                            >
                              <Link size={12} />
                            </button>
                            <button
                              type="button"
                              aria-label="刪除文件"
                              onClick={(e) => { e.stopPropagation(); removeDocument(doc.id) }}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        {admin && editingLinkDocId === doc.id && (
                          <div
                            className="absolute inset-x-2 top-2 z-10 rounded-lg border border-blue-100 bg-white p-2 shadow-lg"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              autoFocus
                              value={linkDraft}
                              onChange={(e) => setLinkDraft(e.target.value)}
                              placeholder="貼上連結網址"
                              className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <div className="mt-2 flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLinkDocId(null)
                                  setLinkDraft('')
                                }}
                                className="text-[11px] text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                              >
                                取消
                              </button>
                              <button
                                type="button"
                                onClick={() => saveDocumentLink(doc.id)}
                                className="text-[11px] font-semibold bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700"
                              >
                                儲存
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 我們的團隊 ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600">
                <Users size={16} />
              </span>
              <h2 className="text-base font-bold text-gray-800">我們的團隊</h2>
            </div>
          </div>

          <div className="px-6 py-4 max-h-[320px] overflow-y-auto">
            {membersLoading && (
              <p className="text-center text-sm text-gray-400 py-6">載入中...</p>
            )}
            {!membersLoading && members.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">暫無成員資料</p>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {sortedMembers.map((m) => {
                const points = getMemberPoints(m)
                return (
                <div key={m.id} className="flex flex-col items-center gap-2 rounded-xl p-3 hover:bg-gray-50 transition-colors">
                  <div className={`w-12 h-12 rounded-full ${m.color} flex items-center justify-center text-white text-lg font-bold shadow-sm`}>
                    {m.initial}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{m.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{m.jobTitle}</p>
                    <p className="mt-1 text-sm font-bold text-blue-600">{points} pts</p>
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 pt-5">
          <h2 className="text-lg font-bold text-gray-800">本月公司成果</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-2 xl:grid-cols-4">
          {monthlyAchievementCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.label}
                className={`flex min-h-[96px] items-center gap-5 rounded-xl px-6 py-4 ${card.cardClass}`}
              >
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${card.iconClass}`}>
                  <Icon size={28} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-600">{card.label}</p>
                  <div className="mt-1 flex items-end gap-1.5">
                    <span className="text-3xl font-bold leading-none text-slate-900">{card.value}</span>
                    <span className="pb-0.5 text-sm font-semibold text-slate-600">件</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Fallback 示範成員 ──────────────────────────────────────
const FALLBACK_MEMBERS: TeamMember[] = [
  { id: 1, name: 'admin',  aliases: ['admin'], jobTitle: '系統超級管理員', initial: 'A', color: 'bg-blue-500'    },
  { id: 2, name: 'bbb',    aliases: ['bbb'],   jobTitle: 'Boss 管理員',   initial: 'B', color: 'bg-violet-500'  },
  { id: 3, name: 'PPP',    aliases: ['PPP'],   jobTitle: 'PM Leader',     initial: 'P', color: 'bg-emerald-500' },
  { id: 4, name: 'ppp',    aliases: ['ppp'],   jobTitle: 'PM User',       initial: 'P', color: 'bg-amber-500'   },
  { id: 5, name: 'RRR',    aliases: ['RRR'],   jobTitle: 'RD Leader',     initial: 'R', color: 'bg-rose-500'    },
  { id: 6, name: 'rrr',    aliases: ['rrr'],   jobTitle: 'RD User',       initial: 'R', color: 'bg-cyan-500'    },
]

export default HomePage
