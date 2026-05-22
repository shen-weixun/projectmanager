# Qamstar Internal System - Backend

這是 Qamstar 公司內部管理系統的後端專案，使用 Python + FastAPI 開發，並搭配 SQLAlchemy 與 Alembic 管理資料庫。

---

## 📦 專案用途

本系統負責處理公司內部部門、人員、群組與專案管理等邏輯，提供 RESTful API 接口供前端使用。

---

## 🛠️ 開發環境需求

- Python 3.11
- pip or poetry (管理套件)
- PostgreSQL 資料庫
- Alembic（資料庫 migration 工具）

---

## 🔐 環境變數設定

請於根目錄建立 `.env` 檔案，內容如下：

```env
DB_HOST=資料庫所在位置
DB_PORT=資料庫埠號
DB_USER=帳號
DB_PASSWORD=密碼
DB_NAME=Qamstar_IMS
```

## 📦 套件安裝

使用 pip 或 poetry 安裝依賴：

```bash
# 使用 pip
pip install -r requirements.txt
# 或使用 poetry
poetry install
```

## 🗄️ 資料庫初始化

初始化 Alembic 設定

```bash
alembic init migrate
```

然後設定以下文件
`alembic.ini`：

```ini
[alembic]
sqlalchemy.url = driver://user:pass@localhost/dbname
```

`migrate/env.py`：

```python
# 插入
from models import Base

target_metadata = None
# 改為
target_metadata = Base.metadata
```

然後設定好 `alembic.ini` 及 `migrate/env.py` 的連線資訊後，建立初始 migration：

```bash
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## 🔄 資料庫更新流程（修改 model 後）

每次有模型變動（例如新增欄位、改表名等）後，請依下列步驟執行：

```bash
# 自動產生 migration script
alembic revision --autogenerate -m "describe your change"

# 套用變更至資料庫
alembic upgrade head
```

## 🧱 ORM 架構

本專案使用 SQLAlchemy ORM 撰寫後端模型，並配合 Alembic 管理 migration，確保資料結構版本一致。

## 📖 API 文檔

當前專案使用 flasgger 提供 API 文檔，啟動服務後可以透過以下網址查看 API 文檔：

```
http://localhost:3000/apidocs
```

## 🚀 啟動後端服務

使用以下命令啟動 Flask 服務：

```bash
python app.py
```

## 📝 注意事項

Alembic 的 migration script 預設儲存在 alembic/versions/ 目錄下。
請確認 .env 檔案填寫正確，並且資料庫帳號擁有建表權限。
建議在開發環境中定期備份資料庫或導出 schema。
