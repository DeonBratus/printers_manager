from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas import PrintingCreate, Printing
from services import (
    printer as printer_service,
    printing as printing_service,
    model as model_service
)
from dal import printing as printings_dal
from printer_control import complete_printing, pause_printing, resume_printing, cancel_printing
from models import Printing as PrintingModel

router = APIRouter(
    prefix="/printings",
    tags=["printings"]
)

@router.post("/", response_model=Printing)
def create_new_printing(printing: PrintingCreate, db: Session = Depends(get_db)):
    try:
        # Проверяем доступность принтера
        printer = printer_service.get_printer(db, printing.printer_id)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        if printer.status != "idle":
            raise HTTPException(status_code=400, detail="Printer is not available")

        # Проверяем существование модели
        model = model_service.get_model(db, printing.model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")

        # Создаем запись о печати
        result = printing_service.create_printing(db, printing)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create printing")

        # Обновляем статус принтера
        printer.status = "printing"
        db.add(printer)
        db.commit()

        return result
    except Exception as e:
        db.rollback()
        print(f"Error creating printing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[Printing])
def read_printings(
    skip: int = 0, 
    limit: int = 100, 
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    db: Session = Depends(get_db),
    studio_id: int = None
):
    try:
        printings = printing_service.get_printings(db, skip=skip, limit=limit, sort_by=sort_by, sort_desc=sort_desc, studio_id=studio_id)
        return printings
    except Exception as e:
        print(f"Error in read_printings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{printing_id}", response_model=Printing)
def read_printing(printing_id: int, db: Session = Depends(get_db)):
    try:
        db_printing = printing_service.get_printing_with_details(db, printing_id=printing_id)
        if db_printing is None:
            raise HTTPException(status_code=404, detail="Printing not found")
        return db_printing
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in read_printing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/{printing_id}", response_model=Printing)
def update_existing_printing(printing_id: int, printing: PrintingCreate, db: Session = Depends(get_db)):
    try:
        db_printing = printing_service.update_printing(db, printing_id=printing_id, printing=printing)
        if db_printing is None:
            raise HTTPException(status_code=404, detail="Printing not found")
        return db_printing
    except Exception as e:
        print(f"Error updating printing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{printing_id}", response_model=Printing)
def delete_existing_printing(printing_id: int, db: Session = Depends(get_db)):
    try:
        db_printing = printing_service.delete_printing(db, printing_id=printing_id)
        if db_printing is None:
            raise HTTPException(status_code=404, detail="Printing not found")
        return db_printing
    except Exception as e:
        print(f"Error deleting printing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{printing_id}/complete", response_model=Printing)
def complete_existing_printing(printing_id: int, db: Session = Depends(get_db)):
    try:
        db_printing = complete_printing(db, printing_id=printing_id)
        if db_printing is None:
            raise HTTPException(status_code=404, detail="Printing not found or already completed")
        return db_printing
    except Exception as e:
        print(f"Error completing printing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{printing_id}/pause", response_model=Printing)
def pause_existing_printing(printing_id: int, db: Session = Depends(get_db)):
    try:
        db_printing = pause_printing(db, printing_id=printing_id)
        if db_printing is None:
            raise HTTPException(status_code=404, detail="Printing not found or already completed")
        return db_printing
    except Exception as e:
        print(f"Error pausing printing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{printing_id}/resume", response_model=Printing)
def resume_existing_printing(printing_id: int, db: Session = Depends(get_db)):
    try:
        db_printing = resume_printing(db, printing_id=printing_id)
        if db_printing is None:
            raise HTTPException(status_code=404, detail="Printing not found or already completed")
        return db_printing
    except Exception as e:
        print(f"Error resuming printing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{printing_id}/cancel", response_model=Printing)
def cancel_existing_printing(printing_id: int, db: Session = Depends(get_db)):
    try:
        db_printing = cancel_printing(db, printing_id=printing_id)
        if db_printing is None:
            raise HTTPException(status_code=404, detail="Printing not found or already completed")
        return db_printing
    except Exception as e:
        print(f"Error canceling printing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{printing_id}/confirm", response_model=Printing)
def confirm_printing(printing_id: int, db: Session = Depends(get_db)):
    """Complete print job and update statuses"""
    try:
        db_printing = printings_dal.confirm(db, printing_id)
        if not db_printing:
            raise HTTPException(status_code=404, detail="Printing not found")
            
        # Get full details for response
        return printing_service.get_printing_with_details(db, printing_id)
    except Exception as e:
        db.rollback()
        print(f"Error confirming print job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))