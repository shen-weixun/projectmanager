import uvicorn

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

import apis
from utils.env import get_env_var
from utils.logger import setup_logger

logger = setup_logger(__name__)

_DEBUG = get_env_var("SERVER_DEBUG", "False").lower() in ("true", "1")
_ALLOWED_ORIGINS = [o.strip() for o in get_env_var("ALLOWED_ORIGINS", "http://localhost:5173").split(",")]

app = FastAPI(
    title="廣思內部系統API",
    description="這是廣思內部系統的API文件，提供各種功能的接口說明。",
    version="1.0.0",
    docs_url="/apidocs" if _DEBUG else None,
    redoc_url="/redoc" if _DEBUG else None,
)

# CORS 設定：只允許指定來源
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("🚀 FastAPI App 啟動中...")


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """
    在每個請求之前與之後執行的中介軟體。
    記錄請求與回應的日誌。
    """
    request_id = request.headers.get("X-Request-ID", None)
    logger.info(
        f"Received request: {request.method} {request.url.path} with ID: {request_id}")

    response = await call_next(request)

    logger.info(
        f"Response status: {response.status_code} for request ID: {request_id}")
    return response


# 註冊所有的路由
apis.register_routers(app, prefix="/api")


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=get_env_var("SERVER_HOST"),
        port=int(get_env_var("SERVER_PORT")),
        reload=_DEBUG,
    )
