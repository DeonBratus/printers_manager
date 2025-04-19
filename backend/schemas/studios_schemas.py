from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

from schemas.roles_schemas import UserRole

# Studio schemas
class StudioBase(BaseModel):
    name: str
    description: Optional[str] = None

class StudioCreate(StudioBase):
    # Опциональный список начальных пользователей
    initial_users: Optional[List[Dict[str, Any]]] = None

class StudioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class StudioUserInfo(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole

    class Config:
        from_attributes = True

class Studio(StudioBase):
    id: int
    created_at: datetime
    users: Optional[List[StudioUserInfo]] = []
    
    class Config:
        from_attributes = True

# User-Studio relationship schemas
class UserStudioBase(BaseModel):
    role: UserRole = UserRole.MEMBER

class UserStudioCreate(UserStudioBase):
    user_id: int
    studio_id: int

class UserStudio(UserStudioBase):
    user_id: int
    studio_id: int
    created_at: datetime

    class Config:
        from_attributes = True



class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"

# Studio invitation schemas
class StudioInvitationBase(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.MEMBER

class StudioInvitationCreate(StudioInvitationBase):
    pass

class StudioInvitationUpdate(BaseModel):
    status: InvitationStatus

class StudioInvitation(StudioInvitationBase):
    id: int
    studio_id: int
    created_by: int
    token: str
    status: InvitationStatus
    created_at: datetime
    expires_at: datetime
    
    # Include related data
    studio_name: Optional[str] = None
    inviter_name: Optional[str] = None
    
    class Config:
        from_attributes = True

# User search result schema
class UserSearchResult(BaseModel):
    id: int
    username: str
    email: EmailStr
    
    class Config:
        from_attributes = True