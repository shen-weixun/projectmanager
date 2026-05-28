import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";






import axios from "axios";






import {






  ChevronLeft,






  ChevronRight,






  Download,






  Edit3,






  GripVertical,






  Plus,






  Trash2,






  Upload,






  X,






} from "lucide-react";






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
  normalizeOptionsList,
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






type WorkReportFieldType = "text" | "select" | "date" | "textarea";













const WORK_REPORT_FIELD_TYPE_LABELS: Record<WorkReportFieldType, string> = {






  text: "文字",






  select: "下拉選單",






  date: "日期",






  textarea: "長文字",






};













const WORK_REPORT_FIELD_TYPE_OPTIONS = Object.entries(






  WORK_REPORT_FIELD_TYPE_LABELS






) as [WorkReportFieldType, string][];













const normalizeWorkReportFieldType = (value: unknown): WorkReportFieldType => {






  return value === "select" || value === "date" || value === "textarea"






    ? value






    : "text";






};













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
  const canEditOwnReports = !isManager;
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






  const [schemaFieldDraft, setSchemaFieldDraft] = useState("");






  const [schemaFieldTypeDraft, setSchemaFieldTypeDraft] =






    useState<WorkReportFieldType>("text");






  const [schemaFieldTypes, setSchemaFieldTypes] = useState<Record<string, WorkReportFieldType>>({});






  const [schemaFieldTypesDraft, setSchemaFieldTypesDraft] = useState<Record<string, WorkReportFieldType>>({});






  const [editingSchemaIndex, setEditingSchemaIndex] = useState<number | null>(null);






  const [draggingSchemaIndex, setDraggingSchemaIndex] = useState<number | null>(null);






  const [optionsByHeader, setOptionsByHeader] = useState<OptionsByHeader>({});






  const [manageOptionsPm, setManageOptionsPm] = useState<OptionsByHeader>({});
  const [manageOptionsRd, setManageOptionsRd] = useState<OptionsByHeader>({});
  const [schemaFieldOptionsDraft, setSchemaFieldOptionsDraft] = useState<WorkReportOptionItem[]>([]);






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






        const fieldTypes = Object.fromEntries(






          headers.map((header) => [






            header,






            normalizeWorkReportFieldType(






              schemaResponse.data.data.field_types?.[header]






            ),






          ])






        );






        setSchemaHeaders(headers);






        setSchemaDraft(headers);






        setSchemaFieldTypes(fieldTypes);






        setSchemaFieldTypesDraft(fieldTypes);






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






      console.error("載入工作紀錄失敗", error);






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
    if (!isManager) return;
    fetchManageOptions();
  }, [fetchManageOptions, isManager]);













  const saveOptionsForRole = async (
    role: "pm" | "rd",
    nextOptionsByHeader: OptionsByHeader
  ) => {
    if (!isManager) return;
    try {
      const response = await axios.put(
        `/api/work-report/options/${reportType}/${role}`,
        { options_by_header: serializeOptionsForApi(nextOptionsByHeader) },
        getRequestConfig()
      );
      if (response.data?.status === 0 && role === effectiveRole) {
        setOptionsByHeader(nextOptionsByHeader);
      }
    } catch {
      alert("儲存失敗，請稍後再試");
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






      ? { record_date: periodKey, table_name: "工作紀錄" }






      : { week_start: periodKey, table_name: "工作紀錄" };













  const handleCreateNewTable = async () => {
    if (!canEditOwnReports || creating) return;
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






      alert("請輸入欄位型態");






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






          response.data?.message || "欄位設定儲存失敗，請確認後端 API 與資料庫狀態"






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
    if (!canEditOwnReports) return;
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






      alert("已刪除");






    }






  };













  const persistSchema = async (






    nextDraft = schemaDraft,






    nextTypes = schemaFieldTypesDraft






  ) => {






    const cleaned = nextDraft.map((h) => h.trim()).filter(Boolean);






    if (cleaned.length === 0) {






      alert("至少需要一個欄位");






      return;






    }






    setSavingSchema(true);






    try {






      const response = await axios.put(






        `/api/work-report/schema/${reportType}`,






        {






          headers: cleaned,






          field_types: Object.fromEntries(






            cleaned.map((header) => [






              header,






              normalizeWorkReportFieldType(nextTypes[header]),






            ])






          ),






        },






        getRequestConfig()






      );






      if (response.data?.status === 0) {






        setSchemaHeaders(cleaned);






        const fieldTypes = Object.fromEntries(






          cleaned.map((header) => [






            header,






            normalizeWorkReportFieldType(






              response.data.data?.field_types?.[header] ??






                nextTypes[header]






            ),






          ])






        );






        setSchemaFieldTypes(fieldTypes);






        setSchemaFieldTypesDraft(fieldTypes);






        fetchData();






      }






    } catch {






      alert("請輸入欄位名稱");






    } finally {






      setSavingSchema(false);






    }






  };













  const resetSchemaFieldDraft = () => {
    setSchemaFieldDraft("");
    setSchemaFieldTypeDraft("text");
    setSchemaFieldOptionsDraft([]);
    setEditingSchemaIndex(null);
  };

  const submitSchemaField = () => {
    const nextHeader = schemaFieldDraft.trim();
    if (!nextHeader) {
      alert("請輸入欄位名稱");
      return;
    }
    const nextDraft =
      editingSchemaIndex === null
        ? [...schemaDraft, nextHeader]
        : schemaDraft.map((header, index) =>
            index === editingSchemaIndex ? nextHeader : header
          );
    const nextTypes = { ...schemaFieldTypesDraft };
    const oldHeader = editingSchemaIndex !== null ? schemaDraft[editingSchemaIndex] : "";
    if (oldHeader && oldHeader !== nextHeader) delete nextTypes[oldHeader];
    nextTypes[nextHeader] = schemaFieldTypeDraft;

    setSchemaDraft(nextDraft);
    setSchemaFieldTypesDraft(nextTypes);

    if (isManager) {
      const nextOptions = normalizeOptionsList(schemaFieldOptionsDraft);
      const nextRoleOptions = {
        ...(effectiveRole === "rd" ? manageOptionsRd : manageOptionsPm),
      };
      if (oldHeader && oldHeader !== nextHeader) delete nextRoleOptions[oldHeader];
      if (schemaFieldTypeDraft === "select") {
        nextRoleOptions[nextHeader] = nextOptions;
      } else {
        delete nextRoleOptions[nextHeader];
      }

      if (effectiveRole === "rd") {
        setManageOptionsRd(nextRoleOptions);
        void saveOptionsForRole("rd", nextRoleOptions);
      } else {
        setManageOptionsPm(nextRoleOptions);
        void saveOptionsForRole("pm", nextRoleOptions);
      }
    }

    resetSchemaFieldDraft();
    void persistSchema(nextDraft, nextTypes);
  };

  const editSchemaField = (index: number) => {
    const header = schemaDraft[index] ?? "";
    const fieldType = normalizeWorkReportFieldType(schemaFieldTypesDraft[header]);
    const editableOptionsSource = isManager
      ? effectiveRole === "rd"
        ? manageOptionsRd
        : manageOptionsPm
      : optionsByHeader;

    setSchemaFieldDraft(header);
    setSchemaFieldTypeDraft(fieldType);
    setSchemaFieldOptionsDraft(
      fieldType === "select" ? editableOptionsSource[header] ?? [] : []
    );
    setEditingSchemaIndex(index);
  };

  const removeSchemaField = (index: number) => {






    const removedHeader = schemaDraft[index];






    const nextDraft = schemaDraft.filter((_, itemIndex) => itemIndex !== index);






    const nextTypes = { ...schemaFieldTypesDraft };






    if (removedHeader) delete nextTypes[removedHeader];






    setSchemaDraft(nextDraft);






    setSchemaFieldTypesDraft(nextTypes);






    if (editingSchemaIndex === index) resetSchemaFieldDraft();






    else if (editingSchemaIndex !== null && editingSchemaIndex > index) {






      setEditingSchemaIndex(editingSchemaIndex - 1);






    }






    persistSchema(nextDraft, nextTypes);






  };













  const handleSchemaDragStart = (






    event: React.DragEvent<HTMLDivElement>,






    index: number






  ) => {






    setDraggingSchemaIndex(index);






    event.dataTransfer.effectAllowed = "move";






    event.dataTransfer.setData("text/plain", String(index));






  };













  const handleSchemaDragOver = (event: React.DragEvent<HTMLDivElement>) => {






    event.preventDefault();






    event.dataTransfer.dropEffect = "move";






  };













  const handleSchemaDrop = (






    event: React.DragEvent<HTMLDivElement>,






    targetIndex: number






  ) => {






    event.preventDefault();






    const sourceIndex =






      draggingSchemaIndex ?? Number(event.dataTransfer.getData("text/plain"));






    setDraggingSchemaIndex(null);






    if (!Number.isFinite(sourceIndex) || sourceIndex === targetIndex) return;













    const nextDraft = [...schemaDraft];






    const [sourceHeader] = nextDraft.splice(sourceIndex, 1);






    if (!sourceHeader) return;






    nextDraft.splice(targetIndex, 0, sourceHeader);






    setSchemaDraft(nextDraft);






    resetSchemaFieldDraft();






    persistSchema(nextDraft, schemaFieldTypesDraft);






  };













  const updateTableName = (userId: number, tableId: number, newName: string) => {
    if (!canEditOwnReports) return;
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






        canEditOwnReports &&
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
    if (!canEditOwnReports) return;
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






        canEditOwnReports &&
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













  const visibleBlocks = isManager
    ? blocks.filter((b) => !b.is_current_user)
    : blocks.filter((b) => b.is_current_user);







  const visiblePrevWeekBlocks = isManager
    ? prevWeekBlocks.filter((b) => !b.is_current_user)
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






      alert(getErrorMessage(error, "匯入 XLSX 失敗，請稍後重試。"));






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






      if (!canEditOwnReports || !file || importingXlsx) return;
      if (!file.name.toLowerCase().endsWith(".xlsx")) {






        alert("檔案不是有效的 xlsx 格式");






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






          alert(`匯入成功，共新增 ${createdCount} 張表格`);






          fetchData();






        }






      } catch (error) {






        alert(getErrorMessage(error, "匯入 XLSX 失敗"));






      } finally {






        setImportingXlsx(false);






      }






    },






    [
      apiBase,
      canEditOwnReports,
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






              title={reportType === "daily" ? "前一天" : "前一週"}






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






              title={reportType === "daily" ? "後一天" : "後一週"}






            >






              <ChevronRight size={18} />






            </button>






          </div>













          {!isCurrentPeriod && (






            <button






              onClick={goToCurrentPeriod}






              className="text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition"






            >






              {reportType === "daily" ? "回到今天" : "回到本週"}






            </button>






          )}













          <button






            type="button"






            onClick={() => importInputRef.current?.click()}






            disabled={importingXlsx || !canEditOwnReports}
            title="匯入 XLSX"






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






            title="匯出當週工作紀錄為 XLSX"






            className="inline-flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 px-4 py-2 text-sm font-medium rounded-xl hover:bg-slate-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"






          >






            <Download size={16} aria-hidden />






            {exportingXlsx ? "匯出中..." : "匯出 XLSX"}






          </button>













          <button






            onClick={handleCreateNewTable}






            disabled={creating || !canEditOwnReports}
            className="bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-60"






          >






            {creating ? "建立中..." : "新增空白表格"}






          </button>






        </div>






      </div>













            {isManager && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">欄位設定</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                設定所有使用者在工作紀錄中看到的欄位與型態。
              </p>
            </div>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4">
              <label>
                <span className="mb-1 block text-sm font-bold text-slate-700">欄位名稱</span>
                <input
                  type="text"
                  value={schemaFieldDraft}
                  onChange={(event) => setSchemaFieldDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitSchemaField();
                    }
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label>
                <span className="mb-1 block text-sm font-bold text-slate-700">欄位型態</span>
                <select
                  value={schemaFieldTypeDraft}
                  onChange={(event) =>
                    setSchemaFieldTypeDraft(
                      normalizeWorkReportFieldType(event.target.value)
                    )
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {WORK_REPORT_FIELD_TYPE_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              {schemaFieldTypeDraft === "select" && (
                <WorkReportOptionsEditorPanel
                  header={schemaFieldDraft.trim() || "新欄位"}
                  options={schemaFieldOptionsDraft}
                  onChange={setSchemaFieldOptionsDraft}
                />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={submitSchemaField}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  {editingSchemaIndex === null ? "新增" : "更新"}
                </button>
                {editingSchemaIndex !== null && (
                  <button
                    type="button"
                    onClick={resetSchemaFieldDraft}
                    className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                    aria-label="取消"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {savingSchema && (
                <p className="text-xs font-semibold text-slate-500">儲存中...</p>
              )}
            </div>

            <div className="space-y-2">
              {schemaDraft.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-center text-sm font-semibold text-slate-400">
                  尚未新增任何欄位
                </div>
              ) : (
                schemaDraft.map((header, index) => (
                  <div
                    key={`${header}-${index}`}
                    draggable
                    onDragStart={(event) => handleSchemaDragStart(event, index)}
                    onDragOver={handleSchemaDragOver}
                    onDrop={(event) => handleSchemaDrop(event, index)}
                    onDragEnd={() => setDraggingSchemaIndex(null)}
                    className={`flex cursor-grab items-center justify-between gap-3 rounded-md border px-3 py-2 active:cursor-grabbing ${
                      draggingSchemaIndex === index
                        ? "border-blue-300 bg-blue-50 opacity-70"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {header || "未命名欄位"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {
                          WORK_REPORT_FIELD_TYPE_LABELS[
                            normalizeWorkReportFieldType(schemaFieldTypesDraft[header])
                          ]
                        }
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => editSchemaField(index)}
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                        aria-label="編輯欄位"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSchemaField(index)}
                        className="rounded-md p-2 text-red-500 hover:bg-red-50"
                        aria-label="刪除欄位"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-500">載入中...</div>






      ) : visibleBlocks.length === 0 ? (






        <div className="text-center py-16 text-slate-400">






          <p className="text-lg font-medium">目前沒有工作紀錄</p>






          <p className="text-sm mt-2">請建立表格後開始填寫。</p>






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
                    {block.user_name}

                  </h2>
                </div>






                {block.is_current_user && canEditOwnReports && (
                  <button






                    onClick={handleCreateNewTable}






                    disabled={creating}






                    className="bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-60"






                  >






                    {creating ? "建立中..." : "新增空白表格"}
                  </button>






                )}






              </div>













              {block.tables.length === 0 ? (






                <p className="text-center py-6 text-slate-400 text-sm">






                  {block.is_current_user






                    ? "尚未建立任何表格"






                    : "此使用者尚未填寫工作紀錄"}






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
                    canEditOwnReports &&
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






                              僅可檢視前一週資料
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






                                errorByTableId[table.id]?.includes("??")






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






                              新增資料列
                            </button>






                            <button






                              onClick={() => handleDeleteTable(table.id)}






                              className="text-sm font-medium bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg"






                            >






                              刪除表格
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






                                  尚未建立任何資料列






                                </td>






                              </tr>






                            ) : (






                              rows.map((row, rIndex) => (






                                <tr






                                  key={rIndex}






                                  className="hover:bg-slate-50/50"






                                >






                                  {headers.map((header, cIndex) => {






                                    const fieldType = normalizeWorkReportFieldType(schemaFieldTypes[header]);






                                    const updateCell = (nextValue: string) => {






                                      const updatedRows = [...rows];






                                      updatedRows[rIndex] = {






                                        ...updatedRows[rIndex],






                                        [header]: nextValue,






                                      };






                                      updateTableData(block.user_id, table.id, {






                                        headers,






                                        rows: updatedRows,






                                      });






                                    };






                                    return (






                                    <td






                                      key={cIndex}






                                      className="border border-slate-200 p-1"






                                    >






                                      {fieldType === "select" ? (






                                        <WorkReportOptionSelect






                                          options={optionsByHeader[header] ?? []}






                                          value={row[header] || ""}






                                          disabled={!isEditable}






                                          onChange={updateCell}






                                        />






                                      ) : isEditable && fieldType === "textarea" ? (






                                        <textarea






                                          className="min-h-20 w-full resize-y rounded border-none bg-transparent p-1.5 text-slate-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"






                                          value={row[header] || ""}






                                          onChange={(e) => updateCell(e.target.value)}






                                        />






                                      ) : isEditable ? (






                                        <input






                                          type={fieldType === "date" ? "date" : "text"}






                                          className="w-full p-1.5 border-none bg-transparent text-slate-600 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:rounded focus:outline-none"






                                          value={row[header] || ""}






                                          onChange={(e) => updateCell(e.target.value)}






                                        />






                                      ) : (






                                        <span className="p-1.5 block min-h-[32px] whitespace-pre-wrap text-slate-700">






                                          {row[header] ? (






                                            <WorkReportOptionPill label={row[header]} />






                                          ) : (






                                            "-"






                                          )}






                                        </span>






                                      )}






                                    </td>






                                    );






                                  })}






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






              {prevWeekLabel} 統整前一週已填寫的內容，僅供檢視。
            </p>






          </div>






          {prevWeekLoading ? (






            <div className="text-center py-8 text-slate-500 text-sm">






              前一週資料載入中...
            </div>






          ) : (






            <WorkReportReadOnlyTables






              blocks={visiblePrevWeekBlocks}






              schemaHeaders={schemaHeaders}






              optionsByHeader={optionsByHeader}






              emptyMessage="前一週沒有工作紀錄"






            />






          )}






        </section>






      )}






    </div>






  );






}






