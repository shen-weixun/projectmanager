import {
  PRIORITY_BADGE_CLASS,
  PRIORITY_LABEL,
  PROJECT_STAGE_LABEL,
  STAGE_BADGE_CLASS,
  type PMProject,
} from "@/types/api"

type ClosedProjectsTableProps = {
  projects: PMProject[]
}

const ClosedProjectsTable = ({ projects }: ClosedProjectsTableProps) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[960px] text-left">
        <thead className="bg-slate-100 text-sm font-semibold text-slate-700">
          <tr>
            <th className="px-4 py-3">專案名稱</th>
            <th className="px-4 py-3">廠商</th>
            <th className="px-4 py-3">主管</th>
            <th className="px-4 py-3">階段</th>
            <th className="px-4 py-3">優先度</th>
            <th className="px-4 py-3">結束時間</th>
            <th className="px-4 py-3">摘要</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            // 已結案與已撤案共用同一欄位顯示結束時間。
            const endedAt = project.closedAt || project.cancelledAt || "-"
            return (
              <tr key={project.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{project.projectName}</td>
                <td className="px-4 py-3 text-slate-600">{project.vendor || "-"}</td>
                <td className="px-4 py-3 text-slate-600">{project.manager || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_BADGE_CLASS[project.stage]}`}>
                    {PROJECT_STAGE_LABEL[project.stage]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_BADGE_CLASS[project.priority]}`}>
                    {PRIORITY_LABEL[project.priority]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{endedAt}</td>
                <td className="px-4 py-3 text-slate-600">{project.summary || "-"}</td>
              </tr>
            )
          })}
          {projects.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                目前沒有已結案或已撤案資料
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default ClosedProjectsTable
