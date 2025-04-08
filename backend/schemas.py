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
    printer_id: int
    model_id: int
    printing_time: Optional[float] = None
    start_time: Optional[datetime] = None
    calculated_time_stop: Optional[datetime] = None

class PrintingCreate(PrintingBase):
    pass

class Printing(PrintingBase):
    id: int
    real_time_stop: Optional[datetime] = None
    downtime: Optional[float] = 0.0
    printer_name: Optional[str] = None  # Добавляем имя принтера
    model_name: Optional[str] = None    # Добавляем имя модели
    progress: Optional[float] = 0.0     # Добавляем прогресс
    status: Optional[str] = "printing"  # Добавляем статус
    pause_time: Optional[datetime] = None  # Добавляем время паузы
    downtime: float = 0  # Обновляем время простоя

    class Config:
        orm_mode = True

class PrintQueueBase(BaseModel):
    printer_id: int
    model_id: int
    quantity: int = 1
    priority: int = 0

class PrintQueueCreate(PrintQueueBase):
    pass

class PrintQueue(PrintQueueBase):
    id: int
    status: str
    created_at: datetime
    start_time: Optional[datetime]
    completed_at: Optional[datetime]
    printer_name: Optional[str]
    model_name: Optional[str]

    class Config:
        orm_mode = True