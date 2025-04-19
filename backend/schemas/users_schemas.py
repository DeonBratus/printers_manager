from datetime import datetime
from typing import Optional, List, Union, Dict, Any
from enum import Enum
from pydantic import BaseModel, EmailStr

from schemas.roles_schemas import UserRole


# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False

class UserCreate(UserBase):
    password: str
    # Начальная студия для пользователя (опционально)
    initial_studio_id: Optional[int] = None
    # Начальная роль в студии (по умолчанию - member)
    initial_role: Optional[UserRole] = UserRole.MEMBER

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None

class UserSettings(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    language: Optional[str] = None
    default_view: Optional[str] = None
    avatar: Optional[str] = None

class UserStudioInfo(BaseModel):
    id: int
    name: str
    role: UserRole

    class Config:
        from_attributes = True

class UserBase(UserBase):
    id: int
    created_at: datetime
    studios: Optional[List[UserStudioInfo]] = []
    avatar: Optional[str] = None
    
    class Config:
        from_attributes = True
