import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Boxes,
  ChevronDown,
  ChevronRight,
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

type MenuItem =
  | {
      path: string
      label: string
      icon: ReactNode
      allowedRoleKeys?: readonly string[]
    }
  | {
      label: string
      icon: ReactNode
      children: { path: string; label: string }[]
      allowedRoleKeys?: readonly string[]
    }

const menuItems: MenuItem[] = [
  { path: '/', label: '首頁', icon: <Home size={20} /> },
  {
    path: '/lead-management',
    label: '洽案管理',
    icon: <Handshake size={20} />,
    allowedRoleKeys: LEAD_MANAGEMENT_ROLE_KEYS,
  },
  {
    path: '/project-management',
    label: '專案管理',
    icon: <FolderKanban size={20} />,
  },
  {
    label: '工作紀錄',
    icon: <FileText size={20} />,
    children: [
      { path: '/work-report/daily', label: '每日工作紀錄' },
      { path: '/work-report/weekly', label: '每週工作紀錄' },
    ],
  },
  {
    path: '/asset-inventory',
    label: '資財管理',
    icon: <Boxes size={20} />,
  },
  {
    path: '/material-inventory',
    label: '材料盤點',
    icon: <Package size={20} />,
  },
  { path: '/settings', label: '設定', icon: <Settings size={20} /> },
]

const Sidebar = () => {
  const location = useLocation()
  const roleKey = getRoleKey()
  const [collapsed, setCollapsed] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [workReportOpen, setWorkReportOpen] = useState(
    location.pathname.startsWith('/work-report')
  )

  const visibleMenuItems = useMemo(
    () =>
      menuItems.filter((item) => {
        if (!item.allowedRoleKeys) return true
        return roleKey ? item.allowedRoleKeys.includes(roleKey) : false
      }),
    [roleKey]
  )

  const isActive = (path: string) => location.pathname === path
  const isWorkReportActive = location.pathname.startsWith('/work-report')

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

  const renderNavLink = (
    path: string,
    label: string,
    icon?: ReactNode,
    nested = false
  ) => (
    <Link
      key={path}
      to={path}
      title={collapsed ? label : undefined}
      onClick={() => setMobileOpen(false)}
      className={`flex min-h-11 items-center rounded-md hover:bg-gray-700 ${
        nested && !collapsed ? 'pl-9 pr-3' : collapsed ? 'justify-center px-2' : 'space-x-2 px-3'
      } ${isActive(path) ? 'bg-gray-700 font-bold' : ''}`}
    >
      {icon}
      {showLabels && !collapsed && (
        <span className={`text-sm ${nested ? 'text-gray-300' : ''}`}>{label}</span>
      )}
    </Link>
  )

  const renderMenuItem = (item: MenuItem) => {
    if ('path' in item) {
      return renderNavLink(item.path, item.label, item.icon)
    }

    const groupActive = isWorkReportActive

    if (collapsed) {
      return (
        <Link
          key="work-report"
          to="/work-report/daily"
          title="工作紀錄"
          className={`flex min-h-11 items-center justify-center rounded-md px-2 hover:bg-gray-700 ${
            groupActive ? 'bg-gray-700 font-bold' : ''
          }`}
        >
          {item.icon}
        </Link>
      )
    }

    return (
      <div key="work-report-group" className="space-y-1">
        <button
          type="button"
          onClick={() => setWorkReportOpen((prev) => !prev)}
          className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 hover:bg-gray-700 ${
            groupActive ? 'bg-gray-700/60 font-bold' : ''
          }`}
        >
          <span className="flex items-center space-x-2">
            {item.icon}
            {showLabels && <span className="text-sm">{item.label}</span>}
          </span>
          {showLabels &&
            (workReportOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </button>
        {workReportOpen &&
          item.children.map((child) =>
            renderNavLink(child.path, child.label, undefined, true)
          )}
      </div>
    )
  }

  return (
    <div className="relative select-none">
      <button
        className="fixed left-3 top-[4.5rem] z-50 text-gray-800 md:hidden"
        aria-label={mobileOpen ? '關閉選單' : '開啟選單'}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      {mobileOpen && (
        <button
          className="fixed inset-0 top-16 z-30 bg-black/20 md:hidden"
          aria-label="關閉選單遮罩"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className={`fixed left-0 top-16 z-40 h-full w-56 transform bg-gray-800 p-4 text-white shadow-lg transition-transform md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-4 flex justify-end">
          <button onClick={() => setMobileOpen(false)} aria-label="關閉選單">
            <X size={24} />
          </button>
        </div>
        <nav className="flex flex-col space-y-2">
          {visibleMenuItems.map((item) => {
            if ('path' in item) {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center space-x-2 rounded-md px-3 py-2.5 hover:bg-gray-700 ${
                    isActive(item.path) ? 'bg-gray-700 font-bold' : ''
                  }`}
                >
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            }
            return (
              <div key="work-report-mobile" className="space-y-1">
                <p className="px-3 py-1 text-xs uppercase tracking-wide text-gray-400">
                  {item.label}
                </p>
                {item.children.map((child) => (
                  <Link
                    key={child.path}
                    to={child.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex rounded-md py-2 pl-8 pr-3 text-sm hover:bg-gray-700 ${
                      isActive(child.path) ? 'bg-gray-700 font-bold' : ''
                    }`}
                  >
                    {child.label}
                  </Link>
                ))}
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
