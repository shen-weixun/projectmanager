import { Trash2 } from "lucide-react"
import EditableCell from "@/components/weekly/EditableCell"
import { Button } from "@/components/ui/button"
import RDStatusSelect from "@/components/weekly/RDStatusSelect"
import { RD_STATUS_LABEL, type RDReport } from "@/types/api"

type RDTableProps = {
  reports: RDReport[]
  onFieldChange: <K extends keyof RDReport>(
    reportId: number,
    field: K,
    value: RDReport[K]
  ) => void
  onDeleteReport: (reportId: number) => void
}

const RDTable = ({ reports, onFieldChange, onDeleteReport }: RDTableProps) => {
  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-slate-400 bg-white shadow-sm">
      <table className="min-w-[1660px] w-full border-collapse text-center">
        <thead className="bg-slate-200 text-base font-bold text-slate-800">
          <tr>
            {/* RD 週報表格欄位標題，與下方資料欄位順序一致。 */}
            {[
              "廠商",
              "專案名稱",
              "執行人",
              "項目狀態",
              "工項",
              "項目內容",
              "預計開始",
              "預計完成",
              "實際完成",
              "備註",
              "刪除",
            ].map((label) => (
              <th key={label} className="border-b border-slate-400 px-5 py-4 align-middle whitespace-nowrap">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* 將 RD 工項資料逐列轉成可直接編輯的週報表格。 */}
          {reports.map((report) => (
            <tr key={report.id} className="border-b border-slate-300 align-middle hover:bg-slate-100/80">
              <td className="border-r border-slate-300 px-4 py-4"><EditableCell value={report.vendor} onSave={(v) => onFieldChange(report.id, "vendor", v)} className="min-w-[10rem]" placeholder="輸入廠商" /></td>
              <td className="border-r border-slate-300 px-4 py-4"><EditableCell value={report.projectName} onSave={(v) => onFieldChange(report.id, "projectName", v)} className="min-w-[12rem]" placeholder="輸入專案名稱" /></td>
              <td className="border-r border-slate-300 px-4 py-4"><EditableCell value={report.executor} onSave={(v) => onFieldChange(report.id, "executor", v)} className="min-w-[9rem]" placeholder="輸入執行人" /></td>
              <td className="border-r border-slate-300 px-4 py-4"><RDStatusSelect value={report.itemStatus} onChange={(v) => onFieldChange(report.id, "itemStatus", v)} /></td>
              <td className="border-r border-slate-300 px-4 py-4"><EditableCell value={report.taskName} onSave={(v) => onFieldChange(report.id, "taskName", v)} className="min-w-[10rem]" placeholder="輸入工項" /></td>
              <td className="border-r border-slate-300 px-4 py-4"><EditableCell value={report.itemContent} onSave={(v) => onFieldChange(report.id, "itemContent", v)} className="min-w-[16rem]" multiline placeholder="輸入項目內容" /></td>
              <td className="border-r border-slate-300 px-4 py-4"><EditableCell value={report.plannedStart} onSave={(v) => onFieldChange(report.id, "plannedStart", v)} className="min-w-[10rem]" placeholder="2026-05-05" /></td>
              <td className="border-r border-slate-300 px-4 py-4"><EditableCell value={report.plannedEnd} onSave={(v) => onFieldChange(report.id, "plannedEnd", v)} className="min-w-[10rem]" placeholder="2026-05-09" /></td>
              <td className="border-r border-slate-300 px-4 py-4"><EditableCell value={report.actualCompleted} onSave={(v) => onFieldChange(report.id, "actualCompleted", v)} className="min-w-[10rem]" placeholder="2026-05-08" /></td>
              <td className="border-r border-slate-300 px-4 py-4"><EditableCell value={report.notes} onSave={(v) => onFieldChange(report.id, "notes", v)} className="min-w-[14rem]" multiline placeholder="備註" /></td>
              <td className="px-4 py-4">
                <Button type="button" variant="ghost" size="icon" className="size-10 border border-rose-200 text-rose-700 hover:bg-rose-100 hover:text-rose-800" onClick={() => onDeleteReport(report.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </td>
            </tr>
          ))}
          {reports.length === 0 && (
            <tr>
              <td colSpan={11} className="px-6 py-14 text-center text-base text-slate-600">
                目前沒有符合條件的 RD 週報資料
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="border-t border-slate-400 bg-slate-100 px-5 py-4 text-sm text-slate-700">
        項目狀態：{Object.values(RD_STATUS_LABEL).join(" / ")}
      </div>
    </div>
  )
}

export default RDTable
