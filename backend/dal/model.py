from sqlalchemy.orm import Session
from sqlalchemy import desc
from models import Model
from schemas.models_schemas import ModelCreate

def create(db: Session, model: ModelCreate):
    db_model = Model(**model.dict())
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model

def get(db: Session, model_id: int):
    return db.query(Model).filter(Model.id == model_id).first()

def get_all(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False, studio_id: int = None):
    query = db.query(Model)
    
    # Filter by studio_id if provided
    if studio_id is not None:
        query = query.filter(Model.studio_id == studio_id)
        
    if sort_by and hasattr(Model, sort_by):
        order_by = desc(getattr(Model, sort_by)) if sort_desc else getattr(Model, sort_by)
        query = query.order_by(order_by)
    return query.offset(skip).limit(limit).all()

def update(db: Session, model_id: int, model_data: dict):
    db_model = get(db, model_id)
    if db_model:
        for key, value in model_data.items():
            setattr(db_model, key, value)
        db.commit()
        db.refresh(db_model)
    return db_model

def delete(db: Session, model_id: int):
    db_model = get(db, model_id)
    if db_model:
        db.delete(db_model)
        db.commit()
    return db_model
