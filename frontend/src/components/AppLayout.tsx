import { Outlet, useLocation } from 'react-router-dom'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import PageMeta from '@/components/PageMeta'

const getPageTitle = (pathname: string) => {
  if (pathname === '/') return '首頁'
  if (pathname.startsWith('/lead-management')) return '洽案管理'
  if (pathname.startsWith('/project-management')) return '專案管理'
  if (pathname.startsWith('/work-report/daily')) return '每日工作紀錄'
  if (pathname.startsWith('/work-report/weekly')) return '每週工作紀錄'
  if (pathname.startsWith('/asset-inventory')) return '資財管理'
  if (pathname.startsWith('/material-inventory')) return '材料盤點'
  if (pathname.startsWith('/settings')) return '設定'
  return '專案管理系統'
}

const AppLayout = () => {
  const location = useLocation()
  const title = getPageTitle(location.pathname)

  return (
    <div className="min-h-screen bg-[#f5f8fc]">
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
