# backend/script/create_users.py
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from db.core import get_db
from models import User, Role, UserRole
from utils.password import hash_password

db = next(get_db())

try:
    # ── 取得 pm_user 與 rd_user 角色 ──
    pm_role = db.query(Role).filter(Role.role_key == "pm_user").first()
    rd_role = db.query(Role).filter(Role.role_key == "rd_user").first()

    if pm_role is None:
        print("❌ 找不到 pm_user 角色，請先執行 python -m models")
        sys.exit(1)
    if rd_role is None:
        print("❌ 找不到 rd_user 角色，請先執行 python -m models")
        sys.exit(1)

    # ── 新增 PM：Andy ──
    andy = db.query(User).filter(User.account == "Andy").first()
    if andy:
        print("⚠️  帳號 Andy 已存在，跳過新增")
    else:
        andy = User(
            account="Andy",
            name="Andy",
            password=hash_password("Andy"),
            phone="09875666777",
            is_active=True,
        )
        db.add(andy)
        db.flush()

        db.add(UserRole(
            user_id=andy.id,
            role_id=pm_role.id,
            job_title="PM",
            assigned_by=andy.id,
        ))
        print(f"✅ 新增 PM 帳號 Andy，id={andy.id}")

    # ── 新增 RD：shen ──
    shen = db.query(User).filter(User.account == "shen").first()
    if shen:
        print("⚠️  帳號 shen 已存在，跳過新增")
    else:
        shen = User(
            account="shen",
            name="shen",
            password=hash_password("shen"),
            phone="09875669987",
            is_active=True,
        )
        db.add(shen)
        db.flush()

        db.add(UserRole(
            user_id=shen.id,
            role_id=rd_role.id,
            job_title="RD",
            assigned_by=shen.id,
        ))
        print(f"✅ 新增 RD 帳號 shen，id={shen.id}")

    db.commit()
    print("🎉 完成")

except Exception as e:
    db.rollback()
    print(f"❌ 發生錯誤：{e}")
    raise

finally:
    db.close()