from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from crud import get_model
import models
from typing import Dict, Any
from models import Printer, Model, Printing

def get_daily_report(db: Session, date: datetime.date) -> Dict[str, Any]:
    start_datetime = datetime.combine(date, datetime.min.time())
    end_datetime = datetime.combine(date + timedelta(days=1), datetime.min.time())
    
    printings = db.query(Printing).filter(
        Printing.start_time >= start_datetime,
        Printing.start_time < end_datetime
    ).all()
    
    total_prints = len(printings)
    completed_prints = len([p for p in printings if p.real_time_stop])
    failed_prints = len([p for p in printings if p.real_time_stop and p.downtime > 0])
    
    total_print_time = sum((p.real_time_stop - p.start_time).total_seconds() / 3600 
                          for p in printings if p.real_time_stop)
    
    return {
        "total_prints": total_prints,
        "successful_prints": completed_prints - failed_prints,
        "failed_prints": failed_prints,
        "total_print_time": total_print_time,
        "average_print_time": total_print_time / completed_prints if completed_prints > 0 else 0
    }

def get_printer_report(db: Session, printer_id: int):
    if printer_id is None:
        return None

    printer = db.query(models.Printer).filter(models.Printer.id == printer_id).first()
    if not printer:
        return None
    
    printings = db.query(models.Printing).filter(
        models.Printing.printer_id == printer_id
    ).all()
    
    return {
        "printer": printer,
        "printings": [
            {
                "id": p.id,
                "model_name": get_model(db, p.model_id).name if p.model_id else "Unknown Model",
                "start_time": p.start_time,
                "status": "Completed" if p.real_time_stop else "Active"
            }
            for p in printings
        ],
        "total_prints": len(printings),
        "successful_prints": len([p for p in printings if p.real_time_stop and 
                                 (p.real_time_stop - p.start_time).total_seconds() / 3600 <= p.printing_time * 1.1]),
        "failed_prints": len([p for p in printings if p.real_time_stop and 
                            (p.real_time_stop - p.start_time).total_seconds() / 3600 > p.printing_time * 1.1]),
        "total_downtime": printer.total_downtime
    }

def get_model_report(db: Session, model_id: int):
    if model_id is None:
        return None

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