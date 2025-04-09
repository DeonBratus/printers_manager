from sqlalchemy.orm import Session
from sqlalchemy import desc
import models
from schemas import PrintingCreate
from datetime import datetime

def create(db: Session, printing_data: dict):
    db_printing = models.Printing(**printing_data)
    db.add(db_printing)
    db.commit()
    db.refresh(db_printing)
    return db_printing

def get(db: Session, printing_id: int):
    return db.query(models.Printing).filter(models.Printing.id == printing_id).first()

def get_all(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False):
    query = db.query(models.Printing)
    if sort_by and hasattr(models.Printing, sort_by):
        order_by = desc(getattr(models.Printing, sort_by)) if sort_desc else getattr(models.Printing, sort_by)
        query = query.order_by(order_by)
    return query.offset(skip).limit(limit).all()

def update(db: Session, printing_id: int, printing_data: dict):
    db_printing = get(db, printing_id)
    if db_printing:
        for key, value in printing_data.items():
            setattr(db_printing, key, value)
        db.commit()
        db.refresh(db_printing)
    return db_printing

def delete(db: Session, printing_id: int):
    db_printing = get(db, printing_id)
    if db_printing:
        db.delete(db_printing)
        db.commit()
    return db_printing
