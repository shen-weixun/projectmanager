# backend/scripts/create_admin.py
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from db.core import get_db
from models import User, Role, UserRole
from utils.password import hash_password

db = next(get_db())
try:
    # 確保有 super 角色
    role = db.query(Role).filter(Role.role_key == "super").first()
    if role is None:
        role = Role(role_key="super", role_name="Super Admin")
        db.add(role); db.commit(); db.refresh(role)
        print("Created role: super")
    else:
        print("Role already exists:", role.role_key)

    # 檢查帳號是否已存在
    existing_user = db.query(User).filter(User.account == "weixun").first()
    if existing_user:
        print("帳號已存在，更新密碼中...")
        user = existing_user
        user.phone = "09089059276"  # 更新電話

        # 更新密碼
        user.password = hash_password("123456")  # 改成新密碼
        db.commit()
        print("密碼已更新")

        # 檢查是否已綁定 super 角色
        existing_ur = db.query(UserRole).filter(
            UserRole.user_id == user.id,
            UserRole.role_id == role.id
        ).first()
        if not existing_ur:
            ur = UserRole(user_id=user.id, role_id=role.id)
            db.add(ur); db.commit()
            print("已補上 super 角色綁定")
        else:
            print("已有 super 角色，無需任何變更")
    else:
        pwd = hash_password("123456")  # 改成您的密碼
        user = User(account="weixun", name="weixun", email="shenweixun@gmail.com", password=pwd, is_active=True)
        db.add(user); db.commit(); db.refresh(user)
        print("Created user:", user.id, user.account)

        ur = UserRole(user_id=user.id, role_id=role.id)
        db.add(ur); db.commit()
        print("綁定 super 角色完成")

finally:
    db.close()
