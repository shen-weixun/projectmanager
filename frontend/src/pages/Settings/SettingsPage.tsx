import { NavLink, Outlet } from 'react-router-dom'

import CompanyInfoSetting from '@/pages/Settings/CompanyInfoSetting'

// tabs 陣列改成：
const tabs = [
  { name: '個人資料管理', path: '/settings/profile' },
  { name: '公司資訊管理', path: '/settings/company-info' },
  { name: '部門管理', path: '/settings/departments' },
  { name: '專案類別管理', path: '/settings/project-category' },
]

const SettingsPage = () => {
  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="max-w-7xl max-auto px-4 py-2 flex-shrink-0">
        <div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl border text-sm transition-all duration-200
                    ${isActive
                    ? 'bg-white text-blue-600 border-blue-500 shadow font-semibold'
                    : 'bg-gray-100 text-gray-700 border-transparent hover:bg-white hover:shadow'
                  }`
                }
              >
                {tab.name}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
      <hr className="mb-4" />

      <div className="flex-1 overflow-y-auto px-4 pb-2 w-full max-w-[1800px] mx-auto grow">
        <div className="bg-white rounded-lg shadow p-6 min-h-[300px]">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default SettingsPage