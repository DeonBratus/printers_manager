from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from models import Collection, Model, collection_model
from schemas.collections_schemas import CollectionCreate, CollectionUpdate
from typing import List, Optional, Dict, Any


def create(db: Session, collection: CollectionCreate) -> Collection:
    """Создает новую коллекцию"""
    db_collection = Collection(**collection.dict())
    db.add(db_collection)
    db.commit()
    db.refresh(db_collection)
    return db_collection


def get(db: Session, collection_id: int) -> Optional[Collection]:
    """Получает коллекцию по ID"""
    return db.query(Collection).filter(Collection.id == collection_id).first()


def get_all(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    studio_id: Optional[int] = None,
    parent_id: Optional[int] = None
) -> List[Collection]:
    """Получает список коллекций с фильтрами и сортировкой"""
    query = db.query(Collection)
    
    # Фильтр по студии
    if studio_id is not None:
        query = query.filter(Collection.studio_id == studio_id)
    
    # Фильтр по родительской коллекции
    if parent_id is not None:
        # Если parent_id = 0, то показываем корневые коллекции (без родителя)
        if parent_id == 0:
            query = query.filter(Collection.parent_id.is_(None))
        else:
            query = query.filter(Collection.parent_id == parent_id)
    
    # Сортировка
    if sort_by and hasattr(Collection, sort_by):
        order_by = desc(getattr(Collection, sort_by)) if sort_desc else getattr(Collection, sort_by)
        query = query.order_by(order_by)
    else:
        # По умолчанию сортируем по имени
        query = query.order_by(Collection.name)
    
    return query.offset(skip).limit(limit).all()


def update(db: Session, collection_id: int, collection_data: Dict[str, Any]) -> Optional[Collection]:
    """Обновляет коллекцию"""
    db_collection = get(db, collection_id)
    if db_collection:
        # Обновляем только предоставленные поля
        for key, value in collection_data.items():
            if value is not None:  # Обновляем только если значение не None
                setattr(db_collection, key, value)
        db.commit()
        db.refresh(db_collection)
    return db_collection


def delete(db: Session, collection_id: int) -> Optional[Collection]:
    """Удаляет коллекцию"""
    db_collection = get(db, collection_id)
    if db_collection:
        # Проверяем, есть ли дочерние коллекции
        children = db.query(Collection).filter(Collection.parent_id == collection_id).all()
        if children:
            # Для всех дочерних коллекций устанавливаем parent_id в None или переносим их в родительскую
            for child in children:
                child.parent_id = db_collection.parent_id
            db.commit()
        
        # Удаляем связи с моделями (не удаляя сами модели)
        db.execute(collection_model.delete().where(collection_model.c.collection_id == collection_id))
        
        # Удаляем саму коллекцию
        db.delete(db_collection)
        db.commit()
    return db_collection


def add_model(db: Session, collection_id: int, model_id: int) -> Optional[Collection]:
    """Добавляет модель в коллекцию"""
    db_collection = get(db, collection_id)
    db_model = db.query(Model).filter(Model.id == model_id).first()
    
    if not db_collection or not db_model:
        return None
    
    # Проверяем, есть ли уже такая связь
    exists = db.query(collection_model).filter(
        collection_model.c.collection_id == collection_id,
        collection_model.c.model_id == model_id
    ).first()
    
    if not exists:
        # Добавляем связь
        db.execute(
            collection_model.insert().values(
                collection_id=collection_id,
                model_id=model_id
            )
        )
        db.commit()
        db.refresh(db_collection)
    
    return db_collection


def remove_model(db: Session, collection_id: int, model_id: int) -> Optional[Collection]:
    """Удаляет модель из коллекции"""
    db_collection = get(db, collection_id)
    
    if not db_collection:
        return None
    
    # Удаляем связь
    db.execute(
        collection_model.delete().where(
            collection_model.c.collection_id == collection_id,
            collection_model.c.model_id == model_id
        )
    )
    db.commit()
    db.refresh(db_collection)
    
    return db_collection


def get_models(db: Session, collection_id: int, skip: int = 0, limit: int = 100) -> List[Model]:
    """Получает список моделей в коллекции"""
    collection = get(db, collection_id)
    if not collection:
        return []
    
    # Получаем модели из коллекции
    query = db.query(Model).join(
        collection_model,
        Model.id == collection_model.c.model_id
    ).filter(
        collection_model.c.collection_id == collection_id
    )
    
    return query.offset(skip).limit(limit).all()


def get_models_count(db: Session, collection_id: int) -> int:
    """Получает количество моделей в коллекции"""
    count = db.query(func.count(collection_model.c.model_id)).filter(
        collection_model.c.collection_id == collection_id
    ).scalar()
    
    return count or 0


def get_collection_tree(db: Session, studio_id: Optional[int] = None, root_only: bool = False) -> List[Dict[str, Any]]:
    """Получает иерархическое дерево коллекций"""
    # Получаем все коллекции для студии
    query = db.query(Collection)
    if studio_id:
        query = query.filter(Collection.studio_id == studio_id)
    
    all_collections = query.all()
    
    # Создаем словарь для быстрого доступа к коллекциям по ID
    collections_dict = {coll.id: {
        "id": coll.id,
        "name": coll.name,
        "description": coll.description,
        "collection_type": coll.collection_type,
        "children": [],
        "models_count": get_models_count(db, coll.id)
    } for coll in all_collections}
    
    # Строим дерево
    root_collections = []
    
    for coll in all_collections:
        if coll.parent_id is None:
            # Это корневая коллекция
            root_collections.append(collections_dict[coll.id])
        else:
            # Добавляем как дочернюю коллекцию
            if coll.parent_id in collections_dict:
                collections_dict[coll.parent_id]["children"].append(collections_dict[coll.id])
    
    return root_collections if root_only else collections_dict 