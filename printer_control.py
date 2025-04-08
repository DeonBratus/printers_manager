from sqlalchemy.orm import Session
from datetime import datetime
import models
import schemas
from crud import get_printing, update_printing, get_printer, update_printer

def complete_printing(db: Session, printing_id: int):
    printing = get_printing(db, printing_id)
    if not printing or printing.real_time_stop is not None:
        return None
    
    printer = get_printer(db, printing.printer_id)
    if not printer:
        return None
    
    # Update printing record
    printing.real_time_stop = datetime.now()
    actual_printing_time = (printing.real_time_stop - printing.start_time).total_seconds() / 3600
    printing.downtime = max(0, actual_printing_time - printing.printing_time)
    
    # Update printer stats
    printer.status = "idle"
    printer.total_print_time += actual_printing_time
    printer.total_downtime += printing.downtime
    
    db.add(printing)
    db.add(printer)
    db.commit()
    db.refresh(printing)
    return printing

def pause_printing(db: Session, printing_id: int):
    printing = get_printing(db, printing_id)
    if not printing or printing.real_time_stop is not None:
        return None
    
    printer = get_printer(db, printing.printer_id)
    if not printer:
        return None
    
    printer.status = "paused"
    db.add(printer)
    db.commit()
    db.refresh(printer)
    return printer

def resume_printing(db: Session, printing_id: int):
    printing = get_printing(db, printing_id)
    if not printing or printing.real_time_stop is not None:
        return None
    
    printer = get_printer(db, printing.printer_id)
    if not printer:
        return None
    
    printer.status = "printing"
    db.add(printer)
    db.commit()
    db.refresh(printer)
    return printer

def cancel_printing(db: Session, printing_id: int):
    printing = get_printing(db, printing_id)
    if not printing or printing.real_time_stop is not None:
        return None
    
    printer = get_printer(db, printing.printer_id)
    if not printer:
        return None
    
    # Update printing record
    printing.real_time_stop = datetime.now()
    actual_printing_time = (printing.real_time_stop - printing.start_time).total_seconds() / 3600
    printing.downtime = max(0, actual_printing_time - printing.printing_time)
    
    # Update printer stats
    printer.status = "idle"
    printer.total_print_time += actual_printing_time
    printer.total_downtime += printing.downtime
    
    db.add(printing)
    db.add(printer)
    db.commit()
    db.refresh(printing)
    return printing