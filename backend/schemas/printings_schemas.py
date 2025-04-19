from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PrintingBase(BaseModel):
    printer_id: Optional[int] = None  # Make optional
    model_id: Optional[int] = None    # Make optional
    printing_time: Optional[float] = None  # в минутах
    start_time: Optional[datetime] = None
    calculated_time_stop: Optional[datetime] = None
    studio_id: Optional[int] = None


class PrintingCreate(BaseModel):
    
    model_id: int    # Required
    printer_id: Optional[int] = None  
    printing_time: Optional[float] = None # MINS
    studio_id: Optional[int] = None


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