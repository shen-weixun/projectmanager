import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Boxes, ClipboardList, CodeXml, Home, FolderKanban, Menu, Settings, X } from 'lucide-react'
import { getRoleKey, PM_ROLE_KEYS, RD_ROLE_KEYS } from '@/utils/auth'

const menuItems = [
  { path: '/', label: '首頁', icon: <Home size={20} /> },
  {
    path: '/project-management',
    label: '專案管理',
    icon: <FolderKanban size={20} />,
  },
  {
    path: '/pm-weekly-report',
    label: 'PM 週報',
    icon: <ClipboardList size={20} />,
  },
  {
    path: '/rd-weekly-report',
    label: 'RD 週報',
    icon: <CodeXml size={20} />,
  },
  {
    path: '/asset-inventory',
    label: '財產清單',
    icon: <Boxes size={20} />,
  },
  { path: '/settings', label: '設定', icon: <Settings size={20} /> },
]

const Sidebar = () => {
  const location = useLocation()
  const roleKey = getRoleKey()
  const [collapsed, setCollapsed] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isActive = (path: string) => location.pathname === path

  useEffect(() => {
    // 路由切換後關閉手機版選單，避免新頁面仍維持展開狀態。
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    // 將側邊欄寬度同步到 CSS 變數，讓主內容區能跟著收合狀態調整。
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

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.path === '/pm-weekly-report') {
      return PM_ROLE_KEYS.includes(roleKey ?? '')
    }
    if (item.path === '/rd-weekly-report') {
      return RD_ROLE_KEYS.includes(roleKey ?? '')
    }
    return true
  })

  return (
    <div className="relative select-none">
      <button
        className="fixed top-[4.5rem] left-3 z-50 md:hidden text-gray-800"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      {mobileOpen && (
        <button
          className="fixed inset-0 top-16 bg-black/20 z-30 md:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className={`fixed top-16 left-0 h-full w-56 bg-gray-800 text-white p-4 shadow-lg transform transition-transform z-40 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex justify-end mb-4">
          <button onClick={() => setMobileOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <nav className="flex flex-col space-y-2">
          {visibleMenuItems.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center space-x-2 px-3 py-2.5 rounded-md hover:bg-gray-700 ${isActive(path) ? 'bg-gray-700 font-bold' : ''
                }`}
            >
              {icon}
              <span className="text-sm">{label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <aside
        className={`hidden md:block fixed top-[3.9375rem] left-0 h-[calc(100vh-3.9375rem)] bg-gray-800 text-white shadow-md transition-all duration-300 ${collapsed ? 'w-[4.875rem]' : 'w-[13.875rem]'
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
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
        <nav className="flex flex-col space-y-2 px-2">
          {visibleMenuItems.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              title={collapsed ? label : undefined}
              className={`flex items-center rounded-md hover:bg-gray-700 min-h-11 ${collapsed ? 'justify-center px-2' : 'space-x-2 px-3'
                } ${isActive(path) ? 'bg-gray-700 font-bold' : ''
                }`}
            >
              {icon}
              {showLabels && !collapsed && <span className="text-sm">{label}</span>}
            </Link>
          ))}
        </nav>
      </aside>
    </div>
  )
}

export default Sidebar
