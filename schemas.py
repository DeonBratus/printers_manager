from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PrinterBase(BaseModel):
    name: str
    status: Optional[str] = "idle"
    total_print_time: Optional[float] = 0.0
    total_downtime: Optional[float] = 0.0

class PrinterCreate(PrinterBase):
    pass

class Printer(PrinterBase):
    id: int
    
    class Config:
        orm_mode = True

class ModelBase(BaseModel):
    name: str
    printing_time: float

class ModelCreate(ModelBase):
    pass

class Model(ModelBase):
    id: int
    
    class Config:
        orm_mode = True

class PrintingBase(BaseModel):
    start_time: Optional[datetime] = None
    printing_time: float
    calculated_time_stop: Optional[datetime] = None
    real_time_stop: Optional[datetime] = None
    downtime: Optional[float] = 0.0
    printer_id: int
    model_id: int

class PrintingCreate(PrintingBase):
    pass

class Printing(PrintingBase):
    id: int
    
    class Config:
        orm_mode = True