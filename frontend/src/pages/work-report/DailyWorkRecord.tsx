import WorkReportPage from "./WorkReportPage";

export default function DailyWorkRecord() {
  return (
    <WorkReportPage
      reportType="daily"
      apiBase="/api/work-report/daily"
      title="日工作紀錄"
      subtitle="以日為單位填寫工作內容；編輯後自動儲存"
    />
  );
}
