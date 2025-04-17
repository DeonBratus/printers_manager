from sqlalchemy.orm import Session
from sqlalchemy import desc
from models import Printing, Printer  # Добавляем импорт модели Printer
from schemas import PrintingCreate
from datetime import datetime
from typing import Optional

def create(db: Session, printing_data: dict):
    db_printing = Printing(**printing_data)
    db.add(db_printing)
    db.commit()
    db.refresh(db_printing)
    return db_printing

def get(db: Session, printing_id: int):
    return db.query(Printing).filter(Printing.id == printing_id).first()

def get_all(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    sort_by: str = None, 
    sort_desc: bool = False,
    studio_id: Optional[int] = None
):
    query = db.query(Printing)
    
    if studio_id is not None:
        # Присоединяем таблицу принтеров и фильтруем по studio_id
        query = query.join(Printer, Printing.printer_id == Printer.id)\
                    .filter(Printer.studio_id == studio_id)
    
    if sort_by and hasattr(Printing, sort_by):
        order_by = desc(getattr(Printing, sort_by)) if sort_desc else getattr(Printing, sort_by)
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

def confirm(db: Session, printing_id: int):
    """Mark printing as confirmed and update related printer"""
    db_printing = get(db, printing_id)
    if db_printing:
        current_time = datetime.now()
        # Update printing
        db_printing.status = "completed"
        if not db_printing.real_time_stop:
            db_printing.real_time_stop = current_time

        # Update associated printer status
        if db_printing.printer_id:
            printer = db.query(Printer).filter(Printer.id == db_printing.printer_id).first()
            if printer:
                printer.status = "idle"
                db.add(printer)

        db.add(db_printing)
        db.commit()
        db.refresh(db_printing)
    return db_printing
