from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Union

class PrinterBase(BaseModel):
    name: Optional[str]
    model: Optional[str] = None  # Printer model, e.g. "Creality Ender 3 V2"
    status: Optional[str] = "idle"
    total_print_time: Optional[float] = 0.0  # в минутах
    total_downtime: Optional[float] = 0.0   # в минутах

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

class PrintingCreate(BaseModel):
    model_id: int    # Required
    printer_id: Optional[int] = None  # Made optional since it's set in the route
    printing_time: Optional[float] = None  # в минутах
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