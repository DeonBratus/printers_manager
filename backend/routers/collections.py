from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from db.database import get_db
from schemas.collections_schemas import (
    Collection, CollectionCreate, CollectionUpdate, 
    CollectionModelLink, CollectionTree, CollectionSimple
)
from schemas.models_schemas import Model
from services import CollectionService
from auth.auth import get_current_active_user, get_studio_id_from_user
from models import User

router = APIRouter(
    prefix="/collections",
    tags=["collections"]
)


@router.post("/", response_model=Collection)
def create_collection(
    collection: CollectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Создать новую коллекцию"""
    # Устанавливаем studio_id из текущей студии пользователя, если не указан
    if not collection.studio_id:
        collection.studio_id = get_studio_id_from_user(current_user, db)
    
    # Проверяем parent_id, если указан
    if collection.parent_id:
        parent = CollectionService.get_collection(db, collection.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Родительская коллекция не найдена")
        
        # Проверяем, что родительская коллекция принадлежит той же студии
        if parent.studio_id != collection.studio_id:
            raise HTTPException(status_code=400, detail="Родительская коллекция должна принадлежать той же студии")
    
    return CollectionService.create_collection(db, collection)


@router.get("/", response_model=List[Collection])
def read_collections(
    skip: int = 0,
    limit: int = 100,
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    parent_id: Optional[int] = None,
    studio_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получить список коллекций с фильтрацией"""
    # Получаем studio_id, если не указан
    if not current_user.is_superuser:
        studio_id = get_studio_id_from_user(current_user, db, studio_id)
    
    collections = CollectionService.get_collections(
        db, skip, limit, sort_by, sort_desc, studio_id, parent_id
    )
    
    # Добавляем количество моделей в каждую коллекцию
    for collection in collections:
        collection.models_count = CollectionService.get_models_count(db, collection.id)
    
    return collections


@router.get("/tree", response_model=List[CollectionTree])
def get_collection_tree(
    studio_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получить дерево коллекций для студии"""
    # Получаем studio_id, если не указан
    if not current_user.is_superuser:
        studio_id = get_studio_id_from_user(current_user, db, studio_id)
    
    tree = CollectionService.get_collection_tree(db, studio_id, True)
    return tree


@router.get("/{collection_id}", response_model=Collection)
def read_collection(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получить коллекцию по ID"""
    collection = CollectionService.get_collection(db, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Коллекция не найдена")
    
    # Проверяем доступ
    if not current_user.is_superuser:
        user_studio_id = get_studio_id_from_user(current_user, db)
        if collection.studio_id != user_studio_id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой коллекции")
    
    # Добавляем количество моделей
    collection.models_count = CollectionService.get_models_count(db, collection_id)
    
    return collection


@router.put("/{collection_id}", response_model=Collection)
def update_collection(
    collection_id: int,
    collection: CollectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Обновить коллекцию"""
    db_collection = CollectionService.get_collection(db, collection_id)
    if not db_collection:
        raise HTTPException(status_code=404, detail="Коллекция не найдена")
    
    # Проверяем доступ
    if not current_user.is_superuser:
        user_studio_id = get_studio_id_from_user(current_user, db)
        if db_collection.studio_id != user_studio_id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой коллекции")
    
    # Проверяем parent_id, если указан
    if collection.parent_id and collection.parent_id != db_collection.parent_id:
        # Проверяем, не создается ли цикл (коллекция не может быть родителем сама себе)
        if collection.parent_id == collection_id:
            raise HTTPException(status_code=400, detail="Коллекция не может быть родителем сама себе")
        
        parent = CollectionService.get_collection(db, collection.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Родительская коллекция не найдена")
        
        # Проверяем, что родительская коллекция принадлежит той же студии
        if parent.studio_id != db_collection.studio_id:
            raise HTTPException(status_code=400, detail="Родительская коллекция должна принадлежать той же студии")
        
        # Проверяем, что новый родитель не является дочерней коллекцией текущей
        # (нужна рекурсивная проверка всего дерева)
        def is_descendant(parent_id, child_id):
            """Рекурсивная проверка, является ли child потомком parent"""
            if parent_id == child_id:
                return True
                
            children = db.query(Collection).filter(Collection.parent_id == child_id).all()
            for child in children:
                if is_descendant(parent_id, child.id):
                    return True
            
            return False
        
        if is_descendant(collection_id, collection.parent_id):
            raise HTTPException(
                status_code=400, 
                detail="Циклическая зависимость: нельзя установить дочернюю коллекцию как родительскую"
            )
    
    updated_collection = CollectionService.update_collection(db, collection_id, collection)
    
    # Добавляем количество моделей
    updated_collection.models_count = CollectionService.get_models_count(db, collection_id)
    
    return updated_collection


@router.delete("/{collection_id}", response_model=Collection)
def delete_collection(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Удалить коллекцию"""
    db_collection = CollectionService.get_collection(db, collection_id)
    if not db_collection:
        raise HTTPException(status_code=404, detail="Коллекция не найдена")
    
    # Проверяем доступ
    if not current_user.is_superuser:
        user_studio_id = get_studio_id_from_user(current_user, db)
        if db_collection.studio_id != user_studio_id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой коллекции")
    
    deleted_collection = CollectionService.delete_collection(db, collection_id)
    return deleted_collection


@router.post("/{collection_id}/models/{model_id}", response_model=Collection)
def add_model_to_collection(
    collection_id: int,
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Добавить модель в коллекцию"""
    db_collection = CollectionService.get_collection(db, collection_id)
    if not db_collection:
        raise HTTPException(status_code=404, detail="Коллекция не найдена")
    
    # Проверяем доступ
    if not current_user.is_superuser:
        user_studio_id = get_studio_id_from_user(current_user, db)
        if db_collection.studio_id != user_studio_id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой коллекции")
    
    link = CollectionModelLink(collection_id=collection_id, model_id=model_id)
    updated_collection = CollectionService.add_model_to_collection(db, link)
    
    if not updated_collection:
        raise HTTPException(status_code=404, detail="Модель не найдена или не может быть добавлена")
    
    # Добавляем количество моделей
    updated_collection.models_count = CollectionService.get_models_count(db, collection_id)
    
    return updated_collection


@router.delete("/{collection_id}/models/{model_id}", response_model=Collection)
def remove_model_from_collection(
    collection_id: int,
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Удалить модель из коллекции"""
    db_collection = CollectionService.get_collection(db, collection_id)
    if not db_collection:
        raise HTTPException(status_code=404, detail="Коллекция не найдена")
    
    # Проверяем доступ
    if not current_user.is_superuser:
        user_studio_id = get_studio_id_from_user(current_user, db)
        if db_collection.studio_id != user_studio_id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой коллекции")
    
    link = CollectionModelLink(collection_id=collection_id, model_id=model_id)
    updated_collection = CollectionService.remove_model_from_collection(db, link)
    
    if not updated_collection:
        raise HTTPException(status_code=404, detail="Модель не найдена или не может быть удалена")
    
    # Добавляем количество моделей
    updated_collection.models_count = CollectionService.get_models_count(db, collection_id)
    
    return updated_collection


@router.get("/{collection_id}/models", response_model=List[Model])
def get_collection_models(
    collection_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получить список моделей в коллекции"""
    db_collection = CollectionService.get_collection(db, collection_id)
    if not db_collection:
        raise HTTPException(status_code=404, detail="Коллекция не найдена")
    
    # Проверяем доступ
    if not current_user.is_superuser:
        user_studio_id = get_studio_id_from_user(current_user, db)
        if db_collection.studio_id != user_studio_id:
            raise HTTPException(status_code=403, detail="Нет доступа к этой коллекции")
    
    models = CollectionService.get_collection_models(db, collection_id, skip, limit)
    return models 