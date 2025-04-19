from pydantic import BaseModel
from typing import Optional


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