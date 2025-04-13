from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PrinterBase(BaseModel):
    name: Optional[str]
    status: Optional[str] = "idle"
    total_print_time: Optional[float] = 0.0
    total_downtime: Optional[float] = 0.0

class PrinterCreate(PrinterBase):
    pass

class Printer(PrinterBase):
    id: Optional[str]
    
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
    printer_id: Optional[int] = None  # Make optional
    model_id: Optional[int] = None    # Make optional
    printing_time: Optional[float] = None
    start_time: Optional[datetime] = None
    calculated_time_stop: Optional[datetime] = None

class PrintingCreate(BaseModel):
    printer_id: int  # Required
    model_id: int    # Required
    printing_time: Optional[float] = None  # Optional
    # Remove id from here

class Printing(PrintingBase):
    id: int
    real_time_stop: Optional[datetime] = None
    downtime: float = 0.0
    printer_name: Optional[str] = None
    model_name: Optional[str] = None
    progress: Optional[float] = 0.0
    status: Optional[str] = "printing"
    pause_time: Optional[datetime] = None
    stop_reason: Optional[str] = None

    class Config:
        orm_mode = True