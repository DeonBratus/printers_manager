from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from database import get_db
from schemas import PrinterCreate, Printer, Printing
from crud import (
    create_printer, get_printer, get_printers, 
    update_printer, delete_printer
)
from printer_control import calculate_printer_downtime

router = APIRouter(
    prefix="/printers",
    tags=["printers"]
)

@router.post("/", response_model=List[Printer])
def create_new_printer(printer: PrinterCreate, db: Session = Depends(get_db)):
    return create_printer(db, printer)

@router.get("/", response_model=List[Printer])
def read_printers(
    skip: int = 0, 
    limit: int = 100, 
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    db: Session = Depends(get_db)
):
    printers = get_printers(db, skip=skip, limit=limit, sort_by=sort_by, sort_desc=sort_desc)
    return printers

@router.get("/{printer_id}", response_model=Printer)
def read_printer(printer_id: int, db: Session = Depends(get_db)):
    db_printer = get_printer(db, printer_id=printer_id)
    if db_printer is None:
        raise HTTPException(status_code=404, detail="Printer not found")
    return db_printer

@router.put("/{printer_id}", response_model=Printer)
def update_existing_printer(printer_id: int, printer: PrinterCreate, db: Session = Depends(get_db)):
    db_printer = update_printer(db, printer_id=printer_id, printer=printer)
    if db_printer is None:
        raise HTTPException(status_code=404, detail="Printer not found")
    return db_printer

@router.delete("/{printer_id}", response_model=Printer)
def delete_existing_printer(printer_id: int, db: Session = Depends(get_db)):
    db_printer = delete_printer(db, printer_id=printer_id)
    if db_printer is None:
        raise HTTPException(status_code=404, detail="Printer not found")
    return db_printer

@router.get("/{printer_id}/downtime")
def get_printer_downtime(printer_id: int, db: Session = Depends(get_db)):
    """Получение текущего времени простоя принтера"""
    try:
        downtime = calculate_printer_downtime(db, printer_id)
        return {"printer_id": printer_id, "downtime": downtime}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{printer_id}/resume", response_model=Printer)
def resume_printer(printer_id: int, db: Session = Depends(get_db)):
    """Возобновление печати на принтере"""
    printer = get_printer(db, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    if printer.status != "waiting":
        raise HTTPException(status_code=400, detail="Printer is not in waiting state")
    
    printer.status = "printing"
    db.add(printer)
    db.commit()
    db.refresh(printer)
    return printer

@router.post("/{printer_id}/confirm", response_model=Printer)
def confirm_printer(printer_id: int, db: Session = Depends(get_db)):
    """Подтверждение завершения печати"""
    printer = get_printer(db, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    if printer.status != "waiting":
        raise HTTPException(status_code=400, detail="Printer is not in waiting state")
    
    # Находим последнюю печать этого принтера
    last_printing = db.query(Printing).filter(
        Printing.printer_id == printer_id,
        Printing.real_time_stop == None
    ).first()
    
    if last_printing:
        current_time = datetime.now()
        last_printing.real_time_stop = current_time
        last_printing.status = "completed"
        actual_printing_time = (current_time - last_printing.start_time).total_seconds() / 3600
        printer.total_print_time += actual_printing_time
        db.add(last_printing)
    
    printer.status = "idle"
    db.add(printer)
    db.commit()
    db.refresh(printer)
    return printer
