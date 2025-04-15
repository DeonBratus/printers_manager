from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas import PrinterParameter, PrinterParameterCreate
from dal import printer as printer_dal
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

router = APIRouter(
    prefix="/printers",
    tags=["printer-parameters"]
)

@router.post("/{printer_id}/parameters", response_model=PrinterParameter)
def add_printer_parameter(
    printer_id: int, 
    parameter: PrinterParameterCreate, 
    db: Session = Depends(get_db)
):
    """Add a custom parameter to a printer"""
    try:
        # Check if printer exists
        printer = printer_dal.get(db, printer_id)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        
        # Add the parameter
        try:
            db_param = printer_dal.add_parameter(
                db, 
                printer_id=printer_id, 
                param_name=parameter.name, 
                param_value=parameter.value
            )
            return db_param
        except IntegrityError as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Parameter already exists or constraint violation: {str(e)}")
        except SQLAlchemyError as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to add parameter: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in add_printer_parameter: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.get("/{printer_id}/parameters", response_model=List[PrinterParameter])
def get_printer_parameters(printer_id: int, db: Session = Depends(get_db)):
    """Get all custom parameters for a printer"""
    try:
        # Check if printer exists
        printer = printer_dal.get(db, printer_id)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        
        # Retrieve parameters
        try:
            return printer_dal.get_parameters(db, printer_id)
        except SQLAlchemyError as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get parameters: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in get_printer_parameters: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.delete("/{printer_id}/parameters/{param_id}", response_model=PrinterParameter)
def delete_printer_parameter(printer_id: int, param_id: int, db: Session = Depends(get_db)):
    """Delete a custom parameter from a printer"""
    try:
        # Check if printer exists
        printer = printer_dal.get(db, printer_id)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        
        # Delete the parameter
        try:
            db_param = printer_dal.delete_parameter(db, param_id)
            if not db_param:
                raise HTTPException(status_code=404, detail="Parameter not found")
            return db_param
        except SQLAlchemyError as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete parameter: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in delete_printer_parameter: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}") 