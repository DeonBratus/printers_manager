from sqlalchemy.orm import Session
from dal import printer as printer_dal
from schemas import PrinterCreate

def format_hours_to_hhmm(hours: float) -> str:
    """Конвертирует часы в формат HH:mm"""
    total_minutes = int(hours * 60)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours:02d}:{minutes:02d}"

def create_printer(db: Session, printer: PrinterCreate):
    try:
        result = printer_dal.create(db, printer)
        # If result is a list (from old code), take the first item
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

def get_printers(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False):
    try:
        printers = printer_dal.get_all(db, skip, limit, sort_by, sort_desc)
        # Convert ID to string for each printer
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
