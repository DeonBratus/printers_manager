from pydantic import BaseModel
from enum import Enum


# Определение ролей пользователей в студии
class UserRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"
    VIEWER = "viewer"

# Определение разрешений для ролей
class StudioPermission(str, Enum):
    MANAGE_USERS = "manage_users"
    MANAGE_PRINTERS = "manage_printers"
    MANAGE_MODELS = "manage_models"
    MANAGE_PRINTINGS = "manage_printings"
    VIEW_REPORTS = "view_reports"
    EDIT_STUDIO_SETTINGS = "edit_studio_settings"

# Role permission schemas
class RolePermissionCreate(BaseModel):
    role: UserRole
    permission: StudioPermission
    studio_id: int

class RolePermission(BaseModel):
    role: UserRole
    permission: StudioPermission
    studio_id: int

    class Config:
        from_attributes = True
