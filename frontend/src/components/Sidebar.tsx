import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  FolderKanban,
  Handshake,
  Home,
  Menu,
  Package,
  Settings,
  X,
} from 'lucide-react'

import { getRoleKey, LEAD_MANAGEMENT_ROLE_KEYS } from '@/utils/auth'

const SIDEBAR_HIDDEN_ITEMS_KEY = 'sidebarHiddenItems'
const SIDEBAR_MANAGER_ROLE_KEYS = ['super', 'boss'] as const

type ChildMenuItem = {
  key: string
  path: string
  label: string
}

type MenuItem =
  | {
      key: string
      path: string
      label: string
      icon: ReactNode
      allowedRoleKeys?: readonly string[]
    }
  | {
      key: string
      label: string
      icon: ReactNode
      children: ChildMenuItem[]
      allowedRoleKeys?: readonly string[]
    }

const menuItems: MenuItem[] = [
  { key: 'home', path: '/', label: '首頁', icon: <Home size={20} /> },
  {
    key: 'lead-management',
    path: '/lead-management',
    label: '洽案管理',
    icon: <Handshake size={20} />,
    allowedRoleKeys: LEAD_MANAGEMENT_ROLE_KEYS,
  },
  {
    key: 'project-management',
    path: '/project-management',
    label: '專案管理',
    icon: <FolderKanban size={20} />,
  },
  {
    key: 'work-report',
    label: '工作紀錄',
    icon: <FileText size={20} />,
    children: [
      { key: 'work-report-daily', path: '/work-report/daily', label: '每日工作紀錄' },
      { key: 'work-report-weekly', path: '/work-report/weekly', label: '每週工作紀錄' },
    ],
  },
  {
    key: 'asset-inventory',
    path: '/asset-inventory',
    label: '資財管理',
    icon: <Boxes size={20} />,
  },
  {
    key: 'material-inventory',
    path: '/material-inventory',
    label: '材料盤點',
    icon: <Package size={20} />,
  },
  { key: 'settings', path: '/settings', label: '設定', icon: <Settings size={20} /> },
]

const readHiddenItems = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SIDEBAR_HIDDEN_ITEMS_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : []
  } catch {
    return []
  }
}

const Sidebar = () => {
  const location = useLocation()
  const roleKey = getRoleKey()
  const canManageSidebar = SIDEBAR_MANAGER_ROLE_KEYS.includes(
    (roleKey ?? '') as (typeof SIDEBAR_MANAGER_ROLE_KEYS)[number]
  )
  const [collapsed, setCollapsed] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hiddenItemKeys, setHiddenItemKeys] = useState<string[]>(readHiddenItems)
  const [workReportOpen, setWorkReportOpen] = useState(
    location.pathname.startsWith('/work-report')
  )

  const hiddenKeySet = useMemo(() => new Set(hiddenItemKeys), [hiddenItemKeys])

  const visibleMenuItems = useMemo(
    () =>
      menuItems.filter((item) => {
        if (item.allowedRoleKeys && (!roleKey || !item.allowedRoleKeys.includes(roleKey))) {
          return false
        }
        return canManageSidebar || !hiddenKeySet.has(item.key)
      }),
    [canManageSidebar, hiddenKeySet, roleKey]
  )

  const isActive = (path: string) => location.pathname === path
  const isWorkReportActive = location.pathname.startsWith('/work-report')

  useEffect(() => {
    localStorage.setItem(SIDEBAR_HIDDEN_ITEMS_KEY, JSON.stringify(hiddenItemKeys))
  }, [hiddenItemKeys])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname.startsWith('/work-report')) {
      setWorkReportOpen(true)
    }
  }, [location.pathname])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--sidebar-width', collapsed ? '4.875rem' : '13.875rem')
    return () => {
      root.style.removeProperty('--sidebar-width')
    }
  }, [collapsed])

  const toggleSidebar = () => {
    if (collapsed) {
      setCollapsed(false)
      return
    }
    setShowLabels(false)
    setCollapsed(true)
  }

  const toggleHiddenItem = (key: string) => {
    setHiddenItemKeys((current) =>
      current.includes(key) ? current.filter((itemKey) => itemKey !== key) : [...current, key]
    )
  }

  const renderVisibilityButton = (key: string, label: string, mobile = false) => {
    if (!canManageSidebar) return null

    const hidden = hiddenKeySet.has(key)
    const Icon = hidden ? EyeOff : Eye

    return (
      <button
        type="button"
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-300 hover:bg-gray-700 hover:text-white ${
          mobile ? 'mr-1' : ''
        }`}
        title={hidden ? `顯示「${label}」` : `隱藏「${label}」`}
        aria-label={hidden ? `顯示「${label}」` : `隱藏「${label}」`}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          toggleHiddenItem(key)
        }}
      >
        <Icon size={16} />
      </button>
    )
  }

  const renderNavLink = (
    key: string,
    path: string,
    label: string,
    icon?: ReactNode,
    nested = false
  ) => {
    const hidden = hiddenKeySet.has(key)

    if (collapsed) {
      return (
        <Link
          key={key}
          to={path}
          title={label}
          onClick={() => setMobileOpen(false)}
          className={`flex min-h-11 items-center justify-center rounded-md px-2 hover:bg-gray-700 ${
            isActive(path) ? 'bg-gray-700 font-bold' : ''
          } ${hidden ? 'opacity-50' : ''}`}
        >
          {icon}
        </Link>
      )
    }

    return (
      <div key={key} className={`flex items-center gap-1 ${hidden ? 'opacity-60' : ''}`}>
        <Link
          to={path}
          title={label}
          onClick={() => setMobileOpen(false)}
          className={`flex min-h-11 min-w-0 flex-1 items-center rounded-md hover:bg-gray-700 ${
            nested ? 'pl-9 pr-3' : 'space-x-2 px-3'
          } ${isActive(path) ? 'bg-gray-700 font-bold' : ''}`}
        >
          {icon}
          {showLabels && <span className={`truncate text-sm ${nested ? 'text-gray-300' : ''}`}>{label}</span>}
        </Link>
        {renderVisibilityButton(key, label)}
      </div>
    )
  }

  const renderMenuItem = (item: MenuItem) => {
    if ('path' in item) {
      return renderNavLink(item.key, item.path, item.label, item.icon)
    }

    const groupActive = isWorkReportActive
    const groupHidden = hiddenKeySet.has(item.key)

    if (collapsed) {
      return (
        <Link
          key={item.key}
          to="/work-report/daily"
          title={item.label}
          className={`flex min-h-11 items-center justify-center rounded-md px-2 hover:bg-gray-700 ${
            groupActive ? 'bg-gray-700 font-bold' : ''
          } ${groupHidden ? 'opacity-50' : ''}`}
        >
          {item.icon}
        </Link>
      )
    }

    return (
      <div key={item.key} className={`space-y-1 ${groupHidden ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWorkReportOpen((prev) => !prev)}
            className={`flex min-h-11 min-w-0 flex-1 items-center justify-between rounded-md px-3 hover:bg-gray-700 ${
              groupActive ? 'bg-gray-700/60 font-bold' : ''
            }`}
          >
            <span className="flex min-w-0 items-center space-x-2">
              {item.icon}
              {showLabels && <span className="truncate text-sm">{item.label}</span>}
            </span>
            {showLabels &&
              (workReportOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          </button>
          {renderVisibilityButton(item.key, item.label)}
        </div>
        {workReportOpen &&
          item.children
            .filter((child) => canManageSidebar || !hiddenKeySet.has(child.key))
            .map((child) => renderNavLink(child.key, child.path, child.label, undefined, true))}
      </div>
    )
  }

  return (
    <div className="relative select-none">
      <button
        className="fixed left-3 top-[4.5rem] z-50 text-gray-800 md:hidden"
        aria-label={mobileOpen ? '關閉側邊欄' : '開啟側邊欄'}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      {mobileOpen && (
        <button
          className="fixed inset-0 top-16 z-30 bg-black/20 md:hidden"
          aria-label="關閉側邊欄遮罩"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className={`fixed left-0 top-16 z-40 h-full w-56 transform bg-gray-800 p-4 text-white shadow-lg transition-transform md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-4 flex justify-end">
          <button onClick={() => setMobileOpen(false)} aria-label="關閉側邊欄">
            <X size={24} />
          </button>
        </div>
        <nav className="flex flex-col space-y-2">
          {visibleMenuItems.map((item) => {
            if ('path' in item) {
              const hidden = hiddenKeySet.has(item.key)

              return (
                <div key={item.key} className={`flex items-center gap-1 ${hidden ? 'opacity-60' : ''}`}>
                  <Link
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex min-w-0 flex-1 items-center space-x-2 rounded-md px-3 py-2.5 hover:bg-gray-700 ${
                      isActive(item.path) ? 'bg-gray-700 font-bold' : ''
                    }`}
                  >
                    {item.icon}
                    <span className="truncate text-sm">{item.label}</span>
                  </Link>
                  {renderVisibilityButton(item.key, item.label, true)}
                </div>
              )
            }

            const hidden = hiddenKeySet.has(item.key)

            return (
              <div key={item.key} className={`space-y-1 ${hidden ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setWorkReportOpen((prev) => !prev)}
                    className="flex min-w-0 flex-1 items-center justify-between rounded-md px-3 py-2 hover:bg-gray-700"
                  >
                    <span className="truncate text-xs uppercase tracking-wide text-gray-400">
                      {item.label}
                    </span>
                    {workReportOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {renderVisibilityButton(item.key, item.label, true)}
                </div>
                {workReportOpen &&
                  item.children
                    .filter((child) => canManageSidebar || !hiddenKeySet.has(child.key))
                    .map((child) => {
                      const childHidden = hiddenKeySet.has(child.key)

                      return (
                        <div
                          key={child.key}
                          className={`flex items-center gap-1 ${childHidden ? 'opacity-60' : ''}`}
                        >
                          <Link
                            to={child.path}
                            onClick={() => setMobileOpen(false)}
                            className={`flex min-w-0 flex-1 rounded-md py-2 pl-8 pr-3 text-sm hover:bg-gray-700 ${
                              isActive(child.path) ? 'bg-gray-700 font-bold' : ''
                            }`}
                          >
                            <span className="truncate">{child.label}</span>
                          </Link>
                          {renderVisibilityButton(child.key, child.label, true)}
                        </div>
                      )
                    })}
              </div>
            )
          })}
        </nav>
      </div>

      <aside
        className={`fixed left-0 top-[3.9375rem] hidden h-[calc(100vh-3.9375rem)] bg-gray-800 text-white shadow-md transition-all duration-300 md:block ${
          collapsed ? 'w-[4.875rem]' : 'w-[13.875rem]'
        }`}
        onTransitionEnd={(event) => {
          if (event.propertyName === 'width' && !collapsed) {
            setShowLabels(true)
          }
        }}
      >
        <div className={`flex p-3 ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            onClick={toggleSidebar}
            className="text-white"
            aria-label={collapsed ? '展開側邊欄' : '收合側邊欄'}
          >
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
        <nav className="flex flex-col space-y-2 px-2">
          {visibleMenuItems.map((item) => renderMenuItem(item))}
        </nav>
      </aside>
    </div>
  )
}

export default Sidebar
