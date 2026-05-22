import os
import importlib

from fastapi import APIRouter, FastAPI

from utils.logger import setup_logger

logger = setup_logger(__name__)


def register_routers(app: FastAPI, prefix: str = "") -> None:
    base_dir = os.path.dirname(__file__)

    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith(".py") and file != "__init__.py":
                rel_path = os.path.relpath(os.path.join(root, file), base_dir)
                module_path = rel_path.replace(os.sep, ".").rsplit(".", 1)[0]
                full_module = f"apis.{module_path}"

                try:
                    module = importlib.import_module(full_module)
                    for attr in dir(module):
                        obj = getattr(module, attr)
                        if isinstance(obj, APIRouter):
                            app.include_router(obj, prefix=prefix)
                            logger.info(
                                f"✅ Router loaded: {attr} (prefix={prefix}{obj.prefix}) from {full_module}"
                            )
                except Exception as e:
                    logger.warning(
                        f"❌ Router import failed: {full_module} - {e}")
