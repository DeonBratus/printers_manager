from sqlalchemy.orm import Session
from sqlalchemy import desc
import models
from schemas import ModelCreate

def create(db: Session, model: ModelCreate):
    db_model = models.Model(**model.dict())
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model

def get(db: Session, model_id: int):
    return db.query(models.Model).filter(models.Model.id == model_id).first()

def get_all(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False):
    query = db.query(models.Model)
    if sort_by and hasattr(models.Model, sort_by):
        order_by = desc(getattr(models.Model, sort_by)) if sort_desc else getattr(models.Model, sort_by)
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
