import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './assets/styles/App.css'

import AppLayout from '@/components/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/pages/Login'
import HomePage from '@/pages/home'
import AssetInventoryPage from '@/pages/asset/AssetInventory'
import AssetWithdrawRecordsPage from '@/pages/asset/AssetWithdrawRecords'
import MaterialInventoryPage from '@/pages/material/MaterialInventory'
import MaterialTransferRecordsPage from '@/pages/material/MaterialTransferRecords'
import LeadManagementPage from '@/pages/lead/LeadManagement'
import ProjectManagementPage from '@/pages/project/ProjectManagement'
import ProjectDetailPage from '@/pages/project/ProjectDetail'
import DailyWorkRecord from '@/pages/work-report/DailyWorkRecord'
import WeeklyWorkRecord from '@/pages/work-report/WeeklyWorkRecord'
import SettingsPage from '@/pages/Settings/SettingsPage'
import UserProfileSetting from '@/pages/Settings/UserProfileSetting'
import DepartmentSetting from '@/pages/Settings/DepartmentSetting'
import CompanyInfoSetting from '@/pages/Settings/CompanyInfoSetting'
import ProjectCategorySetting from '@/pages/Settings/ProjectCategorySetting'
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
              path="lead-management"
              element={<LeadManagementPage />}
            />
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
              element={<Navigate to="/work-report/weekly" replace />}
            />
            <Route
              path="rd-weekly-report"
              element={<Navigate to="/work-report/weekly" replace />}
            />
            <Route path="work-report/daily" element={<DailyWorkRecord />} />
            <Route path="work-report/weekly" element={<WeeklyWorkRecord />} />
            <Route path="asset-inventory" element={<AssetInventoryPage />} />
            <Route path="asset-inventory/withdraw-records" element={<AssetWithdrawRecordsPage />} />
            <Route path="material-inventory" element={<MaterialInventoryPage />} />
            <Route path="material-inventory/transfer-records" element={<MaterialTransferRecordsPage />} />
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
