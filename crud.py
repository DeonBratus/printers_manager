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
    # Calculate stop time
    printing_data = printing.dict()
    if printing_data.get("start_time") is None:
        printing_data["start_time"] = datetime.now()
    if printing_data.get("calculated_time_stop") is None:
        printing_data["calculated_time_stop"] = (
            printing_data["start_time"] + 
            timedelta(hours=printing_data["printing_time"])
        )
    
    db_printing = models.Printing(**printing_data)
    db.add(db_printing)
    
    # Update printer status
    printer = db.query(models.Printer).filter(models.Printer.id == printing.printer_id).first()
    if printer:
        printer.status = "printing"
        db.add(printer)
    
    db.commit()
    db.refresh(db_printing)
    return db_printing

def get_printing(db: Session, printing_id: int):
    return db.query(models.Printing).filter(models.Printing.id == printing_id).first()

def get_printings(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Printing).offset(skip).limit(limit).all()

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