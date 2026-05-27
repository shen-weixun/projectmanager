import WorkReportPage from "./WorkReportPage";

export default function WeeklyWorkRecord() {
  return (
    <WorkReportPage
      reportType="weekly"
      apiBase="/api/work-report/weekly"
      title="週工作紀錄"
      subtitle="以週一至週五為單位填寫工作內容；編輯後自動儲存。本週表格無論登出或登入皆可編輯；僅過往週次於登出後鎖定"
    />
  );
}
