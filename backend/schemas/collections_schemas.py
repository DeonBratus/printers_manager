from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from models import CollectionType


class CollectionBase(BaseModel):
    """Базовая схема для коллекции"""
    name: str
    description: Optional[str] = None
    collection_type: str = CollectionType.DEFAULT
    parent_id: Optional[int] = None
    studio_id: Optional[int] = None


class CollectionCreate(CollectionBase):
    """Схема для создания новой коллекции"""
    pass


class CollectionUpdate(BaseModel):
    """Схема для обновления коллекции"""
    name: Optional[str] = None
    description: Optional[str] = None
    collection_type: Optional[str] = None
    parent_id: Optional[int] = None


class CollectionModelLink(BaseModel):
    """Схема для связи коллекции с моделью"""
    collection_id: int
    model_id: int


# Простая схема для избежания циклических зависимостей
class CollectionSimple(BaseModel):
    """Упрощенная схема коллекции без рекурсивных полей"""
    id: int
    name: str
    description: Optional[str] = None
    collection_type: str
    parent_id: Optional[int] = None
    studio_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class Collection(CollectionBase):
    """Полная схема коллекции с вложенными коллекциями и моделями"""
    id: int
    created_at: datetime
    children: Optional[List['CollectionSimple']] = []
    parent: Optional['CollectionSimple'] = None
    models_count: Optional[int] = 0
    
    class Config:
        from_attributes = True


class CollectionTree(BaseModel):
    """Схема для представления дерева коллекций"""
    id: int
    name: str
    description: Optional[str] = None
    collection_type: str
    children: Optional[List['CollectionTree']] = []
    models_count: Optional[int] = 0
    
    class Config:
        from_attributes = True 