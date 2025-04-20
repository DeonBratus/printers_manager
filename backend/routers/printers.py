from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from db.database import get_db
from schemas.printers_schemas import PrinterCreate, BaseSchemaPrinter
from schemas.printings_schemas import Printing as PrintingSchema, PrintingCreate

from services.printers.background_tasks import calculate_printer_downtime
from services import PrinterService, PrintingService, ModelService

from models import Model, Printer, User, Printing
from auth.auth import get_current_active_user, get_studio_id_from_user

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
            
        result = PrinterService.create_printer(db, printer)
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
        result = PrinterService.get_printers(
            db=db,
            studio_id=studio_id,
            skip=skip,
            sort_by=sort_by,
            sort_desc=sort_desc
        )
        studio_id = get_studio_id_from_user(current_user, db, studio_id)
        
        result = db.query(Printer).filter(Printer.studio_id == studio_id)
            
        # Apply sorting
        if sort_by:
            sort_col = getattr(Printer, sort_by, None)  # Changed from BaseSchemaPrinter to Printer
            if sort_col:
                result = result.order_by(sort_col.desc() if sort_desc else sort_col.asc())
        
        # Apply pagination
        printers = result.offset(skip).limit(limit).all()
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
        db_printer = PrinterService.get_printer(db, printer_id=printer_id)
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
    db_printer = PrinterService.get_printer(db, printer_id=printer_id)
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
    
    db_printer = PrinterService.update_printer(db, printer_id=printer_id, printer=printer)
    return db_printer

@router.delete("/{printer_id}", response_model=BaseSchemaPrinter)
def delete_existing_printer(
    printer_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if printer exists and user has access
    db_printer = PrinterService.get_printer(db, printer_id=printer_id)
    if db_printer is None:
        raise HTTPException(status_code=404, detail="Printer not found")
        
    # Check permissions
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        if db_printer.studio_id != studio_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this printer")
        
    db_printer = PrinterService.delete_printer(db, printer_id=printer_id)
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
        db_printer = PrinterService.get_printer(db, printer_id=printer_id)
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
        printer = PrinterService.get_printer(db, printer_id)
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
        printer: Printer = PrinterService.get_printer(db, printer_id)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        print(printer.name)
        # Find the most recent printing that needs confirmation
        current_printing: Printing = db.query(Printing).filter(Printing.printer_id == printer_id, Printing.status == "wait-confirm").first()
        print(current_printing.id)
        PrintingService.confirm_printing(db, current_printing.id)
        if not current_printing:
            raise HTTPException(status_code=404, detail="No printings found for this printer")
        
        # Set real_time_stop if it's not already set to ensure cards disappear
        if not current_printing.real_time_stop:
            current_printing.real_time_stop = datetime.now()
        
        # Update printer status to idle
        printer.status = "idle"
        
        # Save changes
        db.add(printer)
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
        printer: Printer = PrinterService.get_printer(db, printer_id)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        
        # Check if printer is available
        if printer.status != "idle":
            raise HTTPException(status_code=400, detail=f"Printer is not idle, current status: {printer.status}")
        
        # Check if model exists
        model: Model = ModelService.get_model(db, printing_data.model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        printing_data.printer_id = printer_id
        new_printing: Printing = PrintingService.create_printing(db=db, printing=printing_data)
        
        # Calculate expected end time based on model printing time
        new_printing.calculated_time_stop = new_printing.start_time + timedelta(minutes=model.printing_time)
        PrinterService.update_printer_status(db=db, printer_id=printing_data.printer_id, new_status="printing")
        
        return printer
    except Exception as e:
        print(f"Error in start_printer: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{printer_id}/pause", response_model=BaseSchemaPrinter)
def pause_printer(printer_id: int, db: Session = Depends(get_db)):
    """Приостановить работу принтера"""
    try:
        printer = PrinterService.get_printer(db, printer_id)
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
        printer = PrinterService.stop_printer(db, printer_id, stop_data.stop_reason)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        return printer
    except Exception as e:
        db.rollback()
        print(f"Error stopping printer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
