import Section from '@/components/Section'

const HomePage = () => {
  return (
    <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6">
      <Section title="公告事項">
        <ul className="list-disc pl-5 space-y-1">
          <li>系統將於本週五進行維護，請提前做好準備。</li>
          <li>新功能上線：用戶可以自定義個人主頁。</li>
          <li>感謝所有用戶的支持和反饋！</li>
        </ul>
      </Section>
      <Section title="代辦事項">
        <ul className="list-disc pl-5 space-y-1">
          <li>完成前端頁面設計</li>
          <li>實作後端API</li>
          <li>撰寫單元測試</li>
          <li>部署到生產環境</li>
        </ul>
      </Section>
      <div className="md:col-span-2">
        <Section title="已完成事項">
          <ul className="list-disc pl-5 space-y-1">
            <li>設計資料庫結構</li>
            <li>實作用戶認證系統</li>
            <li>撰寫API文檔</li>
          </ul>
        </Section>
      </div>
    </div>
  )
}

export default HomePage
