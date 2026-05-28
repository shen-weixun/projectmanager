import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import type { WorkReportOptionColor, WorkReportOptionItem } from "@/utils/workReportOptions";
import { OPTION_COLOR_STYLES, WORK_REPORT_OPTION_COLORS } from "@/utils/workReportOptions";
import WorkReportOptionSelect from "@/components/work-report/WorkReportOptionSelect";

type Props = {
  header: string;
  options: WorkReportOptionItem[];
  onChange: (options: WorkReportOptionItem[]) => void;
};

const COLOR_LABELS: Record<WorkReportOptionColor, string> = {
  red: "紅", orange: "橘", yellow: "黃", green: "綠",
  blue: "藍", slate: "灰", purple: "紫", dark: "深",
  rose: "粉", brown: "棕",
};

export default function WorkReportOptionsEditorPanel({ header, options, onChange }: Props) {
  // 用內部 state 管理輸入，避免每次父層 options 變化就重建輸入框
  const [localOptions, setLocalOptions] = useState<WorkReportOptionItem[]>(() => {
    return options.length > 0 ? options : [{ value: "", color: "slate" }];
  });

  // 追蹤是否由內部操作觸發，避免父層同步覆蓋本地輸入
  const isInternalChange = useRef(false);

  // 只有當外部 options 是由父層（非本元件）改變時才同步（例如切換欄位）
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    setLocalOptions(options.length > 0 ? options : [{ value: "", color: "slate" }]);
  }, [options]);

  const notifyParent = (next: WorkReportOptionItem[]) => {
    isInternalChange.current = true;
    onChange(next);
  };

  const updateOption = (index: number, patch: Partial<WorkReportOptionItem>) => {
    const next = localOptions.map((opt, i) =>
      i === index ? { ...opt, ...patch } : opt
    );
    setLocalOptions(next);
    notifyParent(next);
  };

  const removeOption = (index: number) => {
    const next = localOptions.filter((_, i) => i !== index);
    const result = next.length > 0 ? next : [];
    setLocalOptions(result);
    notifyParent(result);
  };

  const addOption = () => {
    const next = [...localOptions, { value: "", color: "slate" as WorkReportOptionColor }];
    setLocalOptions(next);
    notifyParent(next);
  };

  const previewOptions = localOptions.filter((o) => o.value.trim());
  const previewValue = previewOptions[0]?.value ?? "";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
      <div>
        <p className="text-sm font-bold text-slate-800">{header}</p>
        <p className="mt-1 text-xs text-slate-500">設定這個下拉欄位可選的項目與顏色。</p>
      </div>

      <div className="space-y-2">
        {localOptions.map((option, index) => (
          // key 用 index，不用 value，避免輸入時 key 改變重建 DOM
          <div key={index} className="grid grid-cols-[1fr_96px_36px] gap-2">
            <input
              value={option.value}
              onChange={(e) => updateOption(index, { value: e.target.value })}
              placeholder="輸入選項名稱"
              className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <select
              value={option.color}
              onChange={(e) => updateOption(index, { color: e.target.value as WorkReportOptionColor })}
              className={`rounded-md border px-2 py-2 text-sm font-bold outline-none cursor-pointer ${
                OPTION_COLOR_STYLES[option.color]?.bg ?? "bg-slate-100"
              } ${OPTION_COLOR_STYLES[option.color]?.text ?? "text-slate-700"}`}
            >
              {WORK_REPORT_OPTION_COLORS.map((color) => (
                <option key={color} value={color}>
                  {COLOR_LABELS[color]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeOption(index)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-white hover:text-red-500 transition-colors"
              aria-label="刪除選項"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addOption}
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Plus className="h-4 w-4" />
        新增選項
      </button>

      {previewOptions.length > 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold text-slate-600">下拉預覽</p>
          <div className="max-w-xs">
            <WorkReportOptionSelect
              options={previewOptions}
              value={previewValue}
              onChange={() => {}}
              disabled
            />
          </div>
        </div>
      )}
    </div>
  );
}