from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
import models

def get_daily_report(db: Session, date: datetime = None):
    if date is None:
        date = datetime.now().date()
    
    start_date = datetime.combine(date, datetime.min.time())
    end_date = start_date + timedelta(days=1)
    
    return db.query(models.Printing).filter(
        and_(
            models.Printing.start_time >= start_date,
            models.Printing.start_time < end_date
        )
    ).all()

def get_printer_report(db: Session, printer_id: int):
    printer = db.query(models.Printer).filter(models.Printer.id == printer_id).first()
    if not printer:
        return None
    
    printings = db.query(models.Printing).filter(
        models.Printing.printer_id == printer_id
    ).all()
    
    return {
        "printer": printer,
        "printings": printings,
        "total_prints": len(printings),
        "successful_prints": len([p for p in printings if p.real_time_stop and 
                                 (p.real_time_stop - p.start_time).total_seconds() / 3600 <= p.printing_time * 1.1]),
        "failed_prints": len([p for p in printings if p.real_time_stop and 
                            (p.real_time_stop - p.start_time).total_seconds() / 3600 > p.printing_time * 1.1]),
        "total_downtime": sum(p.downtime for p in printings if p.downtime)
    }

def get_model_report(db: Session, model_id: int):
    model = db.query(models.Model).filter(models.Model.id == model_id).first()
    if not model:
        return None
    
    printings = db.query(models.Printing).filter(
        models.Printing.model_id == model_id
    ).all()
    
    return {
        "model": model,
        "printings": printings,
        "total_prints": len(printings),
        "average_print_time": sum(
            (p.real_time_stop - p.start_time).total_seconds() / 3600 
            for p in printings if p.real_time_stop
        ) / len([p for p in printings if p.real_time_stop]) if [p for p in printings if p.real_time_stop] else 0,
        "success_rate": len([p for p in printings if p.real_time_stop and 
                           (p.real_time_stop - p.start_time).total_seconds() / 3600 <= model.printing_time * 1.1]) / 
                       len([p for p in printings if p.real_time_stop]) * 100 if [p for p in printings if p.real_time_stop] else 0
    }