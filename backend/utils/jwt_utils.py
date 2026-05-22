import jwt
import datetime

from .env import get_env_var
from .logger import setup_logger

logger = setup_logger(__name__)
SECRET_KEY = get_env_var("JWT_SECRET_KEY")


def generate_token(
    user_id: str,
    role_key: str | None = None,
    token_version: int = 0,
) -> str:
    """
    生成一個JWT令牌，包含給定的使用者ID和過期時間。
    Args:
        user_id (str): 要包含在令牌中的使用者ID。
        role_key (str): 使用者主要角色識別 key。
    Returns:
        str: 生成的JWT令牌。
    Raises:
        jwt.PyJWTError: 如果令牌生成失敗。

    這些異常會被捕獲並返回None。
    """
    try:
        payload = {
            "user_id": user_id,
            "role_key": role_key,
            "token_version": token_version,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
        return token
    except jwt.PyJWTError as e:
        logger.error(f"Error generating token: {e}")
        return None


def verify_token(token: str) -> dict:
    """
    驗證JWT令牌並返回其有效負載。
    Args:
        token (str): 要驗證的JWT令牌。
    Returns:
        dict: 令牌的有效負載，如果令牌無效或過期則返回None。
    Raises:
        jwt.ExpiredSignatureError: 如果令牌已過期。
        jwt.InvalidTokenError: 如果令牌無效。

    這些異常會被捕獲並返回None。
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
