import React, { useState, useEffect } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getToken, getRoleKey } from "@/utils/auth";

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
  is_current_user: boolean;
  tables: CustomTable[];
}

// 可以建立自己表格的角色
const CAN_CREATE_ROLES = ["pm_user", "pm_leader", "super", "boss"];

// 取得指定日期所在週的週一
const getMondayOf = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// 格式化為 YYYY-MM-DD（給 API 用）
const toISODate = (d: Date) => d.toISOString().split("T")[0];

// 格式化為 YYYY/MM/DD（顯示用）
const formatDisplay = (d: Date) =>
  `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}`;

export default function PMWeeklyReport() {
  const roleKey = getRoleKey();

  // 以 Date 物件管理當前週的週一
  const [currentMonday, setCurrentMonday] = useState<Date>(() =>
    getMondayOf(new Date())
  );

  const [blocks, setBlocks] = useState<UserBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);

  // 週日（週一 + 6 天）
  const currentSunday = new Date(currentMonday);
  currentSunday.setDate(currentMonday.getDate() + 6);

  // 傳給 API 的字串
  const weekStart = toISODate(currentMonday);

  // 顯示用的週次範圍字串
  const weekRangeLabel = `${formatDisplay(currentMonday)} ~ ${formatDisplay(currentSunday)}`;

  const getRequestConfig = () => {
    const token = getToken();
    return {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  };

  const canCreate = CAN_CREATE_ROLES.includes(roleKey ?? "");

  const fetchWeeklyData = async (week: string) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/pm/tables/grouped?week_start=${week}`,
        getRequestConfig()
      );
      if (response.data && response.data.status === 0) {
        setBlocks(response.data.data);
      }
    } catch (error) {
      console.error("撈取資料失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyData(weekStart);
  }, [weekStart]);

  // 上一週
  const handlePrevWeek = () => {
    setCurrentMonday((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  // 下一週
  const handleNextWeek = () => {
    setCurrentMonday((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  // 回到本週
  const handleThisWeek = () => {
    setCurrentMonday(getMondayOf(new Date()));
  };

  const handleCreateNewTable = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const response = await axios.post(
        "/api/pm/tables",
        { week_start: weekStart, table_name: "未命名表格" },
        getRequestConfig()
      );
      if (response.data && response.data.status === 0) {
        fetchWeeklyData(weekStart);
      }
    } catch (error) {
      alert("建立表格失敗，請確認您的帳號權限（需要 pm_user 或以上角色）");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveTableToBackend = async (table: CustomTable) => {
    try {
      const response = await axios.patch(
        `/api/pm/tables/${table.id}`,
        { table_name: table.table_name, table_data: table.table_data },
        getRequestConfig()
      );
      if (response.data && response.data.status === 0) {
        fetchWeeklyData(weekStart);
      }
    } catch (error) {
      alert("儲存失敗，請確認您只能修改自己的表格");
    }
  };

  const handleDeleteTable = async (tableId: number) => {
    if (!window.confirm("確定要刪除這整張表格嗎？資料將從資料庫中永久抹除。"))
      return;
    try {
      const response = await axios.delete(
        `/api/pm/tables/${tableId}`,
        getRequestConfig()
      );
      if (response.data && response.data.status === 0) {
        fetchWeeklyData(weekStart);
      }
    } catch (error) {
      alert("刪除失敗");
    }
  };

  const handleUpdateTableNameInState = (
    userId: number,
    tableId: number,
    newName: string
  ) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.user_id === userId
          ? {
              ...b,
              tables: b.tables.map((t) =>
                t.id === tableId ? { ...t, table_name: newName } : t
              ),
            }
          : b
      )
    );
  };

  const handleUpdateTableDataInState = (
    userId: number,
    tableId: number,
    newData: TableData
  ) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.user_id === userId
          ? {
              ...b,
              tables: b.tables.map((t) =>
                t.id === tableId ? { ...t, table_data: newData } : t
              ),
            }
          : b
      )
    );
  };

  // 判斷是否為本週
  const isThisWeek =
    toISODate(currentMonday) === toISODate(getMondayOf(new Date()));

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">
      {/* 頁面標題列 */}
      <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">PM 週報工作表</h1>
          <p className="text-sm text-slate-400 mt-1">
            每位 PM 擁有獨立填寫區塊，僅能編輯自己的表格
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* 週次導覽 */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={handlePrevWeek}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white hover:shadow-sm transition text-slate-600"
              title="上一週"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 min-w-[220px] justify-center">
              <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                {weekRangeLabel}
              </span>
            </div>

            <button
              onClick={handleNextWeek}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white hover:shadow-sm transition text-slate-600"
              title="下一週"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 回到本週按鈕（非本週才顯示） */}
          {!isThisWeek && (
            <button
              onClick={handleThisWeek}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition"
            >
              回到本週
            </button>
          )}

          {canCreate && (
            <button
              onClick={handleCreateNewTable}
              disabled={creating}
              className="bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-60"
            >
              {creating ? "建立中..." : "➕ 為我新增表格"}
            </button>
          )}
        </div>
      </div>

      {/* 提示說明 */}
      {!canCreate && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          您目前的角色為唯讀模式，僅能查看週報內容，無法建立或編輯表格。
        </div>
      )}

      {/* 內容區 */}
      {loading ? (
        <div className="text-center py-10 text-slate-500">資料載入中...</div>
      ) : blocks.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-medium">本週尚無任何週報資料</p>
          {canCreate && (
            <p className="text-sm mt-2">點擊右上角「為我新增表格」開始填寫</p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {blocks.map((block) => (
            <div
              key={block.user_id}
              className={`bg-white rounded-2xl shadow-sm border p-6 space-y-6 ${
                block.is_current_user ? "border-blue-200" : "border-slate-200"
              }`}
            >
              {/* 區塊標題 */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-slate-700">
                    {block.user_name} 的週報面板
                  </h2>
                  {block.is_current_user && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">
                      您的畫布
                    </span>
                  )}
                  {!block.is_current_user && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
                      唯讀
                    </span>
                  )}
                </div>
                {block.is_current_user && canCreate && (
                  <button
                    onClick={handleCreateNewTable}
                    disabled={creating}
                    className="bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-60"
                  >
                    ➕ 建立自訂新表格
                  </button>
                )}
              </div>

              {/* 表格列表 */}
              {block.tables && block.tables.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">
                  {block.is_current_user
                    ? "此區塊目前尚未建立任何表格，請點擊上方按鈕新增。"
                    : "此人本週尚未填寫任何週報。"}
                </p>
              ) : (
                block.tables?.map((table) => {
                  const { headers, rows } = table.table_data || {
                    headers: [],
                    rows: [],
                  };
                  const isEditable = block.is_current_user;

                  return (
                    <div
                      key={table.id}
                      className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-4"
                    >
                      {/* 表格標題列 */}
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <input
                          type="text"
                          className={`text-md font-semibold border-b pb-0.5 focus:outline-none focus:border-blue-500 text-slate-700 ${
                            !isEditable
                              ? "bg-transparent border-none cursor-default"
                              : ""
                          }`}
                          value={table.table_name}
                          onChange={(e) =>
                            handleUpdateTableNameInState(
                              block.user_id,
                              table.id,
                              e.target.value
                            )
                          }
                          disabled={!isEditable}
                          readOnly={!isEditable}
                        />

                        {isEditable && (
                          <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                            <button
                              onClick={() => {
                                const newCol = `欄位 ${headers.length + 1}`;
                                handleUpdateTableDataInState(
                                  block.user_id,
                                  table.id,
                                  {
                                    headers: [...headers, newCol],
                                    rows: rows.map((r) => ({
                                      ...r,
                                      [newCol]: "",
                                    })),
                                  }
                                );
                              }}
                              className="text-xs bg-slate-50 hover:bg-slate-100 border text-slate-600 px-2 py-1.5 rounded-lg"
                            >
                              ➕ 新增欄位
                            </button>
                            <button
                              onClick={() => {
                                handleUpdateTableDataInState(
                                  block.user_id,
                                  table.id,
                                  {
                                    headers,
                                    rows: [
                                      ...rows,
                                      headers.reduce(
                                        (acc, h) => ({ ...acc, [h]: "" }),
                                        {}
                                      ),
                                    ],
                                  }
                                );
                              }}
                              className="text-xs bg-slate-50 hover:bg-slate-100 border text-slate-600 px-2 py-1.5 rounded-lg"
                            >
                              ➕ 新增資料列
                            </button>
                            <button
                              onClick={() => handleSaveTableToBackend(table)}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg font-medium shadow-xs"
                            >
                              💾 儲存此表
                            </button>
                            <button
                              onClick={() => handleDeleteTable(table.id)}
                              className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1.5 rounded-lg"
                            >
                              🗑️ 刪除
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 表格內容 */}
                      <div className="overflow-x-auto border border-slate-100 rounded-lg">
                        <table className="w-full border-collapse text-left text-sm text-slate-600">
                          <thead className="bg-slate-50 text-slate-700">
                            <tr>
                              {headers.map((header, hIndex) => (
                                <th
                                  key={hIndex}
                                  className="border border-slate-200 p-2.5 min-w-[140px]"
                                >
                                  {isEditable ? (
                                    <input
                                      type="text"
                                      className="w-full bg-transparent border-none font-bold text-slate-700 text-center focus:bg-white focus:outline-none"
                                      value={header}
                                      onChange={(e) => {
                                        const nextValue = e.target.value;
                                        const updatedHeaders = [...headers];
                                        updatedHeaders[hIndex] = nextValue;
                                        const updatedRows = rows.map((r) => {
                                          const nr = { ...r };
                                          nr[nextValue] = nr[header];
                                          delete nr[header];
                                          return nr;
                                        });
                                        handleUpdateTableDataInState(
                                          block.user_id,
                                          table.id,
                                          {
                                            headers: updatedHeaders,
                                            rows: updatedRows,
                                          }
                                        );
                                      }}
                                    />
                                  ) : (
                                    <span className="block text-center font-bold">
                                      {header}
                                    </span>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={headers.length}
                                  className="text-center p-4 text-slate-400"
                                >
                                  無資料，請點擊上方新增資料列
                                </td>
                              </tr>
                            ) : (
                              rows.map((row, rIndex) => (
                                <tr
                                  key={rIndex}
                                  className="hover:bg-slate-50/50"
                                >
                                  {headers.map((header, cIndex) => (
                                    <td
                                      key={cIndex}
                                      className="border border-slate-200 p-1"
                                    >
                                      {isEditable ? (
                                        <input
                                          type="text"
                                          className="w-full p-1.5 border-none bg-transparent text-slate-600 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:rounded focus:outline-none"
                                          value={row[header] || ""}
                                          onChange={(e) => {
                                            const updatedRows = [...rows];
                                            updatedRows[rIndex] = {
                                              ...updatedRows[rIndex],
                                              [header]: e.target.value,
                                            };
                                            handleUpdateTableDataInState(
                                              block.user_id,
                                              table.id,
                                              {
                                                headers,
                                                rows: updatedRows,
                                              }
                                            );
                                          }}
                                        />
                                      ) : (
                                        <span className="p-1.5 block min-h-[32px] whitespace-pre-wrap text-slate-700">
                                          {row[header] || ""}
                                        </span>
                                      )}
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
      )}
    </div>
  );
}
