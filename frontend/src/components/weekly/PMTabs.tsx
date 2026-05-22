import { type PMTabKey } from "@/types/api"

type PMTabsProps = {
  activeTab: PMTabKey
  onChange: (tab: PMTabKey) => void
  counts: Record<PMTabKey, number>
  labels?: Partial<Record<PMTabKey, string>>
}

// 週報頁籤的固定順序與預設顯示文字。
const tabs: Array<{ key: PMTabKey; label: string }> = [
  { key: "ongoing", label: "進行中專案" },
  { key: "closed", label: "已結案 / 已撤案" },
  { key: "history", label: "歷史週報" },
]

const PMTabs = ({ activeTab, onChange, counts, labels }: PMTabsProps) => {
  return (
    <div className="flex flex-wrap gap-3">
      {tabs.map((tab) => {
        // 判斷目前頁籤是否啟用，切換對應的按鈕樣式。
        const isActive = tab.key === activeTab
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`rounded-full px-5 py-2.5 text-base font-bold transition ${
              isActive
                ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
            }`}
          >
            {labels?.[tab.key] ?? tab.label}
            <span className={`ml-2 rounded-full px-2.5 py-0.5 text-sm ${isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {counts[tab.key]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default PMTabs
