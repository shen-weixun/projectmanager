# Backend 檔案說明

這份文件用來快速了解後端各資料夾與檔案在做什麼，方便交接、除錯與後續維護。

## 專案入口

- `app.py`：FastAPI 主入口，建立應用、設定 CORS、註冊 router、啟動 uvicorn。
- `apis/__init__.py`：自動掃描並註冊 `apis/` 底下的所有 router。

## API 層 `backend/apis/`

API 層依功能切資料夾，每個模組負責一個業務領域。

### `apis/user/`

- `user.py`：使用者相關 API，例如登入、登出、群組資料。

### `apis/company/`

- `company.py`：公司資訊、部門管理等 API。

### `apis/project/`

- `project.py`：專案主流程 API。
- `helpers.py`：專案相關共用輔助邏輯。
- `resources.py`：專案相關資源或常數。
- `schemas.py`：專案資料驗證與 schema。
- `serializers.py`：輸出資料格式整理。
- `options.py`：專案狀態與分類選項。

### `apis/weekly/`

- `pm.py`：PM 週報 API。
- `rd.py`：RD 週報 API。
- `serializers.py`：週報輸出資料格式整理。

### `apis/asset/`

- `asset.py`：資產管理 API。
- `schemas.py`：資產相關驗證與 schema。
- `serializers.py`：資產資料輸出格式整理。

## 資料模型 `backend/models/`

資料模型層負責 ORM 與資料表定義。

- `base.py`：所有 model 的基底類別，包含共用 `id`、table name 規則、`to_dict()` 與時間欄位 mixin。
- `user.py`：使用者資料表。
- `project.py`：專案資料表。
- `weekly_report.py`：週報資料表。
- `asset.py`：資產資料表。
- `company.py`：公司資訊資料表。
- `department.py`：部門資料表。
- `group.py`：群組資料表。
- `role.py`：角色與權限資料表。
- `pm.py`：PM 相關資料模型。
- `rd.py`：RD 相關資料模型。
- `log.py`：操作或系統紀錄資料表。
- `__main__.py`：模型模組入口或測試用途。
- `__init__.py`：模型匯入匯總。

## 資料庫與 Migration

- `db/core.py`：資料庫連線、Session 與核心設定。
- `migrate/env.py`：migration 執行環境設定。
- `script/migrate.py`：migration 執行腳本。

## 共用工具 `backend/utils/`

- `auth.py`：驗證與授權邏輯。
- `jwt_utils.py`：JWT 產生與驗證。
- `password.py`：密碼雜湊與驗證。
- `env.py`：環境變數讀取工具。
- `logger.py`：日誌設定。

## 設定與部署

- `requirements.txt`：Python 套件清單。
- `Dockerfile`：後端容器建置設定。
- `README.md`：後端專案說明。

## 環境變數

後端會透過 `.env` 讀取以下內容，通常放在後端執行環境可讀的位置。

```env
DB_HOST=資料庫主機
DB_PORT=資料庫埠號
DB_USER=資料庫帳號
DB_PASSWORD=資料庫密碼
DB_NAME=資料庫名稱
SERVER_HOST=0.0.0.0
SERVER_PORT=3001
SERVER_DEBUG=True
ALLOWED_ORIGINS=http://localhost:5173
JWT_SECRET_KEY=JWT 簽章金鑰
LOG_LEVEL=DEBUG
```

- `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`：資料庫連線資訊，`app.py`、`db/core.py`、`models/__main__.py` 會使用。
- `SERVER_HOST`、`SERVER_PORT`：後端服務啟動位址與埠號。
- `SERVER_DEBUG`：是否啟用 debug 與 API 文件。
- `ALLOWED_ORIGINS`：CORS 允許的前端來源。
- `JWT_SECRET_KEY`：JWT 驗證金鑰。
- `LOG_LEVEL`：日誌輸出等級。

## 建立資料表與啟動流程

後端流程如下：

```bash
docker compose up -d postgres
python -m models
python app.py
```

- `docker compose up -d postgres`：先啟動 PostgreSQL 資料庫容器。
- `python -m models`：初始化資料庫、建立資料表，並寫入預設公司、角色、帳號與專案選項。
- `python app.py`：啟動 FastAPI 服務。


## 快速理解

- `app.py` 是後端啟動入口。
- `apis/` 是 API 路由。
- `models/` 是資料表定義。
- `utils/` 是共用工具。
- `db/` 與 `migrate/` 是資料庫連線與遷移。
