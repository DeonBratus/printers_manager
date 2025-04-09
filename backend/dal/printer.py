from sqlalchemy.orm import Session
from sqlalchemy import desc
import models
from schemas import PrinterCreate

def create(db: Session, printer: PrinterCreate):
    db_printer = models.Printer(**printer.dict())
    db.add(db_printer)
    db.commit()
    db.refresh(db_printer)
    return db_printer

def get(db: Session, printer_id: int):
    return db.query(models.Printer).filter(models.Printer.id == printer_id).first()

def get_all(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False):
    query = db.query(models.Printer)
    if sort_by and hasattr(models.Printer, sort_by):
        order_by = desc(getattr(models.Printer, sort_by)) if sort_desc else getattr(models.Printer, sort_by)
        query = query.order_by(order_by)
    return query.offset(skip).limit(limit).all()

def update(db: Session, printer_id: int, printer_data: dict):
    db_printer = get(db, printer_id)
    if db_printer:
        for key, value in printer_data.items():
            setattr(db_printer, key, value)
        db.commit()
        db.refresh(db_printer)
    return db_printer

def delete(db: Session, printer_id: int):
    db_printer = get(db, printer_id)
    if db_printer:
        db.delete(db_printer)
        db.commit()
    return db_printer
