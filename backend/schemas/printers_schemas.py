from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Union, Dict, Any
from enum import Enum

from schemas.printers_params import PrinterParameter

class PrinterBase(BaseModel):
    name: Optional[str]
    model: Optional[str] = None  # Printer model, e.g. "Creality Ender 3 V2"
    status: Optional[str] = "idle"
    total_print_time: Optional[float] = 0.0  # в минутах
    total_downtime: Optional[float] = 0.0   # в минутах
    studio_id: Optional[int] = None

class PrinterCreate(PrinterBase):
    pass



class BaseSchemaPrinter(PrinterBase):
    id: Union[int, str]
    parameters: Optional[List[PrinterParameter]] = []
    
    class Config:
        from_attributes = True