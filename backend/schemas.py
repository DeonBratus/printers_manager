from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Union

class PrinterBase(BaseModel):
    name: Optional[str]
    model: Optional[str] = None  # Printer model, e.g. "Creality Ender 3 V2"
    status: Optional[str] = "idle"
    total_print_time: Optional[float] = 0.0  # в минутах
    total_downtime: Optional[float] = 0.0   # в минутах
    studio_id: Optional[int] = None

class PrinterCreate(PrinterBase):
    pass

class PrinterParameterBase(BaseModel):
    name: str
    value: Optional[str] = None

class PrinterParameterCreate(PrinterParameterBase):
    printer_id: Optional[int] = None

class PrinterParameter(PrinterParameterBase):
    id: int
    printer_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class Printer(PrinterBase):
    id: Union[int, str]
    parameters: Optional[List[PrinterParameter]] = []
    
    class Config:
        from_attributes = True

class ModelBase(BaseModel):
    name: str
    printing_time: float  # в минутах
    studio_id: Optional[int] = None

class ModelCreate(ModelBase):
    pass

class Model(ModelBase):
    id: int
    
    class Config:
        from_attributes = True

class PrintingBase(BaseModel):
    printer_id: Optional[int] = None  # Make optional
    model_id: Optional[int] = None    # Make optional
    printing_time: Optional[float] = None  # в минутах
    start_time: Optional[datetime] = None
    calculated_time_stop: Optional[datetime] = None
    studio_id: Optional[int] = None

class PrintingCreate(BaseModel):
    model_id: int    # Required
    printer_id: Optional[int] = None  # Made optional since it's set in the route
    printing_time: Optional[float] = None  # в минутах
    studio_id: Optional[int] = None
    # Remove id from here

class Printing(PrintingBase):
    id: int
    real_time_stop: Optional[datetime] = None
    downtime: float = 0.0  # в минутах
    printer_name: Optional[str] = None
    model_name: Optional[str] = None
    progress: Optional[float] = 0.0
    status: Optional[str] = "printing"
    pause_time: Optional[datetime] = None
    stop_reason: Optional[str] = None

    class Config:
        from_attributes = True

# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False
    studio_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    studio_id: Optional[int] = None

class User(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Studio schemas
class StudioBase(BaseModel):
    name: str
    description: Optional[str] = None

class StudioCreate(StudioBase):
    pass

class StudioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class Studio(StudioBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: User

class TokenData(BaseModel):
    user_id: Optional[int] = None

class LoginRequest(BaseModel):
    username: str
    password: str