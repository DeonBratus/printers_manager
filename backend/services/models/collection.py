from sqlalchemy.orm import Session
from schemas.collections_schemas import CollectionCreate, CollectionUpdate, CollectionModelLink
from dal import collection as collection_dal
from typing import List, Optional, Dict, Any


class CollectionService:
    """Сервис для работы с коллекциями 3D-моделей"""
    
    @staticmethod
    def create_collection(db: Session, collection: CollectionCreate):
        """Создать новую коллекцию"""
        return collection_dal.create(db, collection)
    
    @staticmethod
    def get_collection(db: Session, collection_id: int):
        """Получить коллекцию по ID"""
        return collection_dal.get(db, collection_id)
    
    @staticmethod
    def get_collections(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_desc: bool = False,
        studio_id: Optional[int] = None,
        parent_id: Optional[int] = None
    ):
        """Получить список коллекций с фильтрацией"""
        return collection_dal.get_all(
            db, skip, limit, sort_by, sort_desc, studio_id, parent_id
        )
    
    @staticmethod
    def update_collection(db: Session, collection_id: int, collection: CollectionUpdate):
        """Обновить коллекцию"""
        # Фильтруем None значения, чтобы не перезаписывать существующие значения
        update_data = {k: v for k, v in collection.dict().items() if v is not None}
        return collection_dal.update(db, collection_id, update_data)
    
    @staticmethod
    def delete_collection(db: Session, collection_id: int):
        """Удалить коллекцию"""
        return collection_dal.delete(db, collection_id)
    
    @staticmethod
    def add_model_to_collection(db: Session, link: CollectionModelLink):
        """Добавить модель в коллекцию"""
        return collection_dal.add_model(db, link.collection_id, link.model_id)
    
    @staticmethod
    def remove_model_from_collection(db: Session, link: CollectionModelLink):
        """Удалить модель из коллекции"""
        return collection_dal.remove_model(db, link.collection_id, link.model_id)
    
    @staticmethod
    def get_collection_models(db: Session, collection_id: int, skip: int = 0, limit: int = 100):
        """Получить список моделей в коллекции"""
        return collection_dal.get_models(db, collection_id, skip, limit)
    
    @staticmethod
    def get_models_count(db: Session, collection_id: int):
        """Получить количество моделей в коллекции"""
        return collection_dal.get_models_count(db, collection_id)
    
    @staticmethod
    def get_collection_tree(db: Session, studio_id: Optional[int] = None, root_only: bool = False):
        """Получить дерево коллекций"""
        return collection_dal.get_collection_tree(db, studio_id, root_only) 