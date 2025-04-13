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
    return printer_dal.create(db, printer)

def get_printer(db: Session, printer_id: int):
    try:
        printer = printer_dal.get(db, printer_id)
        if printer:
            # Convert ID to string for consistency
            printer.id = str(printer.id)
        return printer
    except Exception as e:
        print(f"Error in get_printer: {str(e)}")
        return None

def get_printers(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False):
    try:
        printers = printer_dal.get_all(db, skip, limit, sort_by, sort_desc)
        # Конвертируем ID в строку для совместимости
        for printer in printers:
            printer.id = str(printer.id)
        return printers
    except Exception as e:
        print(f"Error in get_printers: {str(e)}")
        return []

def update_printer(db: Session, printer_id: int, printer: PrinterCreate):
    return printer_dal.update(db, printer_id, printer.dict())

def delete_printer(db: Session, printer_id: int):
    return printer_dal.delete(db, printer_id)
