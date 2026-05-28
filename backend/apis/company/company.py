from pydantic import BaseModel, Field
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.core import get_db
from models import Department, Group
from utils.auth import AuthPayload, get_current_user, role_required
from utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(prefix="/company", tags=["Company"])

COMPANY_ADMIN_ROLES = ("super", "boss")

class CompanyInfoUpdate(BaseModel):
    name: Optional[str] = None
    nameEn: Optional[str] = None
    logo: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


def normalize_logo_path(value: str | None) -> str | None:
    logo_path = (value or "").strip()
    if not logo_path:
        return None
    if (
        logo_path.startswith("/")
        or logo_path.startswith("http://")
        or logo_path.startswith("https://")
        or logo_path.startswith("data:")
    ):
        return logo_path
    return f"/{logo_path}"
    
class DepartmentCreate(BaseModel):
    name: str = Field(..., description="部門名稱")
    description: Optional[str] = Field(None, description="部門描述")


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, description="部門名稱")
    description: Optional[str] = Field(None, description="部門描述")


class GroupCreate(BaseModel):
    groupName: str = Field(..., description="群組名稱")


@router.get("/company-info", summary="取得公司資訊")
async def company_info(db: Session = Depends(get_db)):
    """取得公司基本資訊"""
    from models import Company

    company = db.query(Company).order_by(Company.id.asc()).first()
    if company:
        return {
            "status": 0,
            "data": {
                "CompanyName": company.name or "",
                "CompanyNameEn": company.name_en or "",
                "logo": company.logo or "",
            },
        }

    company_info = {
        "CompanyName": "廣思通訊",
        "CompanyNameEn": "Qamstar TECHNOLOGY CO., LTD.",
        "logo": "/logo.png"
    }
    return {"status": 0, "data": company_info}

@router.get("/info", summary="取得公司完整資訊")
async def get_company_info(
    user: AuthPayload = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from models import Company
    company = db.query(Company).order_by(Company.id.asc()).first()
    if not company:
        raise HTTPException(status_code=404, detail={"status": 1, "message": "尚未設定公司資訊"})
    return {
        "status": 0,
        "data": {
            "id": company.id,
            "name": company.name or "",
            "nameEn": company.name_en or "",
            "logo": company.logo or "",
            "phone": company.phone or "",
            "email": company.email or "",
            "address": company.address or "",
        }
    }


@router.patch("/info", summary="更新公司完整資訊")
async def update_company_info(
    data: CompanyInfoUpdate,
    user: AuthPayload = Depends(role_required(*COMPANY_ADMIN_ROLES)),
    db: Session = Depends(get_db),
):
    from models import Company
    company = db.query(Company).order_by(Company.id.asc()).first()
    if not company:
        raise HTTPException(status_code=404, detail={"status": 1, "message": "尚未設定公司資訊"})

    update_data = data.model_dump(exclude_unset=True)
    field_map = {
    "name": "name",
    "nameEn": "name_en",
    "logo": "logo",
    "phone": "phone",
    "email": "email",
    "address": "address",
    }
    for field, value in update_data.items():
        snake = field_map.get(field, field)
        if field == "logo":
            setattr(company, snake, normalize_logo_path(value))
        else:
            setattr(company, snake, (value or "").strip() or None)

    db.commit()
    db.refresh(company)
    return {
        "status": 0,
        "data": {
            "id": company.id,
            "name": company.name or "",
            "nameEn": company.name_en or "",
            "logo": company.logo or "",
            "phone": company.phone or "",
            "email": company.email or "",
            "address": company.address or "",
        }
    }
@router.get("/department", summary="取得所有部門")
async def get_department(
    user: AuthPayload = Depends(role_required(*COMPANY_ADMIN_ROLES)),
    db: Session = Depends(get_db)
):
    """取得所有部門及其群組列表"""
    try:
        result = []
        departments = db.query(Department).all()
        if not departments:
            raise HTTPException(
                status_code=404,
                detail={"status": 1, "message": "沒有部門資料"}
            )
        for dept in departments:
            groups = db.query(Group).filter_by(
                department_id=dept.id).all()
            result.append({
                "id": dept.id,
                "name": dept.name,
                "description": dept.description,
                "groups": [{"id": group.id, "name": group.name} for group in groups]
            })
        return {"status": 0, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"獲取部門失敗: {e}")
        raise HTTPException(
            status_code=500,
            detail={"status": 1, "message": "獲取部門失敗"}
        )


@router.post("/department", summary="新增部門")
async def add_department(
    data: DepartmentCreate,
    user: AuthPayload = Depends(role_required(*COMPANY_ADMIN_ROLES)),
    db: Session = Depends(get_db)
):
    """新增一個部門"""
    try:
        if not data.name:
            raise HTTPException(
                status_code=400,
                detail={"status": 1, "message": "缺少部門名稱"}
            )

        # 檢查部門名稱是否已存在
        existing_department = db.query(
            Department).filter_by(name=data.name).first()
        if existing_department:
            raise HTTPException(
                status_code=409,
                detail={"status": 1, "message": "部門名稱已存在"}
            )

        new_department = Department(
            name=data.name,
            description=data.description,
        )
        db.add(new_department)
        db.commit()

        return {"status": 0}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"新增部門失敗: {e}")
        raise HTTPException(
            status_code=500,
            detail={"status": 1, "message": "新增部門失敗"}
        )


@router.patch("/department/{id}", summary="更新部門")
async def update_department(
    id: int,
    data: DepartmentUpdate,
    user: AuthPayload = Depends(role_required(*COMPANY_ADMIN_ROLES)),
    db: Session = Depends(get_db)
):
    """更新指定部門的資料"""
    try:
        department = db.query(Department).filter_by(id=id).first()
        if not department:
            raise HTTPException(
                status_code=404,
                detail={"status": 1, "message": "部門不存在"}
            )

        update_data = data.model_dump(exclude_unset=True)
        if "name" in update_data:
            department.name = update_data["name"]
        if "description" in update_data:
            department.description = update_data["description"]

        db.commit()
        return {"status": 0}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新部門失敗: {e}")
        raise HTTPException(
            status_code=500,
            detail={"status": 1, "message": "更新部門失敗"}
        )


@router.delete("/department/{id}", summary="刪除部門")
async def delete_department(
    id: int,
    user: AuthPayload = Depends(role_required(*COMPANY_ADMIN_ROLES)),
    db: Session = Depends(get_db)
):
    """刪除指定部門"""
    try:
        department = db.query(Department).filter_by(id=id).first()
        if not department:
            raise HTTPException(
                status_code=404,
                detail={"status": 1, "message": "部門不存在"}
            )

        db.delete(department)
        db.commit()
        return {"status": 0}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"刪除部門失敗: {e}")
        raise HTTPException(
            status_code=500,
            detail={"status": 1, "message": "刪除部門失敗"}
        )


@router.post("/department/{id}/group", summary="新增群組到部門")
async def add_group_to_department(
    id: int,
    data: GroupCreate,
    user: AuthPayload = Depends(role_required(*COMPANY_ADMIN_ROLES)),
    db: Session = Depends(get_db)
):
    """新增一個群組到指定部門"""
    try:
        group_name = data.groupName
        if not group_name:
            raise HTTPException(
                status_code=400,
                detail={"status": 1, "message": "缺少群組名稱"}
            )

        department = db.query(Department).filter_by(id=id).first()
        if not department:
            raise HTTPException(
                status_code=404,
                detail={"status": 1, "message": "部門不存在"}
            )

        new_group = Group(name=group_name, department_id=id)
        db.add(new_group)
        db.commit()
        db.refresh(new_group)

        return {"status": 0, "data": {"id": new_group.id, "name": group_name}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"新增群組失敗: {e}")
        raise HTTPException(
            status_code=500,
            detail={"status": 1, "message": "新增群組失敗"}
        )


@router.delete("/department/{id}/group/{group}", summary="從部門刪除群組")
async def delete_group_from_department(
    id: int,
    group: int,
    user: AuthPayload = Depends(role_required(*COMPANY_ADMIN_ROLES)),
    db: Session = Depends(get_db)
):
    """從指定部門刪除群組"""
    try:
        department = db.query(Department).filter_by(id=id).first()
        if not department:
            raise HTTPException(
                status_code=404,
                detail={"status": 1, "message": "部門不存在"}
            )

        group_to_delete = db.query(Group).filter_by(
            id=group, department_id=id).first()
        if not group_to_delete:
            raise HTTPException(
                status_code=404,
                detail={"status": 1, "message": "群組不存在"}
            )

        db.delete(group_to_delete)
        db.commit()

        return {"status": 0}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"刪除群組失敗: {e}")
        raise HTTPException(
            status_code=500,
            detail={"status": 1, "message": "刪除群組失敗"}
        )
