import { useMemo } from "react";
import { Plus, X } from "lucide-react";

import type { WorkReportOptionItem } from "@/utils/workReportOptions";
import { normalizeOptionsList } from "@/utils/workReportOptions";
import WorkReportOptionSelect from "@/components/work-report/WorkReportOptionSelect";

type Props = {
  header: string;
  options: WorkReportOptionItem[];
  onChange: (options: WorkReportOptionItem[]) => void;
};

export default function WorkReportOptionsEditorPanel({
  header,
  options,
  onChange,
}: Props) {
  const normalizedOptions = useMemo(() => {
    const normalized = normalizeOptionsList(options);
    return normalized.length > 0 ? normalized : [{ value: "", color: "slate" as const }];
  }, [options]);

  const updateOption = (index: number, value: string) => {
    const next = normalizedOptions.map((option, optionIndex) =>
      optionIndex === index ? { ...option, value } : option
    );
    onChange(next);
  };

  const removeOption = (index: number) => {
    const next = normalizedOptions.filter((_, optionIndex) => optionIndex !== index);
    onChange(next.length > 0 ? next : []);
  };

  const addOption = () => {
    onChange([...normalizedOptions, { value: "", color: "slate" }]);
  };

  const previewOptions = normalizeOptionsList(normalizedOptions);
  const previewValue = previewOptions[0]?.value ?? "";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
      <div>
        <p className="text-sm font-bold text-slate-800">{header}</p>
        <p className="mt-1 text-xs text-slate-500">
          請直接設定這個下拉欄位可選的項目。
        </p>
      </div>

      <div className="space-y-2">
        {normalizedOptions.map((option, index) => (
          <div key={`${option.value}-${index}`} className="flex items-center gap-2">
            <input
              value={option.value}
              onChange={(event) => updateOption(index, event.target.value)}
              placeholder="輸入選項名稱"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => removeOption(index)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-white"
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
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
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
