import { useCallback, useEffect, useRef, useState } from "react";
import { extractApiErrorMessage } from "@/utils/apiError";

export type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export interface AutoSaveTablePayload {
  id: number;
  table_name: string;
  table_data: unknown;
}

const SAVED_HINT_MS = 2000;

export function getAutoSaveLabel(
  status: AutoSaveStatus | undefined,
  errorMessage?: string | null
): string | null {
  switch (status) {
    case "pending":
      return "待儲存…";
    case "saving":
      return "儲存中…";
    case "saved":
      return "已自動儲存";
    case "error":
      return errorMessage || "儲存失敗";
    default:
      return null;
  }
}

export function useAutoSaveTable<T extends AutoSaveTablePayload>(
  saveTable: (table: T) => Promise<boolean>,
  debounceMs = 800
) {
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const pendingTablesRef = useRef<Map<number, T>>(new Map());
  const saveTableRef = useRef(saveTable);
  const [statusByTableId, setStatusByTableId] = useState<Record<number, AutoSaveStatus>>(
    {}
  );
  const [errorByTableId, setErrorByTableId] = useState<Record<number, string>>({});

  saveTableRef.current = saveTable;

  const setStatus = useCallback((tableId: number, status: AutoSaveStatus) => {
    setStatusByTableId((prev) => ({ ...prev, [tableId]: status }));
  }, []);

  const clearSavedHint = useCallback((tableId: number) => {
    setTimeout(() => {
      setStatusByTableId((prev) => {
        if (prev[tableId] !== "saved") return prev;
        const next = { ...prev };
        delete next[tableId];
        return next;
      });
    }, SAVED_HINT_MS);
  }, []);

  const saveNow = useCallback(
    async (table: T) => {
      setStatus(table.id, "saving");
      try {
        const ok = await saveTableRef.current(table);
        if (ok) {
          setErrorByTableId((prev) => {
            if (!prev[table.id]) return prev;
            const next = { ...prev };
            delete next[table.id];
            return next;
          });
          setStatus(table.id, "saved");
          clearSavedHint(table.id);
          return true;
        }
        const message = "儲存失敗，請稍後再試";
        setErrorByTableId((prev) => ({ ...prev, [table.id]: message }));
        setStatus(table.id, "error");
        return false;
      } catch (error) {
        const message = extractApiErrorMessage(error);
        console.error("表格儲存失敗:", message, error);
        setErrorByTableId((prev) => ({ ...prev, [table.id]: message }));
        setStatus(table.id, "error");
        return false;
      }
    },
    [clearSavedHint, setStatus]
  );

  const scheduleSave = useCallback(
    (table: T) => {
      pendingTablesRef.current.set(table.id, table);
      const existing = timersRef.current.get(table.id);
      if (existing) clearTimeout(existing);
      setStatus(table.id, "pending");

      const timer = setTimeout(() => {
        timersRef.current.delete(table.id);
        const latest = pendingTablesRef.current.get(table.id);
        if (latest) void saveNow(latest);
      }, debounceMs);

      timersRef.current.set(table.id, timer);
    },
    [debounceMs, saveNow, setStatus]
  );

  const clearAllTableStates = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    pendingTablesRef.current.clear();
    setStatusByTableId({});
    setErrorByTableId({});
  }, []);

  const cancelSave = useCallback((tableId: number) => {
    const timer = timersRef.current.get(tableId);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(tableId);
    pendingTablesRef.current.delete(tableId);
    setStatusByTableId((prev) => {
      if (!prev[tableId]) return prev;
      const next = { ...prev };
      delete next[tableId];
      return next;
    });
    setErrorByTableId((prev) => {
      if (!prev[tableId]) return prev;
      const next = { ...prev };
      delete next[tableId];
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
      pendingTablesRef.current.clear();
    };
  }, []);

  return {
    scheduleSave,
    saveNow,
    cancelSave,
    clearAllTableStates,
    statusByTableId,
    errorByTableId,
  };
}
