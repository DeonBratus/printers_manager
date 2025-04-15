from sqlalchemy.orm import Session
from sqlalchemy import desc
import models
from schemas import PrinterCreate
from sqlalchemy.exc import IntegrityError

def create(db: Session, printer: PrinterCreate):
    # Check if printer with this name already exists
    existing_printer = db.query(models.Printer).filter(models.Printer.name == printer.name).first()
    if existing_printer:
        return existing_printer
        
    # If not exists, create new printer
    db_printer = models.Printer(
        name=printer.name,
        model=printer.model,
        status=printer.status,
        total_print_time=printer.total_print_time,
        total_downtime=printer.total_downtime
    )
    db.add(db_printer)
    try:
        db.commit()
        db.refresh(db_printer)
        return db_printer
    except IntegrityError:
        db.rollback()
        # Handle race condition where printer was created between our check and insert
        existing_printer = db.query(models.Printer).filter(models.Printer.name == printer.name).first()
        if existing_printer:
            return existing_printer
        raise

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
