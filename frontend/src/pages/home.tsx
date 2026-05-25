import { useEffect, useState } from 'react'
import { Megaphone, FolderKanban, FileText, Users, Plus, X, ChevronRight, Pencil, Check } from 'lucide-react'
import { getProjectsAPI } from '@/services/apis'
import { getRoleKey } from '@/utils/auth'
import type { Project } from '@/types/api'

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
}

type TeamMember = {
  id: number
  name: string
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
    getProjectsAPI({ pageSize: 20 }).then((res) => {
      if (res.status === 0) setProjects(res.data.items)
      setProjectsLoading(false)
    })
  }, [])

  // ── 文件 ─────────────────────────────────────────────────
  const [documents, setDocuments] = useState<Document[]>(() =>
    loadJSON(DOC_KEY, DEFAULT_DOCUMENTS)
  )
  const [showDocForm, setShowDocForm] = useState(false)
  const [docForm, setDocForm] = useState({ category: '', name: '', icon: '📄' })

  const addDocument = () => {
    if (!docForm.name.trim() || !docForm.category.trim()) return
    const next = [...documents, { ...docForm, id: Date.now().toString() }]
    setDocuments(next)
    saveJSON(DOC_KEY, next)
    setDocForm({ category: '', name: '', icon: '📄' })
    setShowDocForm(false)
  }

  const removeDocument = (id: string) => {
    const next = documents.filter((d) => d.id !== id)
    setDocuments(next)
    saveJSON(DOC_KEY, next)
  }

  // ── 團隊成員（從 user/groups 取得群組，用戶由 user/profile 取得）──
  // 因為目前沒有「取得所有使用者」的前端 API，我們直接呼叫後端 /api/users/list
  // 若沒有該 API，則顯示 fallback 示範資料
  const [members, setMembers] = useState<TeamMember[]>([])
  const [membersLoading, setMembersLoading] = useState(true)

  useEffect(() => {
    // 嘗試呼叫後端取得成員清單（若後端有此 endpoint）
    fetch('/api/users/list', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') ?? sessionStorage.getItem('token') ?? ''}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.status === 0 && Array.isArray(data.data)) {
          const mapped: TeamMember[] = data.data.map(
            (u: { id: number; name: string; job_title?: string; jobTitle?: string }, i: number) => ({
              id: u.id,
              name: u.name,
              jobTitle: u.job_title ?? u.jobTitle ?? '—',
              initial: u.name?.charAt(0) ?? '?',
              color: avatarColors[i % avatarColors.length],
            })
          )
          setMembers(mapped)
        } else {
          // fallback 示範資料
          setMembers(FALLBACK_MEMBERS)
        }
      })
      .catch(() => setMembers(FALLBACK_MEMBERS))
      .finally(() => setMembersLoading(false))
  }, [])

  // 依分類分組文件
  const docCategories = Array.from(new Set(documents.map((d) => d.category)))

  return (
    <div className="w-full max-w-[1400px] mx-auto pb-10 space-y-6">

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
              <h2 className="text-base font-bold text-gray-800">重要執行中專案</h2>
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
              <p className="px-6 py-10 text-center text-sm text-gray-400">目前無專案資料</p>
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
                    <p className="text-xs text-gray-400 mt-0.5">
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
                        className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer group"
                      >
                        <span className="text-2xl">{doc.icon}</span>
                        <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{doc.name}</span>
                        {admin && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeDocument(doc.id) }}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                          >
                            <X size={12} />
                          </button>
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
              {members.map((m) => (
                <div key={m.id} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`w-12 h-12 rounded-full ${m.color} flex items-center justify-center text-white text-lg font-bold shadow-sm`}>
                    {m.initial}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{m.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{m.jobTitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Fallback 示範成員 ──────────────────────────────────────
const FALLBACK_MEMBERS: TeamMember[] = [
  { id: 1, name: '系統管理員', jobTitle: '超級管理員',  initial: '管', color: 'bg-blue-500'    },
  { id: 2, name: 'Boss',      jobTitle: '管理者',      initial: 'B', color: 'bg-violet-500'  },
  { id: 3, name: 'PM Leader', jobTitle: 'PM 主管',     initial: 'P', color: 'bg-emerald-500' },
  { id: 4, name: 'PM User',   jobTitle: 'PM 人員',     initial: 'P', color: 'bg-amber-500'   },
  { id: 5, name: 'RD Leader', jobTitle: 'RD 主管',     initial: 'R', color: 'bg-rose-500'    },
  { id: 6, name: 'RD User',   jobTitle: 'RD 人員',     initial: 'R', color: 'bg-cyan-500'    },
]

export default HomePage
