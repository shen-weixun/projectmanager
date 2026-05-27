/** 以本地日曆年月日輸出 YYYY-MM-DD（避免 toISOString 時區偏移） */
export function formatLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 與後端 work_week_monday 一致：週日視為次日本週 */
export function workWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  if (x.getDay() === 0) {
    x.setDate(x.getDate() + 1);
    return x;
  }
  const day = x.getDay();
  x.setDate(x.getDate() - (day - 1));
  return x;
}

export function isViewingCurrentWorkWeek(viewDate: Date): boolean {
  return (
    formatLocalISODate(workWeekMonday(viewDate)) ===
    formatLocalISODate(workWeekMonday(new Date()))
  );
}
