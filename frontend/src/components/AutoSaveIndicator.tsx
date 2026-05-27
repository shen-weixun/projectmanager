import { getAutoSaveLabel, type AutoSaveStatus } from "@/hooks/useAutoSaveTable";

interface AutoSaveIndicatorProps {
  status?: AutoSaveStatus;
  errorMessage?: string | null;
}

export default function AutoSaveIndicator({
  status,
  errorMessage,
}: AutoSaveIndicatorProps) {
  const label = getAutoSaveLabel(status, errorMessage);
  if (!label) return null;

  const colorClass =
    status === "error"
      ? "text-red-600"
      : status === "saved"
        ? "text-emerald-600"
        : "text-slate-400";

  return (
    <span className={`text-xs font-medium whitespace-nowrap ${colorClass}`}>
      {label}
    </span>
  );
}
