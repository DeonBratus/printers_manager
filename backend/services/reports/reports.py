from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from services import ModelService
import models
from typing import Dict, Any
from models import Printer, Model, Printing

def get_daily_report(db: Session, date: datetime.date, studio_id: int = None) -> Dict[str, Any]:
    start_datetime = datetime.combine(date, datetime.min.time())
    end_datetime = datetime.combine(date + timedelta(days=1), datetime.min.time())
    
    query = db.query(Printing).filter(
        Printing.start_time >= start_datetime,
        Printing.start_time < end_datetime
    )
    
    if studio_id is not None:
        query = query.join(Printer).filter(Printer.studio_id == studio_id)
        
    printings = query.all()
    
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

    printer = db.query(Printer).filter(Printer.id == printer_id).first()
    if not printer:
        return None
    
    printings = db.query(Printing).filter(
        Printing.printer_id == printer_id
    ).all()
    
    # Calculate success rate
    completed_printings = [p for p in printings if p.real_time_stop]
    success_rate = 0
    if completed_printings:
        successful_prints = len([p for p in completed_printings if p.status == 'completed'])
        success_rate = (successful_prints / len(completed_printings)) * 100
    
    # Convert time values to hours for frontend display
    total_print_time = printer.total_print_time  
    total_downtime = printer.total_downtime
    
    # Get recent printings with dates for activity timeline
    all_printings = []
    for p in printings:
        all_printings.append({
            "id": p.id,
            "model_name": db.query(Model).filter(Model.id == p.model_id).first().name if p.model_id else "Unknown Model",
            "start_time": p.start_time.isoformat(),
            "end_time": p.real_time_stop.isoformat() if p.real_time_stop else None,
            "status": p.status
        })
    
    return {
        "printer": printer,
        "printings": all_printings,
        "total_prints": len(printings),
        "successful_prints": len([p for p in printings if p.real_time_stop and 
                                 (p.real_time_stop - p.start_time).total_seconds() / 3600 <= p.printing_time * 1.1]),
        "failed_prints": len([p for p in printings if p.real_time_stop and 
                            (p.real_time_stop - p.start_time).total_seconds() / 3600 > p.printing_time * 1.1]),
        "total_downtime": total_downtime,
        "total_print_time": total_print_time,
        "success_rate": round(success_rate, 1)
    }

def get_model_report(db: Session, model_id: int, studio_id: int = None):
    if model_id is None:
        return None

    model = db.query(Model).filter(Model.id == model_id).first()
    if not model:
        return None
    
    # Get printings for this model
    query = db.query(Printing).filter(Printing.model_id == model_id)
    
    # Filter by studio if specified
    if studio_id is not None:
        query = query.join(Printer).filter(Printer.studio_id == studio_id)
        
    printings = query.all()
    
    # Calculate average print time in hours
    completed_printings = [p for p in printings if p.real_time_stop]
    average_print_time = 0
    if completed_printings:
        total_hours = sum((p.real_time_stop - p.start_time).total_seconds() / 3600 for p in completed_printings)
        average_print_time = total_hours / len(completed_printings)
    
    # Calculate success rate
    success_rate = 0
    if completed_printings:
        successful_prints = len([p for p in completed_printings if p.status == 'completed'])
        success_rate = (successful_prints / len(completed_printings)) * 100
    
    # Estimate material usage based on print time (placeholder)
    # Assume 50g of material per hour of printing on average
    estimated_material_per_print = average_print_time * 0.05  # kg
    
    return {
        "model": model,
        "total_prints": len(printings),
        "average_print_time": round(average_print_time, 2),
        "success_rate": round(success_rate, 1),
        "estimated_material": round(estimated_material_per_print, 2),
        "total_estimated_material": round(estimated_material_per_print * len(completed_printings), 2)
    }