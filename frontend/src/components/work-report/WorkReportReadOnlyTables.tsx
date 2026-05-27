import WorkReportOptionPill from "@/components/work-report/WorkReportOptionPill";
import type { OptionsByHeader } from "@/utils/workReportOptions";

interface TableData {
  headers: string[];
  rows: Record<string, string>[];
}

interface CustomTable {
  id: number;
  table_name: string;
  table_data: TableData;
}

interface UserBlock {
  user_id: number;
  user_name: string;
  tables: CustomTable[];
}

interface WorkReportReadOnlyTablesProps {
  blocks: UserBlock[];
  schemaHeaders: string[];
  optionsByHeader: OptionsByHeader;
  emptyMessage?: string;
}

export default function WorkReportReadOnlyTables({
  blocks,
  schemaHeaders,
  optionsByHeader,
  emptyMessage = "前一週尚無工作紀錄",
}: WorkReportReadOnlyTablesProps) {
  if (blocks.length === 0) {
    return (
      <p className="text-center py-8 text-slate-400 text-sm">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <div
          key={block.user_id}
          className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4"
        >
          <h3 className="text-lg font-bold text-slate-600">
            {block.user_name} 的工作紀錄
          </h3>

          {block.tables.length === 0 ? (
            <p className="text-center py-4 text-slate-400 text-sm">
              此人前一週尚未填寫。
            </p>
          ) : (
            block.tables.map((table) => {
              const headers =
                schemaHeaders.length > 0
                  ? schemaHeaders
                  : table.table_data?.headers ?? [];
              const rows = table.table_data?.rows ?? [];

              return (
                <div
                  key={table.id}
                  className="border border-slate-200 rounded-xl p-4 bg-white space-y-3"
                >
                  <p className="text-md font-semibold text-slate-700">
                    {table.table_name}
                  </p>
                  <div className="overflow-x-auto border border-slate-100 rounded-lg">
                    <table className="w-full border-collapse text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          {headers.map((header, hIndex) => (
                            <th
                              key={hIndex}
                              className="border border-slate-200 p-2.5 min-w-[140px] text-center font-bold"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={headers.length || 1}
                              className="text-center p-4 text-slate-400"
                            >
                              無資料
                            </td>
                          </tr>
                        ) : (
                          rows.map((row, rIndex) => (
                            <tr key={rIndex} className="hover:bg-slate-50/50">
                              {headers.map((header, cIndex) => (
                                <td
                                  key={cIndex}
                                  className="border border-slate-200 p-1"
                                >
                                  <span className="p-1.5 block min-h-[32px] whitespace-pre-wrap text-slate-700">
                                    {row[header] ? (
                                      optionsByHeader[header]?.length ? (
                                        <WorkReportOptionPill
                                          label={row[header]}
                                        />
                                      ) : (
                                        row[header]
                                      )
                                    ) : (
                                      "—"
                                    )}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ))}
    </div>
  );
}
