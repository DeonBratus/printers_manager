from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from schemas.users_schemas import UserBase

# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserBase

class TokenData(BaseModel):
    user_id: Optional[int] = None

class LoginRequest(BaseModel):
    username: str
    password: str
