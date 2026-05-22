from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.core import get_db
from models import Group, Role, User, UserRole
from utils.auth import AuthPayload, get_current_user, select_primary_role_key
from utils.jwt_utils import generate_token
from utils.logger import setup_logger
from utils.password import verify_password

logger = setup_logger(__name__)

router = APIRouter(tags=["User"])


class LoginRequest(BaseModel):
    username: str = Field(..., description="username")
    password: str = Field(..., description="password")


class UserProfileUpdate(BaseModel):
    groupId: int | None = None
    groupName: str | None = None
    email: str | None = None
    address: str | None = None


def serialize_user_profile(current_user: User, group: Group | None = None) -> dict:
    return {
        "id": current_user.id,
        "name": current_user.account, 
        "phone": current_user.phone or "",
        "groupId": current_user.group_id,
        "groupName": current_user.group_name or "",
        "email": current_user.email or "",
        "address": current_user.address or "",
    }


@router.post(
    "/login",
    summary="User login",
    description="Validate account/password and return a JWT token.",
)
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    if not data.username or not data.password:
        raise HTTPException(
            status_code=400,
            detail={"status": 1, "message": "請輸入帳號與密碼"},
        )

    user = (
        db.query(User)
        .filter(User.account == data.username, User.is_active.is_(True))
        .first()
    )

    if user and verify_password(data.password, user.password):
        roles = (
            db.query(Role.role_key)
            .join(UserRole, UserRole.role_id == Role.id)
            .filter(UserRole.user_id == user.id)
            .all()
        )
        role_key = select_primary_role_key([role.role_key for role in roles])

        token = generate_token(
            user_id=str(user.id),
            role_key=role_key,
            token_version=user.token_version,
        )
        return {
            "status": 0,
            "data": {
                "token": token,
                "roleKey": role_key,
                "account": user.account,
                "name": user.name,
            },
        }

    raise HTTPException(
        status_code=401,
        detail={"status": 1, "message": "帳號或密碼錯誤"},
    )


@router.post("/logout", summary="User logout")
async def logout(
    user: AuthPayload = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user = db.query(User).filter(User.id == int(user.user_id)).first()
    if current_user is None or not current_user.is_active:
        raise HTTPException(
            status_code=401,
            detail={"status": 1, "message": "使用者不存在或已停用"},
        )

    current_user.token_version = (current_user.token_version or 0) + 1
    db.add(current_user)
    db.commit()
    return {"status": 0, "data": {"message": "已登出"}}


@router.get("/user/groups", summary="Get active groups")
async def get_groups(
    user: AuthPayload = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        groups = (
            db.query(Group)
            .filter_by(is_active=True)
            .order_by(Group.id.asc())
            .all()
        )

        return {
            "status": 0,
            "data": [{"id": group.id, "groupName": group.name} for group in groups],
        }
    except Exception as e:
        logger.error(f"Failed to get groups: {e}")
        raise HTTPException(
            status_code=500,
            detail={"status": 1, "message": "取得組別失敗"},
        )


@router.get("/user/profile", summary="Get current user profile")
async def get_user_profile(
    user: AuthPayload = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user = (
        db.query(User)
        .filter(User.id == int(user.user_id), User.is_active.is_(True))
        .first()
    )
    if current_user is None:
        raise HTTPException(
            status_code=404,
            detail={"status": 1, "message": "找不到使用者資料"},
        )

    group = None
    if current_user.group_id:
        group = db.query(Group).filter(Group.id == current_user.group_id).first()

    return {"status": 0, "data": serialize_user_profile(current_user, group)}


@router.patch("/user/profile", summary="Update current user profile")
async def update_user_profile(
    data: UserProfileUpdate,
    user: AuthPayload = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user = (
        db.query(User)
        .filter(User.id == int(user.user_id), User.is_active.is_(True))
        .first()
    )
    if current_user is None:
        raise HTTPException(
            status_code=404,
            detail={"status": 1, "message": "找不到使用者資料"},
        )

    group = None
    update_data = data.model_dump(exclude_unset=True)
    if "groupName" in update_data:
      current_user.group_name = (update_data["groupName"] or "").strip() or None
    if "groupId" in update_data:
        group_id = update_data["groupId"]
        if group_id is None:
            current_user.group_id = None
        else:
            group = (
                db.query(Group)
                .filter(Group.id == group_id, Group.is_active.is_(True))
                .first()
            )
            if group is None:
                raise HTTPException(
                    status_code=400,
                    detail={"status": 1, "message": "找不到指定組別"},
                )
            current_user.group_id = group.id
            current_user.department_id = group.department_id

    if "email" in update_data:
        current_user.email = (update_data["email"] or "").strip() or None
    if "address" in update_data:
        current_user.address = (update_data["address"] or "").strip() or None

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    if current_user.group_id and group is None:
        group = db.query(Group).filter(Group.id == current_user.group_id).first()

    return {"status": 0, "data": serialize_user_profile(current_user, group)}
