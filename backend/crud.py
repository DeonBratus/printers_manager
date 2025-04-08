from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
import models
import schemas

# Printer CRUD
def format_hours_to_hhmm(hours: float) -> str:
    """Конвертирует часы в формат HH:mm"""
    total_minutes = int(hours * 60)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours:02d}:{minutes:02d}"

def create_printer(db: Session, printer: schemas.PrinterCreate):
    db_printer = models.Printer(**printer.dict())
    db.add(db_printer)
    db.commit()
    db.refresh(db_printer)
    return db_printer

def get_printer(db: Session, printer_id: int):
    printer = db.query(models.Printer).filter(models.Printer.id == printer_id).first()
    # if printer:
    #     printer.total_downtime = format_hours_to_hhmm(printer.total_downtime)
    return printer

def get_printers(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False):
    query = db.query(models.Printer)
    
    if sort_by:
        if hasattr(models.Printer, sort_by):
            order_by = desc(getattr(models.Printer, sort_by)) if sort_desc else getattr(models.Printer, sort_by)
            query = query.order_by(order_by)
    
    printers = query.offset(skip).limit(limit).all()
    for printer in printers:
        printer.id = str(printer.id)
    return printers

def update_printer(db: Session, printer_id: int, printer: schemas.PrinterCreate):
    db_printer = db.query(models.Printer).filter(models.Printer.id == printer_id).first()
    if db_printer:
        for key, value in printer.dict().items():
            setattr(db_printer, key, value)
        db.commit()
        db.refresh(db_printer)
    return db_printer

def delete_printer(db: Session, printer_id: int):
    db_printer = db.query(models.Printer).filter(models.Printer.id == printer_id).first()
    if db_printer:
        db.delete(db_printer)
        db.commit()
    return db_printer

# Model CRUD
def create_model(db: Session, model: schemas.ModelCreate):
    db_model = models.Model(**model.dict())
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model

def get_model(db: Session, model_id: int):
    return db.query(models.Model).filter(models.Model.id == model_id).first()

def get_models(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False):
    query = db.query(models.Model)
    
    if sort_by:
        if hasattr(models.Model, sort_by):
            order_by = desc(getattr(models.Model, sort_by)) if sort_desc else getattr(models.Model, sort_by)
            query = query.order_by(order_by)
    
    return query.offset(skip).limit(limit).all()

def update_model(db: Session, model_id: int, model: schemas.ModelCreate):
    db_model = db.query(models.Model).filter(models.Model.id == model_id).first()
    if db_model:
        for key, value in model.dict().items():
            setattr(db_model, key, value)
        db.commit()
        db.refresh(db_model)
    return db_model

def delete_model(db: Session, model_id: int):
    db_model = db.query(models.Model).filter(models.Model.id == model_id).first()
    if db_model:
        db.delete(db_model)
        db.commit()
    return db_model

# Printing CRUD
def create_printing(db: Session, printing: schemas.PrintingCreate):
    try:
        printer = get_printer(db, printing.printer_id)
        model = get_model(db, printing.model_id)
        
        if not printer or not model:
            return None
            
        # Создаем запись о печати
        db_printing = models.Printing(
            printer_id=printing.printer_id,
            model_id=printing.model_id,
            printing_time=printing.printing_time,
            start_time=printing.start_time,
            calculated_time_stop=printing.calculated_time_stop
            # status будет установлен автоматически в значение по умолчанию
        )
        
        # Обновляем статус принтера
        printer.status = "printing"
        
        db.add(db_printing)
        db.commit()
        db.refresh(db_printing)
        
        # Добавляем дополнительные поля для ответа
        db_printing.printer_name = printer.name
        db_printing.model_name = model.name
        db_printing.progress = 0
        
        return db_printing
    except Exception as e:
        db.rollback()
        print(f"Error in create_printing: {str(e)}")
        raise

def get_printing(db: Session, printing_id: int):
    return db.query(models.Printing).filter(models.Printing.id == printing_id).first()

def get_printing_with_details(db: Session, printing_id: int):
    printing = db.query(models.Printing).filter(models.Printing.id == printing_id).first()
    if printing:
        # Вычисляем прогресс
        if not printing.real_time_stop:
            if printing.calculated_time_stop and printing.start_time:
                total_time = (printing.calculated_time_stop - printing.start_time).total_seconds()
                elapsed_time = (datetime.now() - printing.start_time).total_seconds()
                printing.progress = min(100, (elapsed_time / total_time) * 100)
            else:
                # Если нет calculated_time_stop, используем printing_time
                elapsed_time = (datetime.now() - printing.start_time).total_seconds()
                total_time = printing.printing_time * 3600  # переводим часы в секунды
                printing.progress = min(100, (elapsed_time / total_time) * 100)
        else:
            printing.progress = 100
            
        # Добавляем имена принтера и модели
        printer = get_printer(db, printing.printer_id) if printing.printer_id else None
        model = get_model(db, printing.model_id) if printing.model_id else None
        printing.printer_name = printer.name if printer else "Unknown Printer"
        printing.model_name = model.name if model else "Unknown Model"
        
        # Добавляем статус
        if printing.real_time_stop:
            printing.status = "completed"
        elif hasattr(printer, 'status'):
            printing.status = printer.status
        else:
            printing.status = "printing"
            
    return printing

def get_printings(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False):
    query = db.query(models.Printing)
    
    if sort_by:
        if hasattr(models.Printing, sort_by):
            order_by = desc(getattr(models.Printing, sort_by)) if sort_desc else getattr(models.Printing, sort_by)
            query = query.order_by(order_by)
    
    printings = query.offset(skip).limit(limit).all()
    return [get_printing_with_details(db, p.id) for p in printings]

def update_printing(db: Session, printing_id: int, printing: schemas.PrintingCreate):
    db_printing = db.query(models.Printing).filter(models.Printing.id == printing_id).first()
    if db_printing:
        for key, value in printing.dict().items():
            setattr(db_printing, key, value)
        db.commit()
        db.refresh(db_printing)
    return db_printing

def delete_printing(db: Session, printing_id: int):
    db_printing = db.query(models.Printing).filter(models.Printing.id == printing_id).first()
    if db_printing:
        db.delete(db_printing)
        db.commit()
    return db_printing