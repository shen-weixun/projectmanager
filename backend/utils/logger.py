import logging
import os

from logging.handlers import TimedRotatingFileHandler

from .env import get_env_var

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)


def setup_logger(name: str) -> logging.Logger:
    """
    設定並返回一個 logger 實例。
    如果 logger 已存在，則返回該 logger。
    :param name: logger 的名稱
    :return: logging.Logger 實例
    """
    logger = logging.getLogger(name)
    log_level = get_env_var("LOG_LEVEL", "DEBUG").upper()
    logger.setLevel(log_level)

    if not logger.hasHandlers():
        console_handler = logging.StreamHandler()
        console_handler.setLevel(
            logging.DEBUG if log_level == "DEBUG" else logging.INFO)
        console_formatter = logging.Formatter("[%(levelname)s] %(message)s")
        console_handler.setFormatter(console_formatter)

        file_handler = TimedRotatingFileHandler(
            filename=os.path.join(LOG_DIR, f"{name}.log"),
            when="midnight",
            interval=1,
            backupCount=7,
            encoding="utf-8",
            utc=False
        )
        file_handler.setLevel(logging.DEBUG if log_level ==
                              "DEBUG" else logging.INFO)
        file_formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        file_handler.setFormatter(file_formatter)

        logger.addHandler(console_handler)
        logger.addHandler(file_handler)

    return logger
