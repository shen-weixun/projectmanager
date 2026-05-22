import { Trash2 } from "lucide-react"
import EditableCell from "@/components/weekly/EditableCell"
import PrioritySelect from "@/components/weekly/PrioritySelect"
import ProjectStageSelect from "@/components/weekly/ProjectStageSelect"
import { Button } from "@/components/ui/button"
import { PRIORITY_LABEL, PROJECT_STAGE_LABEL, type PMProject } from "@/types/api"

type PMTableProps = {
  projects: PMProject[]
  onFieldChange: <K extends keyof PMProject>(
    projectId: number,
    field: K,
    value: PMProject[K]
  ) => void
  onDeleteProject: (projectId: number) => void
}

const PMTable = ({ projects, onFieldChange, onDeleteProject }: PMTableProps) => {
  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-slate-400 bg-white shadow-sm">
      <table className="min-w-[1760px] w-full border-collapse text-center">
        <thead className="bg-slate-200 text-base font-bold text-slate-800">
          <tr>
            {/* PM 週報表格欄位標題，與下方資料欄位順序一致。 */}
            {[
              "專案名稱",
              "廠商",
              "摘要",
              "執行時間",
              "主管",
              "協辦",
              "執行階段",
              "優先度",
              "預計執行",
              "上週進度",
              "本週待辦",
              "實際執行",
              "備註",
              "刪除",
            ].map((label) => (
              <th key={label} className="border-b border-slate-400 px-5 py-4 align-middle whitespace-nowrap text-center">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* 將 PM 專案資料逐列轉成可直接編輯的週報表格。 */}
          {projects.map((project) => (
            <tr key={project.id} className="border-b border-slate-300 align-middle hover:bg-slate-100/80">
              <td className="border-r border-slate-300 px-4 py-4 align-middle text-center">
                <EditableCell
                  value={project.projectName}
                  placeholder="輸入專案名稱"
                  onSave={(value) => onFieldChange(project.id, "projectName", value)}
                  className="min-w-[13rem]"
                />
              </td>
              <td className="border-r border-slate-300 px-4 py-4 align-middle text-center">
                <EditableCell
                  value={project.vendor}
                  placeholder="輸入廠商"
                  onSave={(value) => onFieldChange(project.id, "vendor", value)}
                  className="min-w-[9rem]"
                />
              </td>
              <td className="border-r border-slate-300 px-4 py-4 align-middle text-center">
                <EditableCell
                  value={project.summary}
                  multiline
                  placeholder="專案摘要"
                  onSave={(value) => onFieldChange(project.id, "summary", value)}
                  className="min-w-[16rem]"
                />
              </td>
              <td className="border-r border-slate-300 px-4 py-4 align-middle text-center">
                <EditableCell
                  value={project.executionTime}
                  placeholder="2026/05 - 2026/06"
                  onSave={(value) => onFieldChange(project.id, "executionTime", value)}
                  className="min-w-[11rem]"
                />
              </td>
              <td className="border-r border-slate-300 px-4 py-4 align-middle text-center">
                <EditableCell
                  value={project.manager}
                  placeholder="主管"
                  onSave={(value) => onFieldChange(project.id, "manager", value)}
                  className="min-w-[8rem]"
                />
              </td>
              <td className="border-r border-slate-300 px-4 py-4 align-middle text-center">
                <EditableCell
                  value={project.assistants}
                  placeholder="協辦人員"
                  onSave={(value) => onFieldChange(project.id, "assistants", value)}
                  className="min-w-[9rem]"
                />
              </td>
              <td className="border-r border-slate-300 px-4 py-4 align-middle text-center">
                <ProjectStageSelect
                  value={project.stage}
                  onChange={(value) => onFieldChange(project.id, "stage", value)}
                />
              </td>
              <td className="border-r border-slate-300 px-4 py-4 align-middle text-center">
                <PrioritySelect
                  value={project.priority}
                  onChange={(value) => onFieldChange(project.id, "priority", value)}
                />
              </td>
              <td className="border-r border-slate-300 px-4 py-4 align-middle text-center">
                <EditableCell
                  value={project.plannedExecution}
                  multiline
                  placeholder="預計執行"
                  onSave={(value) =>
                    onFieldChange(project.id, "plannedExecution", value)
                  }
                  className="min-w-[15rem]"
                />
              </td>
              <td className="border-r border-slate-300 px-4 py-4 align-middle text-center">
                <EditableCell
                  value={project.lastWeekProgress}
                  multiline
                  placeholder="上週進度"
                  onSave={(value) => onFieldChange(project.id, "lastWeekProgress", value)}
                  className="min-w-[15rem]"
                />
              </td>
              <td className="border-r border-slate-300 px-4 py-4 align-middle text-center">
                <EditableCell
                  value={project.thisWeekTodo}
                  multiline
                  placeholder="本週待辦"
                  onSave={(value) => onFieldChange(project.id, "thisWeekTodo", value)}
                  className="min-w-[15rem]"
                />
              </td>
              <td className="border-r border-slate-300 px-4 py-4 align-middle text-center">
                <EditableCell
                  value={project.actualExecution}
                  multiline
                  placeholder="實際執行"
                  onSave={(value) =>
                    onFieldChange(project.id, "actualExecution", value)
                  }
                  className="min-w-[15rem]"
                />
              </td>
              <td className="border-r border-slate-300 px-4 py-4 align-middle text-center">
                <EditableCell
                  value={project.notes}
                  multiline
                  placeholder="備註"
                  onSave={(value) => onFieldChange(project.id, "notes", value)}
                  className="min-w-[13rem]"
                />
              </td>
              <td className="px-4 py-4 align-middle text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 border border-rose-200 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                  onClick={() => onDeleteProject(project.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </td>
            </tr>
          ))}
          {projects.length === 0 && (
            <tr>
              <td colSpan={14} className="px-6 py-14 text-center text-base text-slate-600">
                目前沒有符合條件的專案資料
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="border-t border-slate-400 bg-slate-150 px-5 py-4 text-sm text-slate-700">
        執行階段：{Object.values(PROJECT_STAGE_LABEL).join(" / ")}，優先度：{Object.values(PRIORITY_LABEL).join(" / ")}
      </div>
    </div>
  )
}

export default PMTable
