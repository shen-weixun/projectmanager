import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from models.base import Base
from models import *  # noqa: F401, F403
from db.core import engine
from utils.env import get_env_var
from utils.password import hash_password

DB_SERVER = f"postgresql+psycopg2://{get_env_var('DB_USER')}:{get_env_var('DB_PASSWORD')}@{get_env_var('DB_HOST')}:{get_env_var('DB_PORT')}/"
DB_NAME = get_env_var("DB_NAME")


def create_database():
    """創建資料庫（PostgreSQL 版本）"""
    temp_engine = create_engine(f"{DB_SERVER}postgres", isolation_level="AUTOCOMMIT")
    with temp_engine.connect() as connection:
        # 檢查資料庫是否已存在
        result = connection.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :dbname"),
            {"dbname": DB_NAME}
        )
        if not result.fetchone():
            connection.execute(text(f'CREATE DATABASE "{DB_NAME}"'))
            print(f"Database '{DB_NAME}' created successfully.")
        else:
            print(f"Database '{DB_NAME}' already exists.")
    temp_engine.dispose()


def create_tables():
    """建立尚未存在的資料表，不影響既有資料表與資料。"""
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        # create_all 不會更新既有資料表，這裡補上查核點狀態欄位以支援舊資料庫。
        connection.execute(text(
            """
            ALTER TABLE project_checkpoint_item
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT '尚未開始'
            """
        ))
    print("Tables created successfully.")


def init_db():
    """初始化資料庫"""
    create_database()
    create_tables()


def create_company_data_template():
    """新增公司資料模板"""
    company = Company(
        name="公司中文名稱",
        name_en="公司英文名稱",
        logo="公司Logo路徑"
    )
    return company


def create_default_company(session: Session):
    """建立預設公司資料；已存在時不重複新增。"""
    company_data = create_company_data_template()
    exists = session.query(Company).filter(Company.name == company_data.name).first()
    if exists:
        return exists
    session.add(company_data)
    return company_data


DEFAULT_ROLES = [
    {
        "role_key": "super",
        "role_name": "超級使用者",
        "scope_type": "all",
        "can_define_permissions": True,
        "description": "系統最高權限角色，可定義新權限與管理全系統",
    },
    {
        "role_key": "boss",
        "role_name": "Boss 管理員",
        "scope_type": "all",
        "can_define_permissions": False,
        "description": "全系統可看可編輯，但不可定義新權限",
    },
    {
        "role_key": "pm_leader",
        "role_name": "PM Leader",
        "scope_type": "department",
        "can_define_permissions": False,
        "description": "可管理 PM 部門資料與封存 PM 週報",
    },
    {
        "role_key": "pm_user",
        "role_name": "PM User",
        "scope_type": "own",
        "can_define_permissions": False,
        "description": "只能查看與編輯自己負責的 PM 資料",
    },
    {
        "role_key": "rd_leader",
        "role_name": "RD Leader",
        "scope_type": "department",
        "can_define_permissions": False,
        "description": "可管理 RD 部門資料與封存 RD 週報",
    },
    {
        "role_key": "rd_user",
        "role_name": "RD User",
        "scope_type": "own",
        "can_define_permissions": False,
        "description": "只能查看與編輯自己負責的 RD 資料",
    },
]


DEFAULT_USERS = [
    {
        "account": "admin",
        "password": "admin",
        "name": "系統超級管理員",
        "email": "admin@example.com",
        "role_key": "super",
        "job_title": "系統超級管理員",
    },
    {
        "account": "bbb",
        "password": "bbb",
        "name": "Boss 管理員",
        "email": "bbb@example.com",
        "role_key": "boss",
        "job_title": "Boss 管理員",
    },
    {
        "account": "PPP",
        "password": "PPP",
        "name": "PM Leader",
        "email": "PPP@example.com",
        "role_key": "pm_leader",
        "job_title": "PM Leader",
    },
    {
        "account": "ppp",
        "password": "ppp",
        "name": "PM User",
        "email": "ppp@example.com",
        "role_key": "pm_user",
        "job_title": "PM User",
    },
    {
        "account": "RRR",
        "password": "RRR",
        "name": "RD Leader",
        "email": "RRR@example.com",
        "role_key": "rd_leader",
        "job_title": "RD Leader",
    },
    {
        "account": "rrr",
        "password": "rrr",
        "name": "RD User",
        "email": "rrr@example.com",
        "role_key": "rd_user",
        "job_title": "RD User",
    },
]

DEFAULT_PROJECT_STATUSES = [
    "未成案",
    "未過案",
    "撤案",
    "尚未開始",
    "進行中",
    "已完成",
    "已結案",
]

DEFAULT_PROJECT_ITEM_STATUSES = {
    "todo": ["尚未開始", "進行中", "已完成"],
    "schedule": ["尚未開始", "進行中", "已完成"],
    "checkpoint": ["尚未開始", "進行中", "已完成"],
}


def get_or_create_role(session: Session, role_data: dict) -> Role:
    """取得或建立預設角色。"""
    role = session.query(Role).filter_by(role_key=role_data["role_key"]).first()
    if role is None:
        role = Role(**role_data)
        session.add(role)
        session.flush()
    return role


def get_or_create_user(session: Session, user_data: dict) -> User:
    """取得或建立預設使用者。"""
    user = session.query(User).filter_by(account=user_data["account"]).first()
    if user is None:
        user = User(
            account=user_data["account"],
            password=hash_password(user_data["password"]),
            name=user_data["name"],
            email=user_data["email"],
            is_active=True,
        )
        session.add(user)
        session.flush()
    return user


def assign_user_role(session: Session, user: User, role: Role, job_title: str):
    """建立使用者與角色的指派關係。"""
    user_role = (
        session.query(UserRole)
        .filter_by(user_id=user.id, role_id=role.id)
        .first()
    )
    if user_role is None:
        session.add(
            UserRole(
                user_id=user.id,
                role_id=role.id,
                job_title=job_title,
                assigned_by=user.id,
            )
        )


def create_default_project_options(session: Session):
    """建立預設專案主表與子項目狀態選項。"""
    existing_statuses = {
        item.value
        for item in session.query(ProjectOption)
        .filter(
            ProjectOption.option_type == "status",
            ProjectOption.is_active == 1,
        )
        .all()
    }

    for idx, status in enumerate(DEFAULT_PROJECT_STATUSES):
        if status in existing_statuses:
            continue
        session.add(
            ProjectOption(
                option_type="status",
                value=status,
                sort_order=idx,
                is_active=1,
            )
        )

    for item_type, statuses in DEFAULT_PROJECT_ITEM_STATUSES.items():
        existing_item_statuses = {
            item.value
            for item in session.query(ProjectItemStatusOption)
            .filter(
                ProjectItemStatusOption.item_type == item_type,
                ProjectItemStatusOption.is_active == 1,
            )
            .all()
        }

        for idx, status in enumerate(statuses):
            if status in existing_item_statuses:
                continue
            session.add(
                ProjectItemStatusOption(
                    item_type=item_type,
                    value=status,
                    sort_order=idx,
                    is_active=1,
                )
            )


def create_default_accounts(session: Session):
    """建立預設角色、測試帳號與角色指派。"""
    role_map = {
        role_data["role_key"]: get_or_create_role(session, role_data)
        for role_data in DEFAULT_ROLES
    }

    for user_data in DEFAULT_USERS:
        user = get_or_create_user(session, user_data)
        assign_user_role(
            session,
            user=user,
            role=role_map[user_data["role_key"]],
            job_title=user_data["job_title"],
        )


if __name__ == "__main__":
    init_db()
    print("Database and tables initialized successfully.")

    # 創建一個新的資料庫會話
    with Session(engine) as session:
        # 新增公司資料模板
        create_default_company(session)
        create_default_project_options(session)
        create_default_accounts(session)
        session.commit()
        print("Company data template created successfully.")
        print("Default project options created successfully.")
        print("Default accounts created successfully.")
