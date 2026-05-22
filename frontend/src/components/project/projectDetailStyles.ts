// 專案詳情各區塊共用卡片外框樣式。
export const cardBaseClass =
  "rounded-xl border border-slate-300 bg-white shadow-sm mb-8 transition-all overflow-visible border-t-4"
// 專案詳情各區塊標題列共用樣式。
export const cardHeaderBaseClass =
  "px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 text-xl font-bold text-slate-900"
// 專案詳情各區塊內容容器共用間距。
export const cardBodyClass = "p-6"

// 專案詳情表單欄位共用樣式，包含一般與停用狀態。
export const baseInputClass =
  "w-full rounded-md border border-slate-400 bg-white px-3 py-2.5 text-base font-medium text-slate-900 transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:border-transparent disabled:bg-transparent disabled:px-0 disabled:text-slate-900 disabled:opacity-100"
// 置中文字內容的表格輸入欄位樣式。
export const centerInputClass = `${baseInputClass} text-center disabled:text-center`
// 下拉選單外層定位容器，供箭頭圖示絕對定位。
export const selectWrapperClass = "relative w-full"
// 原生 select 欄位樣式，保留右側箭頭空間。
export const nativeSelectClass = `${baseInputClass} appearance-none pr-8 disabled:pr-0`
// 置中版原生 select 欄位樣式。
export const centerSelectClass = `${centerInputClass} appearance-none pr-8 disabled:pr-0`
// 表單欄位標籤共用樣式。
export const labelClass =
  "mb-2 block text-sm font-bold tracking-wide text-slate-700 uppercase"
// 區塊內小標題共用樣式。
export const sectionTitleClass =
  "mb-5 text-sm font-extrabold tracking-widest text-slate-400 uppercase border-b border-slate-200 pb-2"
// 專案詳情子清單表頭共用樣式。
export const tableHeaderClass =
  "whitespace-nowrap bg-slate-100 px-4 py-4 text-center text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200"
// 專案詳情子清單表格儲存格共用樣式。
export const tableCellClass =
  "px-4 py-4 align-middle border-b border-slate-200 last:border-0"
