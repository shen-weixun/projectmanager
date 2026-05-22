# Frontend 檔案說明

這份文件用來快速了解前端各資料夾與檔案在做什麼，方便交接、除錯與後續維護。

## 專案入口

- `src/main.tsx`：React 應用入口，負責掛載 `App`。
- `src/App.tsx`：前端主要路由設定與權限導向。
- `index.html`：Vite 進入點，提供 `root` 容器。

## 頁面層 `src/pages/`

頁面層負責對應實際路由，每個檔案通常對應一個畫面。

- `pages/Login.tsx`：登入頁。
- `pages/home.tsx`：登入後首頁。
- `pages/project/ProjectManagement.tsx`：專案列表與管理頁。
- `pages/project/ProjectDetail.tsx`：專案詳情頁。
- `pages/project/NewProjectModal.tsx`：新增專案彈窗。
- `pages/weekly/PMWeeklyReport.tsx`：PM 週報頁。
- `pages/weekly/RDWeeklyReport.tsx`：RD 週報頁。
- `pages/asset/AssetInventory.tsx`：資產清單頁。
- `pages/asset/AssetWithdrawRecords.tsx`：資產領用或退回紀錄頁。
- `pages/settings/SettingsPage.tsx`：設定頁外層。
- `pages/settings/UserProfileSetting.tsx`：個人資料設定。
- `pages/settings/DepartmentSetting.tsx`：部門設定。

## 元件層 `src/components/`

元件層負責可重用 UI 與頁面內區塊，讓頁面保持簡潔。

- `components/AppLayout.tsx`：登入後主版型。
- `components/Sidebar.tsx`：側邊欄導覽。
- `components/Header.tsx`：上方列。
- `components/ProtectedRoute.tsx`：登入保護與路由限制。
- `components/Section.tsx`：共用區塊容器。
- `components/PageMeta.tsx`：頁面標題與 metadata。
- `components/Gantt.tsx`：甘特圖顯示元件。

### 專案相關元件

- `components/project/ProjectBaseInfo.tsx`：專案基本資訊區塊。
- `components/project/ProjectScheduleList.tsx`：專案排程列表。
- `components/project/ProjectTodoList.tsx`：專案待辦列表。
- `components/project/ProjectCheckpointList.tsx`：專案檢核點列表。
- `components/project/projectDetailStyles.ts`：專案詳情頁樣式。
- `components/project/projectDetailTypes.ts`：專案詳情頁型別定義。

### 週報相關元件

- `components/weekly/PMTable.tsx`：PM 週報表格。
- `components/weekly/RDTable.tsx`：RD 週報表格。
- `components/weekly/PMTabs.tsx`：PM 週報分頁切換。
- `components/weekly/EditableCell.tsx`：可編輯欄位。
- `components/weekly/RDStatusSelect.tsx`：RD 狀態下拉選單。
- `components/weekly/ProjectStageSelect.tsx`：專案階段下拉選單。
- `components/weekly/PrioritySelect.tsx`：優先度下拉選單。
- `components/weekly/AddProjectButton.tsx`：新增專案按鈕。
- `components/weekly/ArchiveWeekButton.tsx`：封存週報按鈕。
- `components/weekly/ClosedProjectsTable.tsx`：已結案專案表格。

### UI 基礎元件

- `components/ui/`：通用介面元件，例如 `button`、`input`、`select`、`dialog`、`form`、`label`。

## API 與資料

- `src/services/apis.ts`：前端 API 集中管理，包含登入、專案、週報、資產、公司與部門等呼叫。
- `src/types/api.ts`：API 回傳資料與 payload 型別定義。
- `src/utils/auth.ts`：token、角色與登入狀態處理。
- `src/utils/toastHelper.ts`：提示訊息工具。
- `src/hooks/useAPIErrorHandler.ts`：API 錯誤處理 hook。
- `src/store/useCounterStore.ts`：狀態管理範例或共用 store。
- `src/lib/utils.ts`：共用工具函式。

## 靜態資源與樣式

- `src/assets/images/`：圖片資源。
- `src/assets/styles/index.css`：全域樣式入口。
- `src/assets/styles/App.css`：App 主要樣式。
- `src/assets/react.svg`、`public/vite.svg`：範例或預設靜態資源。

## 設定檔

- `package.json`：前端依賴與 scripts。
- `vite.config.ts`：Vite 設定。
- `tsconfig*.json`：TypeScript 設定。
- `tailwind.config.js`、`postcss.config.cjs`：Tailwind 與 PostCSS 設定。
- `eslint.config.js`：Lint 規則。
- `components.json`：UI 元件工具設定。
- `API_Mockoon.json`：API 模擬資料設定。
- `Dockerfile`：前端容器建置設定。

## 環境變數

前端會透過 `frontend/.env` 或執行環境變數讀取後端代理設定，常用內容如下：

```env
VITE_BACKEND_HOST=backend
VITE_BACKEND_PORT=3001
```

- `VITE_BACKEND_HOST`：Vite 開發伺服器代理的後端主機。
- `VITE_BACKEND_PORT`：Vite 開發伺服器代理的後端埠號。

## 啟動流程

前端啟動方式如下：

```bash
npm install
npm run dev
```

- `npm install`：安裝前端依賴。
- `npm run dev`：啟動 Vite 開發伺服器。

若是使用 Docker，則由 `docker-compose.yaml` 統一啟動前後端與資料庫。

## 快速理解

- `pages/` 是畫面。
- `components/` 是可重用區塊。
- `services/apis.ts` 是前端跟後端溝通的入口。
- `utils/`、`hooks/`、`store/` 是共用邏輯與狀態管理。
