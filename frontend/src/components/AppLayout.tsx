import { Outlet, useLocation } from 'react-router-dom'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import PageMeta from '@/components/PageMeta'

const getPageTitle = (pathname: string) => {
  if (pathname === '/') return '廣思內部系統首頁'
  if (pathname.startsWith('/project-management')) return '專案管理'
  if (pathname.startsWith('/pm-weekly-report')) return 'PM 週報工作表'
  if (pathname.startsWith('/rd-weekly-report')) return 'RD 週報工作表'
  if (pathname.startsWith('/asset-inventory')) return '財產清單'
  if (pathname.startsWith('/settings')) return '設定'
  return '廣思內部系統'
}

const AppLayout = () => {
  const location = useLocation()
  const title = getPageTitle(location.pathname)

  return (
    <div className="min-h-screen bg-amber-50">
      <PageMeta title={title} />
      <Header title={title} />
      <Sidebar />
      <main className="app-layout-main">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
