from sqlalchemy.orm import Session
from sqlalchemy import desc
import models
from schemas import PrinterCreate
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from models import Printer, Printing

def create(db: Session, printer: PrinterCreate):
    # Always create new printer (removed check for existing printer with same name)
    db_printer = models.Printer(
        name=printer.name,
        model=printer.model,
        status=printer.status,
        total_print_time=printer.total_print_time,
        total_downtime=printer.total_downtime,
        studio_id=printer.studio_id
    )
    db.add(db_printer)
    try:
        db.commit()
        db.refresh(db_printer)
        return db_printer
    except IntegrityError as e:
        db.rollback()
        raise e

def get(db: Session, printer_id: int):
    try:
        return db.query(models.Printer).filter(models.Printer.id == printer_id).first()
    except Exception as e:
        print(f"Database error in printer.get: {str(e)}")
        return None

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

def add_parameter(db: Session, printer_id: int, param_name: str, param_value: str):
    # Check if parameter already exists
    existing_param = db.query(models.PrinterParameter).filter(
        models.PrinterParameter.printer_id == printer_id,
        models.PrinterParameter.name == param_name
    ).first()
    
    if existing_param:
        # Update existing parameter
        existing_param.value = param_value
        db.commit()
        db.refresh(existing_param)
        return existing_param
    
    # Create new parameter
    db_param = models.PrinterParameter(
        printer_id=printer_id,
        name=param_name,
        value=param_value
    )
    db.add(db_param)
    db.commit()
    db.refresh(db_param)
    return db_param

def get_parameters(db: Session, printer_id: int):
    return db.query(models.PrinterParameter).filter(
        models.PrinterParameter.printer_id == printer_id
    ).all()

def delete_parameter(db: Session, param_id: int):
    db_param = db.query(models.PrinterParameter).filter(
        models.PrinterParameter.id == param_id
    ).first()
    
    if db_param:
        db.delete(db_param)
        db.commit()
    
    return db_param

def stop_printer(db: Session, printer_id: int, stop_reason: str = None):
    """Stop printer and update current printing"""
    printer = db.query(Printer).filter(Printer.id == printer_id).first()
    if not printer:
        return None
        
    # Find active printing for this printer
    active_printing = db.query(Printing).filter(
        Printing.printer_id == printer_id,
        Printing.status.in_(['printing', 'paused'])
    ).first()

    if active_printing:
        current_time = datetime.now()
        active_printing.status = 'cancelled'
        active_printing.real_time_stop = current_time
        if stop_reason:
            active_printing.stop_reason = stop_reason
        db.add(active_printing)

    # Update printer status
    printer.status = 'idle'
    db.add(printer)
    db.commit()
    db.refresh(printer)
    return printer
