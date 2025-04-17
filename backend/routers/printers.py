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
import models
from models import Model, Printer as PrinterModel, User
from sqlalchemy.exc import IntegrityError
from auth import get_current_active_user, get_studio_id_from_user

router = APIRouter(
    prefix="/printers",
    tags=["printers"]
)

@router.post("/", response_model=Printer)
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

@router.get("/", response_model=List[Printer])
def read_printers(
    skip: int = 0, 
    limit: int = 100, 
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Get printers for this studio
        query = db.query(models.Printer)
        
        # Filter by studio_id unless user is superuser
        if not current_user.is_superuser:
            # Get the current studio ID from the user's studios
            studio_id = get_studio_id_from_user(current_user, db)
            query = query.filter(models.Printer.studio_id == studio_id)
            
        # Apply sorting
        if sort_by:
            sort_col = getattr(models.Printer, sort_by, None)
            if sort_col:
                query = query.order_by(sort_col.desc() if sort_desc else sort_col.asc())
        
        # Apply pagination
        printers = query.offset(skip).limit(limit).all()
        return printers
    except Exception as e:
        print(f"Error in read_printers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{printer_id}", response_model=Printer)
def read_printer(
    printer_id: int, 
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
            # Get the current studio ID from the user's studios
            studio_id = get_studio_id_from_user(current_user, db)
            if db_printer.studio_id != studio_id:
                raise HTTPException(status_code=403, detail="Not authorized to access this printer")
            
        return db_printer
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid printer ID format")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in read_printer: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/{printer_id}", response_model=Printer)
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

@router.delete("/{printer_id}", response_model=Printer)
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
        current_printing = db.query(models.Printing).filter(
            models.Printing.printer_id == printer_id,
            models.Printing.real_time_stop == None
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

@router.post("/{printer_id}/confirm", response_model=Printer)
def confirm_printing(printer_id: int, db: Session = Depends(get_db)):
    """Подтверждение завершения печати"""
    try:
        printer = get_printer(db, printer_id)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        
        # Allow confirmation from any state to handle race conditions
        # Printer status might have been changed but the UI still shows it as waiting
        
        # Find the most recent printing that needs confirmation
        current_printing = db.query(models.Printing).filter(
            models.Printing.printer_id == printer_id
        ).order_by(models.Printing.real_time_stop.desc() if models.Printing.real_time_stop else models.Printing.start_time.desc()).first()
        
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
        new_printing = models.Printing(
            printer_id=printer_id,
            model_id=printing_data.model_id,
            status="printing",
            start_time=datetime.now(),
            printing_time=model.printing_time
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
        current_printing = db.query(models.Printing).filter(
            models.Printing.printer_id == printer_id,
            models.Printing.status == "printing",
            models.Printing.real_time_stop == None
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
        
        # Allow stopping from various states including idle (e.g., for fixing state conflicts)
        allowed_states = ["printing", "paused", "idle", "waiting", "completed"]
        if printer.status not in allowed_states:
            raise HTTPException(status_code=400, detail=f"Printer cannot be stopped from current status: {printer.status}")
        
        # Find current printing
        current_printing = db.query(models.Printing).filter(
            models.Printing.printer_id == printer_id,
            models.Printing.real_time_stop == None
        ).first()
        
        if not current_printing:
            # Try to find the most recent printing
            current_printing = db.query(models.Printing).filter(
                models.Printing.printer_id == printer_id
            ).order_by(models.Printing.start_time.desc()).first()
            
            if not current_printing:
                raise HTTPException(status_code=404, detail="No printing found for this printer")
                
            # If real_time_stop is already set, this means we're handling a completed job
            if current_printing.real_time_stop is not None:
                current_printing.status = "cancelled"
                current_printing.stop_reason = data.get("reason", "other")
                db.add(current_printing)
                db.commit()
                printer.status = "idle"
                db.add(printer)
                db.commit()
                db.refresh(printer)
                return printer
            # If it's a completed job without real_time_stop, set it now
            elif current_printing.status == "completed":
                current_printing.real_time_stop = datetime.now()
                current_printing.stop_reason = data.get("reason", "other")
                db.add(current_printing)
                db.commit()
                printer.status = "idle"
                db.add(printer)
                db.commit()
                db.refresh(printer)
                return printer
        
        # Set status based on the reason
        reason = data.get("reason", "other")
        is_success = reason in ["finished", "finished-early"]
        
        # Record the stop time and update status
        current_time = datetime.now()
        if current_printing.real_time_stop is None:
            current_printing.real_time_stop = current_time
        current_printing.status = "completed" if is_success else "cancelled"
        current_printing.stop_reason = reason
        
        # Calculate actual print time for statistics if successful
        if is_success and current_printing.start_time:
            actual_printing_time = (current_time - current_printing.start_time).total_seconds() / 60  # в минутах
            # Subtract any pause time
            if current_printing.downtime:
                actual_printing_time -= current_printing.downtime
            printer.total_print_time = (printer.total_print_time or 0) + actual_printing_time
        
        # If print was successful, mark as waiting for confirmation
        # Otherwise mark as idle
        printer.status = "waiting" if is_success else "idle"
        
        # Save changes
        db.add(printer)
        db.add(current_printing)
        db.commit()
        db.refresh(printer)
        
        return printer
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
