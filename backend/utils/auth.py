from dataclasses import dataclass
from typing import Callable

from fastapi import Request, HTTPException, Depends
from sqlalchemy.orm import Session

from db.core import get_db
from models import Role, User, UserRole
from utils.jwt_utils import verify_token


@dataclass
class AuthPayload:
    user_id: str
    role_key: str | None = None
    token_version: int = 0


ROLE_PRIORITY = [
    "super",
    "boss",
    "pm_leader",
    "rd_leader",
    "pm_user",
    "rd_user",
    "viewer",
]


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> AuthPayload:
    """
    驗證 JWT token，並回傳解析後的 AuthPayload。
    """
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail={"status": 1, "message": "缺少授權資訊"}
        )

    token = auth_header.removeprefix("Bearer ").strip()
    payload = verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail={"status": 1, "message": "無效或過期的Token"}
        )

    try:
        user_id = int(payload["user_id"])
        token_version = int(payload.get("token_version", 0))
        active_user = (
            db.query(User.id, User.token_version)
            .filter(User.id == user_id, User.is_active.is_(True))
            .first()
        )
        if active_user is None:
            raise HTTPException(
                status_code=401,
                detail={"status": 1, "message": "帳號不存在或已停用"}
            )
        if int(active_user.token_version) != token_version:
            raise HTTPException(
                status_code=401,
                detail={"status": 1, "message": "Token已失效，請重新登入"}
            )
        return AuthPayload(
            user_id=str(user_id),
            role_key=payload.get("role_key"),
            token_version=token_version,
        )
    except (KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail={"status": 1, "message": "Token格式錯誤"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail={"status": 1, "message": f"Token驗證失敗: {str(e)}"}
        )

def normalize_role_key(role_key: str | None) -> str:
    # 沒有角色時預設為 viewer，避免權限判斷收到 None。
    return role_key or "viewer"


def select_primary_role_key(role_keys: list[str]) -> str:
    normalized = {normalize_role_key(role_key) for role_key in role_keys}
    for role_key in ROLE_PRIORITY:
        if role_key in normalized:
            return role_key
    return "viewer"


def get_user_role_keys(db: Session, user_id: int) -> list[str]:
    roles = (
        db.query(Role.role_key)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == user_id)
        .all()
    )
    return [normalize_role_key(role.role_key) for role in roles]


def role_required(*allowed_role_keys: str) -> Callable:
    allowed = {normalize_role_key(role_key) for role_key in allowed_role_keys}

    async def check_role(
        user: AuthPayload = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> AuthPayload:
        try:
            user_id = int(user.user_id)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=401,
                detail={"status": 1, "message": "Token格式錯誤"}
            )

        role_keys = get_user_role_keys(db, user_id)
        if not allowed.intersection(role_keys):
            raise HTTPException(
                status_code=403,
                detail={"status": 1, "message": "權限不足"}
            )

        user.role_key = select_primary_role_key(role_keys)
        return user

    return check_role
