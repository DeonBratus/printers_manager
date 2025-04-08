from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import models
import schemas

# Printer CRUD
def create_printer(db: Session, printer: schemas.PrinterCreate):
    db_printer = models.Printer(**printer.dict())
    db.add(db_printer)
    db.commit()
    db.refresh(db_printer)
    return db_printer

def get_printer(db: Session, printer_id: int):
    return db.query(models.Printer).filter(models.Printer.id == printer_id).first()

def get_printers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Printer).offset(skip).limit(limit).all()

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

def get_models(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Model).offset(skip).limit(limit).all()

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
        printer = get_printer(db, printing.printer_id)
        model = get_model(db, printing.model_id)
        printing.printer_name = printer.name if printer else None
        printing.model_name = model.name if model else None
        
        # Добавляем статус
        if printing.real_time_stop:
            printing.status = "completed"
        elif hasattr(printer, 'status'):
            printing.status = printer.status
        else:
            printing.status = "printing"
            
    return printing

def get_printings(db: Session, skip: int = 0, limit: int = 100):
    printings = db.query(models.Printing).offset(skip).limit(limit).all()
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

# Queue CRUD
def create_queue_item(db: Session, queue_item: schemas.PrintQueueCreate):
    db_queue_item = models.PrintQueue(**queue_item.dict())
    db.add(db_queue_item)
    db.commit()
    db.refresh(db_queue_item)
    return db_queue_item

def get_printer_queue(db: Session, printer_id: int):
    return db.query(models.PrintQueue)\
             .filter(models.PrintQueue.printer_id == printer_id)\
             .filter(models.PrintQueue.status.in_(["queued", "printing"]))\
             .order_by(models.PrintQueue.priority.desc(),
                      models.PrintQueue.created_at.asc())\
             .all()

def get_next_queue_item(db: Session, printer_id: int):
    return db.query(models.PrintQueue)\
             .filter(models.PrintQueue.printer_id == printer_id,
                    models.PrintQueue.status == "queued")\
             .order_by(models.PrintQueue.priority.desc(),
                      models.PrintQueue.created_at.asc())\
             .first()

def update_queue_item_status(db: Session, queue_id: int, status: str):
    db_queue_item = db.query(models.PrintQueue).filter(models.PrintQueue.id == queue_id).first()
    if db_queue_item:
        db_queue_item.status = status
        if status == "printing":
            db_queue_item.start_time = datetime.now()
        elif status in ["completed", "cancelled"]:
            db_queue_item.completed_at = datetime.now()
        db.commit()
        db.refresh(db_queue_item)
    return db_queue_item