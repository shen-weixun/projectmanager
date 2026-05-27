import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight, Download, Upload } from "lucide-react";
import AutoSaveIndicator from "@/components/AutoSaveIndicator";
import WorkReportOptionSelect from "@/components/work-report/WorkReportOptionSelect";
import WorkReportOptionsEditorPanel from "@/components/work-report/WorkReportOptionsEditorPanel";
import WorkReportOptionPill from "@/components/work-report/WorkReportOptionPill";
import { useAutoSaveTable } from "@/hooks/useAutoSaveTable";
import { getToken, WORK_REPORT_MANAGER_ROLES, getRoleKey } from "@/utils/auth";
import {
  formatLocalISODate,
  isViewingCurrentWorkWeek,
} from "@/utils/localDate";
import {
  normalizeOptionsByHeader,
  serializeOptionsForApi,
  type OptionsByHeader,
  type WorkReportOptionItem,
} from "@/utils/workReportOptions";
import WorkReportReadOnlyTables from "@/components/work-report/WorkReportReadOnlyTables";

interface TableData {
  headers: string[];
  rows: Record<string, string>[];
}

interface CustomTable {
  id: number;
  table_name: string;
  table_data: TableData;
  read_only?: boolean;
}

interface UserBlock {
  user_id: number;
  user_name: string;
  is_current_user: boolean;
  tables: CustomTable[];
}

interface UserAccount {
  id: number;
  account: string;
}

type ReportType = "daily" | "weekly";

interface WorkReportPageProps {
  reportType: ReportType;
  apiBase: string;
  title: string;
  subtitle: string;
}

const getMondayOf = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getFridayOf = (monday: Date): Date => {
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(0, 0, 0, 0);
  return friday;
};

const formatDisplay = (d: Date) =>
  `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}`;

export default function WorkReportPage({
  reportType,
  apiBase,
  title,
  subtitle,
}: WorkReportPageProps) {
  const roleKey = getRoleKey();
  const isManager = WORK_REPORT_MANAGER_ROLES.includes(
    (roleKey ?? "") as (typeof WORK_REPORT_MANAGER_ROLES)[number]
  );
  const effectiveRole = useMemo(() => {
    if (isManager) return "rd";
    if ((roleKey ?? "").startsWith("pm")) return "pm";
    return "rd";
  }, [isManager, roleKey]);

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return reportType === "weekly" ? getMondayOf(today) : today;
  });

  const [blocks, setBlocks] = useState<UserBlock[]>([]);
  const [schemaHeaders, setSchemaHeaders] = useState<string[]>([]);
  const [schemaDraft, setSchemaDraft] = useState<string[]>([]);
  const [optionsByHeader, setOptionsByHeader] = useState<OptionsByHeader>({});
  const [manageOptionsPm, setManageOptionsPm] = useState<OptionsByHeader>({});
  const [manageOptionsRd, setManageOptionsRd] = useState<OptionsByHeader>({});
  const [showOptionsEditor, setShowOptionsEditor] = useState(false);
  const [savingOptions, setSavingOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingSchema, setSavingSchema] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [importingXlsx, setImportingXlsx] = useState(false);
  const [prevWeekBlocks, setPrevWeekBlocks] = useState<UserBlock[]>([]);
  const [prevWeekLoading, setPrevWeekLoading] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const periodKey = formatLocalISODate(currentDate);

  const prevWeekMonday = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    return d;
  }, [currentDate]);

  const prevWeekKey = formatLocalISODate(prevWeekMonday);

  const prevWeekLabel = `${formatDisplay(prevWeekMonday)} ~ ${formatDisplay(
    getFridayOf(prevWeekMonday)
  )}`;

  const periodQueryParam =
    reportType === "daily" ? "record_date" : "week_start";

  const periodLabel =
    reportType === "daily"
      ? formatDisplay(currentDate)
      : `${formatDisplay(currentDate)} ~ ${formatDisplay(getFridayOf(currentDate))}`;

  const isCurrentPeriod =
    reportType === "daily"
      ? formatLocalISODate(currentDate) === formatLocalISODate(new Date())
      : isViewingCurrentWorkWeek(currentDate);

  const getRequestConfig = useCallback(() => {
    const token = getToken();
    return {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [response, usersResponse, schemaResponse, optionsResponse] =
        await Promise.all([
        axios.get(
          `${apiBase}/tables/grouped?${periodQueryParam}=${periodKey}`,
          getRequestConfig()
        ),
        axios.get("/api/users/list", getRequestConfig()),
        axios.get(`/api/work-report/schema/${reportType}`, getRequestConfig()),
        axios.get(`/api/work-report/options/${reportType}`, getRequestConfig()),
      ]);

      if (schemaResponse.data?.status === 0) {
        const headers = schemaResponse.data.data.headers as string[];
        setSchemaHeaders(headers);
        setSchemaDraft(headers);
      }

      if (optionsResponse.data?.status === 0) {
        setOptionsByHeader(
          normalizeOptionsByHeader(optionsResponse.data.data?.options_by_header)
        );
      } else {
        setOptionsByHeader({});
      }

      if (response.data?.status === 0) {
        const accountById = new Map<number, string>(
          usersResponse.data?.status === 0
            ? usersResponse.data.data.map((user: UserAccount) => [
                user.id,
                user.account,
              ])
            : []
        );
        const apiHeaders = (response.data.schema_headers as string[]) || [];
        if (apiHeaders.length > 0) {
          setSchemaHeaders(apiHeaders);
          setSchemaDraft(apiHeaders);
        }

        const viewingCurrentWeek =
          reportType === "weekly" && isViewingCurrentWorkWeek(currentDate);
        setBlocks(
          response.data.data.map((block: UserBlock) => ({
            ...block,
            user_name: accountById.get(block.user_id) || block.user_name,
            tables: block.tables.map((table) => ({
              ...table,
              read_only: viewingCurrentWeek ? false : table.read_only,
            })),
          }))
        );
      }
    } catch (error) {
      console.error("撈取工作紀錄失敗:", error);
    } finally {
      setLoading(false);
    }
  }, [apiBase, currentDate, getRequestConfig, periodKey, periodQueryParam, reportType]);

  const fetchManageOptions = useCallback(async () => {
    if (!isManager) return;
    try {
      const res = await axios.get(
        `/api/work-report/options/manage/${reportType}`,
        getRequestConfig()
      );
      if (res.data?.status === 0) {
        setManageOptionsPm(normalizeOptionsByHeader(res.data.data?.pm));
        setManageOptionsRd(normalizeOptionsByHeader(res.data.data?.rd));
      }
    } catch {
      // ignore
    }
  }, [getRequestConfig, isManager, reportType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchPreviousWeek = useCallback(async () => {
    if (reportType !== "weekly" || !isCurrentPeriod) {
      setPrevWeekBlocks([]);
      return;
    }
    setPrevWeekLoading(true);
    try {
      const [response, usersResponse] = await Promise.all([
        axios.get(
          `${apiBase}/tables/grouped?week_start=${prevWeekKey}`,
          getRequestConfig()
        ),
        axios.get("/api/users/list", getRequestConfig()),
      ]);
      if (response.data?.status === 0) {
        const accountById = new Map<number, string>(
          usersResponse.data?.status === 0
            ? usersResponse.data.data.map((user: UserAccount) => [
                user.id,
                user.account,
              ])
            : []
        );
        const data = response.data.data.map((block: UserBlock) => ({
          ...block,
          user_name: accountById.get(block.user_id) || block.user_name,
        }));
        setPrevWeekBlocks(data);
      } else {
        setPrevWeekBlocks([]);
      }
    } catch {
      setPrevWeekBlocks([]);
    } finally {
      setPrevWeekLoading(false);
    }
  }, [
    apiBase,
    getRequestConfig,
    isCurrentPeriod,
    prevWeekKey,
    reportType,
  ]);

  useEffect(() => {
    fetchPreviousWeek();
  }, [fetchPreviousWeek]);

  useEffect(() => {
    if (!isManager || !showOptionsEditor) return;
    fetchManageOptions();
  }, [fetchManageOptions, isManager, showOptionsEditor]);

  const setManageOptionsForRole = (
    role: "pm" | "rd",
    header: string,
    options: WorkReportOptionItem[]
  ) => {
    if (role === "pm") {
      setManageOptionsPm((prev) => ({ ...prev, [header]: options }));
    } else {
      setManageOptionsRd((prev) => ({ ...prev, [header]: options }));
    }
  };

  const handleSaveOptions = async () => {
    if (!isManager) return;
    setSavingOptions(true);
    try {
      const [pmRes, rdRes] = await Promise.all([
        axios.put(
          `/api/work-report/options/${reportType}/pm`,
          { options_by_header: serializeOptionsForApi(manageOptionsPm) },
          getRequestConfig()
        ),
        axios.put(
          `/api/work-report/options/${reportType}/rd`,
          { options_by_header: serializeOptionsForApi(manageOptionsRd) },
          getRequestConfig()
        ),
      ]);
      if (pmRes.data?.status === 0 && rdRes.data?.status === 0) {
        setOptionsByHeader(
          effectiveRole === "rd" ? manageOptionsRd : manageOptionsPm
        );
        setShowOptionsEditor(false);
      } else {
        alert("儲存選項失敗，請稍後再試");
      }
    } catch {
      alert("儲存選項失敗，請稍後再試");
    } finally {
      setSavingOptions(false);
    }
  };

  const shiftPeriod = (delta: number) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + (reportType === "daily" ? delta : delta * 7));
      return d;
    });
  };

  const goToCurrentPeriod = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentDate(reportType === "weekly" ? getMondayOf(today) : today);
  };

  const createPayload = () =>
    reportType === "daily"
      ? { record_date: periodKey, table_name: "未命名表格" }
      : { week_start: periodKey, table_name: "未命名表格" };

  const handleCreateNewTable = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const response = await axios.post(
        `${apiBase}/tables`,
        createPayload(),
        getRequestConfig()
      );
      if (response.data?.status === 0) {
        fetchData();
      }
    } catch {
      alert("建立表格失敗，請稍後再試");
    } finally {
      setCreating(false);
    }
  };

  const saveTableToBackend = useCallback(
    async (table: CustomTable) => {
      const headers =
        schemaHeaders.length > 0
          ? schemaHeaders
          : table.table_data?.headers ?? [];
      const response = await axios.patch(
          `${apiBase}/tables/${table.id}`,
          {
            table_name: table.table_name,
            table_data: { ...table.table_data, headers },
          },
          {
            ...getRequestConfig(),
            params:
              reportType === "weekly"
                ? { view_week_start: periodKey }
                : undefined,
          }
      );
      if (response.data?.status === 0) return true;
      throw new Error(
          response.data?.message || "儲存失敗，請確認後端服務與資料庫 migration"
      );
    },
    [apiBase, getRequestConfig, periodKey, reportType, schemaHeaders]
  );

  const {
    scheduleSave,
    cancelSave,
    clearAllTableStates,
    statusByTableId,
    errorByTableId,
  } = useAutoSaveTable(saveTableToBackend);

  useEffect(() => {
    if (reportType === "weekly" && isCurrentPeriod) {
      clearAllTableStates();
    }
  }, [clearAllTableStates, isCurrentPeriod, periodKey, reportType]);

  const handleDeleteTable = async (tableId: number) => {
    cancelSave(tableId);
    if (!window.confirm("確定要刪除這整張表格嗎？")) return;
    try {
      const response = await axios.delete(`${apiBase}/tables/${tableId}`, {
        ...getRequestConfig(),
        params:
          reportType === "weekly" ? { view_week_start: periodKey } : undefined,
      });
      if (response.data?.status === 0) {
        fetchData();
      }
    } catch {
      alert("刪除失敗");
    }
  };

  const handleSaveSchema = async () => {
    const cleaned = schemaDraft.map((h) => h.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      alert("至少需要一個欄位");
      return;
    }
    setSavingSchema(true);
    try {
      const response = await axios.put(
        `/api/work-report/schema/${reportType}`,
        { headers: cleaned },
        getRequestConfig()
      );
      if (response.data?.status === 0) {
        setSchemaHeaders(cleaned);
        fetchData();
      }
    } catch {
      alert("欄位設定儲存失敗");
    } finally {
      setSavingSchema(false);
    }
  };

  const updateTableName = (userId: number, tableId: number, newName: string) => {
    setBlocks((prev) => {
      const next = prev.map((b) =>
        b.user_id === userId
          ? {
              ...b,
              tables: b.tables.map((t) =>
                t.id === tableId ? { ...t, table_name: newName } : t
              ),
            }
          : b
      );
      const block = next.find((b) => b.user_id === userId);
      const table = block?.tables.find((t) => t.id === tableId);
      if (
        block?.is_current_user &&
        table &&
        (reportType === "daily" ||
          isCurrentPeriod ||
          !table.read_only)
      )
        scheduleSave(table);
      return next;
    });
  };

  const updateTableData = (
    userId: number,
    tableId: number,
    newData: TableData
  ) => {
    setBlocks((prev) => {
      const next = prev.map((b) =>
        b.user_id === userId
          ? {
              ...b,
              tables: b.tables.map((t) =>
                t.id === tableId ? { ...t, table_data: newData } : t
              ),
            }
          : b
      );
      const block = next.find((b) => b.user_id === userId);
      const table = block?.tables.find((t) => t.id === tableId);
      if (
        block?.is_current_user &&
        table &&
        (reportType === "daily" ||
          isCurrentPeriod ||
          !table.read_only)
      )
        scheduleSave(table);
      return next;
    });
  };

  const addSchemaColumn = () => {
    setSchemaDraft((prev) => [...prev, `欄位 ${prev.length + 1}`]);
  };

  const visibleBlocks = isManager
    ? blocks
    : blocks.filter((b) => b.is_current_user);

  const visiblePrevWeekBlocks = isManager
    ? prevWeekBlocks
    : prevWeekBlocks.filter((b) => b.is_current_user);

  const canExportXlsx = useMemo(() => {
    if (loading) return false;
    return visibleBlocks.some((b) => b.tables.length > 0);
  }, [loading, visibleBlocks]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve(result.includes(",") ? result.split(",")[1] : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;
      if (typeof detail?.message === "string") return detail.message;
      if (typeof error.response?.data?.message === "string") {
        return error.response.data.message;
      }
    }
    return fallback;
  };

  const handleExportXlsx = useCallback(async () => {
    if (!canExportXlsx || exportingXlsx) return;
    setExportingXlsx(true);
    try {
      const response = await axios.get(`${apiBase}/tables/export-xlsx`, {
        ...getRequestConfig(),
        params: { [periodQueryParam]: periodKey },
        responseType: "blob",
      });
      const prefix =
        reportType === "weekly" ? "weekly-work-record" : "daily-work-record";
      downloadBlob(response.data, `${prefix}-${periodKey}.xlsx`);
    } catch (error) {
      alert(getErrorMessage(error, "匯出 XLSX 失敗，請稍後再試"));
    } finally {
      setExportingXlsx(false);
    }
  }, [
    apiBase,
    canExportXlsx,
    exportingXlsx,
    getRequestConfig,
    periodKey,
    periodQueryParam,
    reportType,
  ]);

  const handleImportXlsx = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || importingXlsx) return;
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        alert("請選擇 .xlsx 檔案");
        return;
      }

      setImportingXlsx(true);
      try {
        const contentBase64 = await fileToBase64(file);
        const response = await axios.post(
          `${apiBase}/tables/import-xlsx`,
          { filename: file.name, contentBase64 },
          {
            ...getRequestConfig(),
            params: { [periodQueryParam]: periodKey },
          }
        );
        if (response.data?.status === 0) {
          const createdCount = response.data.data?.createdCount ?? 0;
          alert(`匯入成功：新增 ${createdCount} 張表格`);
          fetchData();
        }
      } catch (error) {
        alert(getErrorMessage(error, "匯入 XLSX 失敗，請確認欄位格式後再試"));
      } finally {
        setImportingXlsx(false);
      }
    },
    [
      apiBase,
      fetchData,
      getRequestConfig,
      importingXlsx,
      periodKey,
      periodQueryParam,
    ]
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">
      <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => shiftPeriod(-1)}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white hover:shadow-sm transition text-slate-600"
              title={reportType === "daily" ? "前一天" : "上一週（週一～週五）"}
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 min-w-[180px] justify-center">
              <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                {periodLabel}
              </span>
            </div>
            <button
              onClick={() => shiftPeriod(1)}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white hover:shadow-sm transition text-slate-600"
              title={reportType === "daily" ? "後一天" : "下一週（週一～週五）"}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {!isCurrentPeriod && (
            <button
              onClick={goToCurrentPeriod}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition"
            >
              {reportType === "daily" ? "回到今天" : "回到本週（週一～週五）"}
            </button>
          )}

          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={importingXlsx}
            title="將 XLSX 匯入目前日期或週次，並建立新的工作紀錄表格"
            className="inline-flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 px-4 py-2 text-sm font-medium rounded-xl hover:bg-slate-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={16} aria-hidden />
            {importingXlsx ? "匯入中..." : "匯入 XLSX"}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleImportXlsx}
          />

          <button
            type="button"
            onClick={handleExportXlsx}
            disabled={!canExportXlsx || exportingXlsx}
            title="匯出目前日期或週次、畫面上可見的所有表格為 XLSX"
            className="inline-flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 px-4 py-2 text-sm font-medium rounded-xl hover:bg-slate-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} aria-hidden />
            {exportingXlsx ? "匯出中..." : "匯出 XLSX"}
          </button>

          <button
            onClick={handleCreateNewTable}
            disabled={creating}
            className="bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-60"
          >
            {creating ? "建立中..." : "➕ 為我新增表格"}
          </button>
        </div>
      </div>

      {isManager && (
        <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-amber-800">
                管理者：欄位設定（全站共用）
              </h2>
              <p className="text-xs text-slate-500">
                一般使用者無法新增或修改欄位，僅能填寫資料列。目前欄位：
                {schemaHeaders.length > 0 ? schemaHeaders.join("、") : "（尚未設定）"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOptionsEditor((v) => !v)}
              className="text-xs font-bold border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
            >
              {showOptionsEditor ? "收合彩色下拉設定" : "彩色下拉選項設定（PM / RD）"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {schemaDraft.map((header, index) => (
              <input
                key={index}
                type="text"
                value={header}
                onChange={(e) => {
                  const next = [...schemaDraft];
                  next[index] = e.target.value;
                  setSchemaDraft(next);
                }}
                className="border border-slate-200 rounded-lg px-2 py-1 text-sm min-w-[120px]"
              />
            ))}
            <button
              type="button"
              onClick={addSchemaColumn}
              className="text-xs border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-50"
            >
              ➕ 新增欄位
            </button>
          </div>
          <button
            onClick={handleSaveSchema}
            disabled={savingSchema}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-60"
          >
            {savingSchema ? "儲存中..." : "💾 儲存欄位設定"}
          </button>

          {showOptionsEditor && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    彩色下拉式選單（類似項目狀態）
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    為每個欄位建立 PM / RD 專用選項與標籤顏色；管理者填寫時使用 RD
                    選項。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveOptions}
                  disabled={savingOptions}
                  className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg disabled:opacity-60"
                >
                  {savingOptions ? "儲存中..." : "💾 儲存全部下拉選項"}
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {(schemaHeaders.length > 0 ? schemaHeaders : schemaDraft).map(
                  (header) => (
                    <div key={header} className="space-y-3">
                      <WorkReportOptionsEditorPanel
                        header={header}
                        roleLabel="PM"
                        options={manageOptionsPm[header] ?? []}
                        onChange={(options) =>
                          setManageOptionsForRole("pm", header, options)
                        }
                      />
                      <WorkReportOptionsEditorPanel
                        header={header}
                        roleLabel="RD（管理者填寫）"
                        options={manageOptionsRd[header] ?? []}
                        onChange={(options) =>
                          setManageOptionsForRole("rd", header, options)
                        }
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-500">資料載入中...</div>
      ) : visibleBlocks.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-medium">目前尚無工作紀錄</p>
          <p className="text-sm mt-2">點擊右上角「為我新增表格」開始填寫</p>
        </div>
      ) : (
        <div className="space-y-8">
          {visibleBlocks.map((block) => (
            <div
              key={block.user_id}
              className={`bg-white rounded-2xl shadow-sm border p-6 space-y-6 ${
                block.is_current_user ? "border-blue-200" : "border-slate-200"
              }`}
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-slate-700">
                    {block.user_name} 的工作紀錄
                  </h2>
                  {!block.is_current_user && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
                      唯讀
                    </span>
                  )}
                </div>
                {block.is_current_user && (
                  <button
                    onClick={handleCreateNewTable}
                    disabled={creating}
                    className="bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-60"
                  >
                    ➕ 建立新表格
                  </button>
                )}
              </div>

              {block.tables.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">
                  {block.is_current_user
                    ? "尚未建立任何表格。"
                    : "此人尚未填寫工作紀錄。"}
                </p>
              ) : (
                block.tables.map((table) => {
                  const headers =
                    schemaHeaders.length > 0
                      ? schemaHeaders
                      : table.table_data?.headers ?? [];
                  const rows = table.table_data?.rows ?? [];
                  const tableReadOnly =
                    reportType === "weekly" &&
                    Boolean(table.read_only) &&
                    !isCurrentPeriod;
                  const isEditable =
                    block.is_current_user &&
                    (reportType !== "weekly" ||
                      isCurrentPeriod ||
                      !table.read_only);

                  return (
                    <div
                      key={table.id}
                      className="border border-slate-200 rounded-xl p-4 bg-white space-y-4"
                    >
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {tableReadOnly && block.is_current_user && (
                            <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                              已鎖定 · 僅供查閱
                            </span>
                          )}
                          <input
                            type="text"
                            className={`text-md font-semibold border-b pb-0.5 focus:outline-none focus:border-blue-500 text-slate-700 ${
                              !isEditable
                                ? "bg-transparent border-none cursor-default"
                                : ""
                            }`}
                            value={table.table_name}
                            onChange={(e) =>
                              updateTableName(
                                block.user_id,
                                table.id,
                                e.target.value
                              )
                            }
                            disabled={!isEditable}
                            readOnly={!isEditable}
                          />
                          {isEditable && (
                            <AutoSaveIndicator
                              status={statusByTableId[table.id]}
                              errorMessage={
                                isCurrentPeriod &&
                                errorByTableId[table.id]?.includes("鎖定")
                                  ? null
                                  : errorByTableId[table.id]
                              }
                            />
                          )}
                        </div>

                        {isEditable && (
                          <div className="flex items-center flex-wrap gap-1">
                            <button
                              onClick={() =>
                                updateTableData(block.user_id, table.id, {
                                  headers,
                                  rows: [
                                    ...rows,
                                    headers.reduce(
                                      (acc, h) => ({ ...acc, [h]: "" }),
                                      {}
                                    ),
                                  ],
                                })
                              }
                              className="text-sm font-medium bg-slate-50 hover:bg-slate-100 border text-slate-600 px-3 py-2 rounded-lg"
                            >
                              ➕ 新增資料列
                            </button>
                            <button
                              onClick={() => handleDeleteTable(table.id)}
                              className="text-sm font-medium bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg"
                            >
                              🗑️ 刪除
                            </button>
                          </div>
                        )}
                      </div>

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
                                      {optionsByHeader[header]?.length ? (
                                        <WorkReportOptionSelect
                                          options={optionsByHeader[header]}
                                          value={row[header] || ""}
                                          disabled={!isEditable}
                                          onChange={(nextValue) => {
                                            const updatedRows = [...rows];
                                            updatedRows[rIndex] = {
                                              ...updatedRows[rIndex],
                                              [header]: nextValue,
                                            };
                                            updateTableData(block.user_id, table.id, {
                                              headers,
                                              rows: updatedRows,
                                            });
                                          }}
                                        />
                                      ) : isEditable ? (
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
                                            updateTableData(block.user_id, table.id, {
                                              headers,
                                              rows: updatedRows,
                                            });
                                          }}
                                        />
                                      ) : (
                                        <span className="p-1.5 block min-h-[32px] whitespace-pre-wrap text-slate-700">
                                          {row[header] ? (
                                            <WorkReportOptionPill label={row[header]} />
                                          ) : (
                                            "—"
                                          )}
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

      {reportType === "weekly" && isCurrentPeriod && (
        <section className="mt-10 pt-8 border-t-2 border-dashed border-slate-200">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-700">
              前一週工作紀錄
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {prevWeekLabel} · 僅供參考查閱，無法在此區塊編輯
            </p>
          </div>
          {prevWeekLoading ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              前一週資料載入中…
            </div>
          ) : (
            <WorkReportReadOnlyTables
              blocks={visiblePrevWeekBlocks}
              schemaHeaders={schemaHeaders}
              optionsByHeader={optionsByHeader}
              emptyMessage="前一週尚無任何工作紀錄"
            />
          )}
        </section>
      )}
    </div>
  );
}
