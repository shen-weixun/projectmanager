import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './assets/styles/App.css'

import AppLayout from '@/components/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { getRoleKey, getToken, PM_ROLE_KEYS, RD_ROLE_KEYS } from '@/utils/auth'
import LoginPage from '@/pages/Login'
import HomePage from '@/pages/home'
import AssetInventoryPage from '@/pages/asset/AssetInventory'
import AssetWithdrawRecordsPage from '@/pages/asset/AssetWithdrawRecords'
import ProjectManagementPage from '@/pages/project/ProjectManagement'
import ProjectDetailPage from '@/pages/project/ProjectDetail'
import PMWeeklyReport from '@/pages/weekly/PMWeeklyReport'
import RDWeeklyReport from '@/pages/weekly/RDWeeklyReport'
import SettingsPage from '@/pages/Settings/SettingsPage'
import UserProfileSetting from '@/pages/Settings/UserProfileSetting'
import DepartmentSetting from '@/pages/Settings/DepartmentSetting'
import CompanyInfoSetting from '@/pages/Settings/CompanyInfoSetting'
import ProjectCategorySetting from '@/pages/Settings/ProjectCategorySetting'
const getDefaultWeeklyReportPath = () => {
  const token = getToken()
  if (!token) {
    return '/login'
  }

  const roleKey = getRoleKey()
  if (!roleKey) {
    return '/'
  }
  if (roleKey === 'rd_leader' || roleKey === 'rd_user') {
    return '/rd-weekly-report'
  }
  return '/pm-weekly-report'
}

const PMRouteGuard = () => {
  const roleKey = getRoleKey()
  if (!PM_ROLE_KEYS.includes(roleKey as (typeof PM_ROLE_KEYS)[number])) {
    return <Navigate to={getDefaultWeeklyReportPath()} replace />
  }
  return <PMWeeklyReport />
}

const RDRouteGuard = () => {
  const roleKey = getRoleKey()
  if (!RD_ROLE_KEYS.includes(roleKey as (typeof RD_ROLE_KEYS)[number])) {
    return <Navigate to={getDefaultWeeklyReportPath()} replace />
  }
  return <RDWeeklyReport />
}

function App() {
  return (
    <Router>
      <>
        <ToastContainer position="top-center" autoClose={3000} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route
              path="project-management"
              element={<ProjectManagementPage />}
            />
            <Route
              path="project-management/:projectId"
              element={<ProjectDetailPage />}
            />
            <Route
              path="pm-weekly-report"
              element={<PMRouteGuard />}
            />
            <Route
              path="rd-weekly-report"
              element={<RDRouteGuard />}
            />
            <Route path="asset-inventory" element={<AssetInventoryPage />} />
            <Route path="asset-inventory/withdraw-records" element={<AssetWithdrawRecordsPage />} />
            <Route path="settings" element={<SettingsPage />}>
               <Route index element={<Navigate to="profile" replace />} />
               <Route path="profile" element={<UserProfileSetting />} />
               <Route path="company-info" element={<CompanyInfoSetting />} />
               <Route path="departments" element={<DepartmentSetting />} />
               <Route path="project-category" element={<ProjectCategorySetting />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    </Router>
  )
}

export default App
