from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db
from schemas import PrinterCreate, BaseSchemaPrinter, Printing, PrintingCreate
from crud import (
    create_printer, get_printer, get_printers, 
    update_printer, delete_printer
)
from services import printer as printer_service
from printer_control import calculate_printer_downtime
from models import Model, Printer, User
from auth.auth import get_current_active_user, get_studio_id_from_user
from pydantic import BaseModel

router = APIRouter(
    prefix="/printers",
    tags=["printers"]
)

@router.post("/", response_model=BaseSchemaPrinter)
def create_new_printer(
    printer: PrinterCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Set studio_id if not provided
        if not printer.studio_id:
            printer.studio_id = get_studio_id_from_user(current_user, db)
            
        # Create or get existing printer
        result = create_printer(db, printer)
        # If result is a list (from old code), take the first item
        if isinstance(result, list) and len(result) > 0:
            return result[0]
        return result
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[BaseSchemaPrinter])
def read_printers(
    skip: int = 0, 
    limit: int = 100, 
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    studio_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Get printers for this studio
        query = db.query(Printer)
        
        # Filter by studio_id unless user is superuser
        if not current_user.is_superuser:
            # Get the current studio ID from the user's studios using the passed studio_id
            studio_id = get_studio_id_from_user(current_user, db, studio_id)
            query = query.filter(Printer.studio_id == studio_id)  # Changed from BaseSchemaPrinter to Printer
            
        # Apply sorting
        if sort_by:
            sort_col = getattr(Printer, sort_by, None)  # Changed from BaseSchemaPrinter to Printer
            if sort_col:
                query = query.order_by(sort_col.desc() if sort_desc else sort_col.asc())
        
        # Apply pagination
        printers = query.offset(skip).limit(limit).all()
        return printers
    except Exception as e:
        print(f"Error in read_printers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{printer_id}", response_model=BaseSchemaPrinter)
def read_printer(
    printer_id: int, 
    studio_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Convert printer_id to int in case it's coming as a string
        printer_id = int(printer_id)
        db_printer = get_printer(db, printer_id=printer_id)
        if db_printer is None:
            raise HTTPException(status_code=404, detail="Printer not found")
            
        # Check if user has access to this printer
        if not current_user.is_superuser:
            # Get the current studio ID from the user's studios using the passed studio_id
            user_studio_id = get_studio_id_from_user(current_user, db, studio_id)
            if db_printer.studio_id != user_studio_id:
                raise HTTPException(status_code=403, detail="Not authorized to access this printer")
            
        return db_printer
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid printer ID format")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in read_printer: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/{printer_id}", response_model=BaseSchemaPrinter)
def update_existing_printer(
    printer_id: int, 
    printer: PrinterCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if printer exists and user has access
    db_printer = get_printer(db, printer_id=printer_id)
    if db_printer is None:
        raise HTTPException(status_code=404, detail="Printer not found")
        
    # Check permissions
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        if db_printer.studio_id != studio_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this printer")
        
    # Set studio_id to ensure it doesn't change
    printer.studio_id = db_printer.studio_id
    
    db_printer = update_printer(db, printer_id=printer_id, printer=printer)
    return db_printer

@router.delete("/{printer_id}", response_model=BaseSchemaPrinter)
def delete_existing_printer(
    printer_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if printer exists and user has access
    db_printer = get_printer(db, printer_id=printer_id)
    if db_printer is None:
        raise HTTPException(status_code=404, detail="Printer not found")
        
    # Check permissions
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        if db_printer.studio_id != studio_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this printer")
        
    db_printer = delete_printer(db, printer_id=printer_id)
    return db_printer

@router.get("/{printer_id}/downtime")
def get_printer_downtime(
    printer_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение текущего времени простоя принтера"""
    try:
        # Check access
        db_printer = get_printer(db, printer_id=printer_id)
        if db_printer is None:
            raise HTTPException(status_code=404, detail="Printer not found")
            
        # Check permissions
        if not current_user.is_superuser:
            # Get the current studio ID from the user's studios
            studio_id = get_studio_id_from_user(current_user, db)
            if db_printer.studio_id != studio_id:
                raise HTTPException(status_code=403, detail="Not authorized to access this printer")
            
        downtime = calculate_printer_downtime(db, printer_id)
        return {"printer_id": printer_id, "downtime": downtime}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{printer_id}/resume", response_model=BaseSchemaPrinter)
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

@router.post("/{printer_id}/confirm", response_model=BaseSchemaPrinter)
def confirm_printing(printer_id: int, db: Session = Depends(get_db)):
    """Подтверждение завершения печати"""
    try:
        printer = get_printer(db, printer_id)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        
        # Allow confirmation from any state to handle race conditions
        # Printer status might have been changed but the UI still shows it as waiting
        
        # Find the most recent printing that needs confirmation
        current_printing = db.query(Printing).filter(
            Printing.printer_id == printer_id
        ).order_by(Printing.real_time_stop.desc() if Printing.real_time_stop else Printing.start_time.desc()).first()
        
        if not current_printing:
            raise HTTPException(status_code=404, detail="No printings found for this printer")
        
        # Mark as completed
        current_printing.status = "completed"
        
        # Set real_time_stop if it's not already set to ensure cards disappear
        if not current_printing.real_time_stop:
            current_printing.real_time_stop = datetime.now()
        
        # Update printer status to idle
        printer.status = "idle"
        
        # Save changes
        db.add(printer)
        db.add(current_printing)
        db.commit()
        db.refresh(printer)
        
        return printer
    except Exception as e:
        print(f"Error confirming print job: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/{printer_id}/start")
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
            status="printing",
            start_time=datetime.now(),
            printing_time=model.printing_time,
            studio_id=printing_data.studio_id
        )
        
        # Calculate expected end time based on model printing time
        new_printing.calculated_time_stop = new_printing.start_time + timedelta(minutes=model.printing_time)
        
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

@router.post("/{printer_id}/pause", response_model=BaseSchemaPrinter)
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

class StopPrinterRequest(BaseModel):
    stop_reason: Optional[str] = None

@router.post("/{printer_id}/stop")
def stop_printer(
    printer_id: int, 
    stop_data: StopPrinterRequest = Body(...), # Validate request body
    db: Session = Depends(get_db)
):
    """Stop printer and cancel current printing"""
    try:
        printer = printer_service.stop_printer(db, printer_id, stop_data.stop_reason)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        return printer
    except Exception as e:
        db.rollback()
        print(f"Error stopping printer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
