from pydantic import BaseModel
from datetime import datetime
from typing import Optional

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