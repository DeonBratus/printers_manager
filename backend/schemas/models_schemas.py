from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
from models import ModelFileType


class ModelBase(BaseModel):
    name: str
    description: Optional[str] = None
    printing_time: float  # в минутах
    studio_id: Optional[int] = None
    parent_id: Optional[int] = None


class ModelCreate(ModelBase):
    pass


class ModelFileBase(BaseModel):
    filename: str
    file_type: ModelFileType = ModelFileType.STL
    model_id: int
    
    @validator('file_type', pre=True)
    def normalize_file_type(cls, v):
        if isinstance(v, str):
            # Case-insensitive mapping from string to enum
            file_type_map = {
                'stl': ModelFileType.STL,
                'obj': ModelFileType.OBJ,
                'amf': ModelFileType.AMF,
                '3mf': ModelFileType.THREEMF,
                'other': ModelFileType.OTHER
            }
            
            # Try to match case-insensitively
            v_lower = v.lower()
            if v_lower in file_type_map:
                return file_type_map[v_lower]
        return v


class ModelFileCreate(ModelFileBase):
    pass


class ModelFile(ModelFileBase):
    id: int
    file_path: str
    file_size: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class GCodeFileBase(BaseModel):
    filename: str
    model_id: Optional[int] = None
    printer_id: Optional[int] = None
    studio_id: Optional[int] = None
    estimated_print_time: Optional[float] = None


class GCodeFileCreate(GCodeFileBase):
    pass


class GCodeFile(GCodeFileBase):
    id: int
    file_path: str
    file_size: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class Model(ModelBase):
    id: int
    created_at: datetime
    files: Optional[List[ModelFile]] = []
    gcode_files: Optional[List[GCodeFile]] = []
    children: Optional[List["Model"]] = []
    
    class Config:
        from_attributes = True