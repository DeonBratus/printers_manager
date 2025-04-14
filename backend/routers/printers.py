from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db
from schemas import PrinterCreate, Printer, Printing, PrintingCreate
from crud import (
    create_printer, get_printer, get_printers, 
    update_printer, delete_printer
)
from printer_control import calculate_printer_downtime
from models import Model, Printer as PrinterModel
from sqlalchemy.exc import IntegrityError

router = APIRouter(
    prefix="/printers",
    tags=["printers"]
)

@router.post("/", response_model=Printer)
def create_new_printer(printer: PrinterCreate, db: Session = Depends(get_db)):
    try:
        # Create or get existing printer
        result = create_printer(db, printer)
        # If result is a list (from old code), take the first item
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        return result
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[Printer])
def read_printers(
    skip: int = 0, 
    limit: int = 100, 
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    db: Session = Depends(get_db)
):
    try:
        printers = get_printers(db, skip=skip, limit=limit, sort_by=sort_by, sort_desc=sort_desc)
        return printers
    except Exception as e:
        print(f"Error in read_printers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{printer_id}", response_model=Printer)
def read_printer(printer_id: int, db: Session = Depends(get_db)):
    try:
        # Convert printer_id to int in case it's coming as a string
        printer_id = int(printer_id)
        db_printer = get_printer(db, printer_id=printer_id)
        if db_printer is None:
            raise HTTPException(status_code=404, detail="Printer not found")
        return db_printer
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid printer ID format")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in read_printer: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

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
    try:
        printer = get_printer(db, printer_id)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        
        if printer.status not in ["paused", "waiting"]:
            raise HTTPException(status_code=400, detail="Printer is not in paused or waiting state")
        
        # Find current printing
        current_printing = db.query(Printing).filter(
            Printing.printer_id == printer_id,
            Printing.real_time_stop == None
        ).first()
        
        if current_printing:
            if current_printing.status == "paused":
                current_printing.status = "printing"
                current_printing.pause_time = None
                db.add(current_printing)
        
        printer.status = "printing"
        db.add(printer)
        db.commit()
        db.refresh(printer)
        return printer
    except Exception as e:
        print(f"Error in resume_printer: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/{printing_id}/confirm", response_model=Printing)
def confirm_printing(printing_id: int, db: Session = Depends(get_db)):
    try:
        printing = db.query(models.Printing).filter(models.Printing.id == printing_id).first()
        if not printing:
            raise HTTPException(status_code=404, detail="Printing not found")
        
        # Logic to confirm the print job
        printing.status = "confirmed"  # Update status
        db.commit()
        db.refresh(printing)
        
        return printing
    except Exception as e:
        print(f"Error confirming print job: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{printer_id}/start", response_model=Printer)
def start_printer(printer_id: int, printing_data: PrintingCreate, db: Session = Depends(get_db)):
    """Начать печать на принтере"""
    try:
        # Check if printer exists
        printer = get_printer(db, printer_id)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        
        # Check if printer is available
        if printer.status != "idle":
            raise HTTPException(status_code=400, detail=f"Printer is not idle, current status: {printer.status}")
        
        # Check if model exists
        model = db.query(Model).filter(Model.id == printing_data.model_id).first()
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        # Create new printing record
        new_printing = Printing(
            printer_id=printer_id,
            model_id=printing_data.model_id,
            model_name=model.name,
            status="printing",
            start_time=datetime.now(),
            progress=0,
            printing_time=model.printing_time
        )
        
        # Calculate expected end time based on model printing time
        new_printing.calculated_time_stop = new_printing.start_time + timedelta(seconds=model.printing_time)
        
        # Update printer status
        printer.status = "printing"
        
        db.add(new_printing)
        db.add(printer)
        db.commit()
        db.refresh(printer)
        
        return printer
    except Exception as e:
        print(f"Error in start_printer: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/{printer_id}/pause", response_model=Printer)
def pause_printer(printer_id: int, db: Session = Depends(get_db)):
    """Приостановить работу принтера"""
    try:
        printer = get_printer(db, printer_id)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        
        if printer.status != "printing":
            raise HTTPException(status_code=400, detail=f"Printer is not printing, current status: {printer.status}")
        
        # Find current printing
        current_printing = db.query(Printing).filter(
            Printing.printer_id == printer_id,
            Printing.status == "printing",
            Printing.real_time_stop == None
        ).first()
        
        if current_printing:
            current_printing.status = "paused"
            current_printing.pause_time = datetime.now()
            db.add(current_printing)
        
        printer.status = "paused"
        db.add(printer)
        db.commit()
        db.refresh(printer)
        
        return printer
    except Exception as e:
        print(f"Error in pause_printer: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/{printer_id}/stop", response_model=Printer)
def stop_printer(printer_id: int, data: dict = {}, db: Session = Depends(get_db)):
    """Остановить работу принтера"""
    try:
        printer = get_printer(db, printer_id)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        
        if printer.status not in ["printing", "paused"]:
            raise HTTPException(status_code=400, detail=f"Printer is not printing or paused, current status: {printer.status}")
        
        # Find current printing
        current_printing = db.query(Printing).filter(
            Printing.printer_id == printer_id,
            Printing.status.in_(["printing", "paused"]),
            Printing.real_time_stop == None
        ).first()
        
        if not current_printing:
            raise HTTPException(status_code=404, detail="No active printing found for this printer")
        
        # Set status based on the reason
        reason = data.get("reason", "other")
        is_success = reason in ["finished", "finished-early"]
        
        # Record the stop time and update status
        current_time = datetime.now()
        current_printing.real_time_stop = current_time
        current_printing.status = "completed" if is_success else "cancelled"
        current_printing.stop_reason = reason
        
        # Calculate actual print time for statistics if successful
        if is_success:
            actual_printing_time = (current_time - current_printing.start_time).total_seconds()
            # Subtract any pause time
            if current_printing.downtime:
                actual_printing_time -= current_printing.downtime * 3600
            printer.total_print_time = (printer.total_print_time or 0) + actual_printing_time / 3600
        
        # If print was successful, mark as waiting for confirmation
        # Otherwise mark as idle
        printer.status = "waiting" if is_success else "idle"
        
        db.add(printer)
        db.add(current_printing)
        db.commit()
        db.refresh(printer)
        
        return printer
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        print(f"Error in stop_printer: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
