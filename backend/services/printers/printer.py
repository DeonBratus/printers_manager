from fastapi import HTTPException
from sqlalchemy.orm import Session
from dal import printer as printer_dal
from schemas import PrinterCreate
from models.models import Printer, Printing

class PrinterService():

    def create_printer(db: Session, printer: PrinterCreate):
        try:
            result = printer_dal.create(db, printer)
            if isinstance(result, list) and len(result) > 0:
                return result[0]
            # Convert ID to string
            if result and hasattr(result, 'id'):
                result.id = str(result.id)
            return result
        except Exception as e:
            print(f"Error in create_printer: {str(e)}")
            raise


    def get_printer(db: Session, printer_id: int):
        try:
            result = printer_dal.get(db, printer_id)
            # Convert ID to string
            if result and hasattr(result, 'id'):
                result.id = str(result.id)
            return result
        except Exception as e:
            print(f"Error in get_printer: {str(e)}")
            return None


    def get_printers(db: Session, studio_id: int = None, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False):
        try:
            printers = printer_dal.get_all(db, skip, limit, sort_by, sort_desc, studio_id)
            for printer in printers:
                if hasattr(printer, 'id'):
                    printer.id = str(printer.id)
            return printers
        except Exception as e:
            print(f"Error in get_printers: {str(e)}")
            return []


    def update_printer(db: Session, printer_id: int, printer: PrinterCreate):
        result = printer_dal.update(db, printer_id, printer.dict())
        # Convert ID to string
        if result and hasattr(result, 'id'):
            result.id = str(result.id)
        return result


    def delete_printer(db: Session, printer_id: int):
        result = printer_dal.delete(db, printer_id)
        # Convert ID to string
        if result and hasattr(result, 'id'):
            result.id = str(result.id)
        return result


    def stop_printer(db: Session, printer_id: int, stop_reason: str = None):
        """Stop printer and handle related updates"""
        return printer_dal.stop_printer(db, printer_id, stop_reason)
    

    def update_printer_status(db: Session, printer_id: int, new_status: str) -> Printer:
        """
        Обновляет статус принтера с учётом изменения режима работы.
        При переходе из активного состояния в неактивное, обновляет время простоя.
        """
        printer = __class__.get_printer(db, printer_id)
        if not printer:
            return None
            
        # Если статус не изменился, просто возвращаем принтер
        if printer.status == new_status:
            return printer
        # Обновляем статус
        printer_dal.update(db, printer_id, {"status": new_status})
        # Обновляем принтер из базы данных
        db.refresh(printer)
        return printer
    

    def resume_printer(db: Session, printer_id: int ):
        """Возобновление печати на принтере"""
        try:
            printer = __class__.get_printer(db, printer_id)
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
