from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi.responses import StreamingResponse
import csv
from io import StringIO

from database import get_db
from crud import get_printers
from reports import get_daily_report, get_printer_report, get_model_report
from models import Printer, Model, Printing

router = APIRouter(
    prefix="/reports",
    tags=["reports"]
)

@router.get("/daily/")
def get_daily_report_endpoint(date: Optional[str] = None, db: Session = Depends(get_db)):
    report_date = datetime.strptime(date, "%Y-%m-%d").date() if date else datetime.now().date()
    return get_daily_report(db, report_date)

@router.get("/printers/{printer_id}")
def get_printer_report_endpoint(printer_id: int, db: Session = Depends(get_db)):
    report = get_printer_report(db, printer_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Printer not found")
    return report

@router.get("/models/{model_id}")
def get_model_report_endpoint(model_id: int, db: Session = Depends(get_db)):
    report = get_model_report(db, model_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return report

@router.get("/printer-status")
def get_printer_status_report(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get a comprehensive report on the status of all printers"""
    printers = db.query(Printer).all()
    
    # Count printers by status
    status_counts = {
        "idle": 0,
        "printing": 0,
        "paused": 0,
        "error": 0
    }
    
    printer_data = []
    total_efficiency = 0
    
    for printer in printers:
        # Count by status
        if printer.status in status_counts:
            status_counts[printer.status] += 1
        
        # Calculate printer efficiency (time printing vs. total time available)
        total_time = printer.total_print_time + printer.total_downtime
        efficiency = (printer.total_print_time / total_time * 100) if total_time > 0 else 0
        total_efficiency += efficiency
        
        printer_data.append({
            "id": printer.id,
            "name": printer.name,
            "status": printer.status,
            "efficiency": round(efficiency, 1),
            "total_print_time": round(printer.total_print_time, 1),
            "total_downtime": round(printer.total_downtime, 1)
        })
    
    average_efficiency = total_efficiency / len(printers) if printers else 0
    
    return {
        "total_printers": len(printers),
        "status_counts": status_counts,
        "printers": printer_data,
        "average_efficiency": round(average_efficiency, 1)
    }

@router.get("/printing-efficiency")
def get_printing_efficiency_report(db: Session = Depends(get_db),
                                  days: int = 30) -> Dict[str, Any]:
    """Get report on printing efficiency over time"""
    # Get data for the specified time period
    start_date = datetime.now() - timedelta(days=days)
    
    printings = db.query(Printing).filter(Printing.start_time >= start_date).all()
    models = db.query(Model).all()
    
    # Group printings by day
    daily_printings = {}
    end_date = datetime.now()
    current_date = start_date
    
    # Initialize all days in the range
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        daily_printings[date_str] = 0
        current_date += timedelta(days=1)
    
    # Count printings by day
    for printing in printings:
        date_str = printing.start_time.strftime("%Y-%m-%d")
        if date_str in daily_printings:
            daily_printings[date_str] += 1
    
    # Calculate downtime by printer
    downtime_by_printer = {}
    printers = db.query(Printer).all()
    
    for printer in printers:
        if printer.name not in downtime_by_printer:
            downtime_by_printer[printer.name] = 0
        
        # Add current downtime
        downtime_by_printer[printer.name] += printer.total_downtime * 60  # Convert to minutes
    
    # Get model data for the report
    model_data = []
    for model in models:
        model_printings = [p for p in printings if p.model_id == model.id]
        total_prints = len(model_printings)
        
        if total_prints > 0:
            success_rate = len([p for p in model_printings if p.status == 'completed']) / total_prints * 100
        else:
            success_rate = 0
            
        model_data.append({
            "id": model.id,
            "name": model.name,
            "total_prints": total_prints,
            "success_rate": round(success_rate, 1)
        })
    
    return {
        "total_printings": len(printings),
        "daily_printings": daily_printings,
        "downtime_by_printer": downtime_by_printer,
        "models": model_data
    }

@router.get("/printers/export/", response_class=StreamingResponse)
def export_printers_report(db: Session = Depends(get_db)):
    """Экспорт отчета по всем принтерам в формате CSV"""
    printers = get_printers(db)
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Status", "Total Print Time (hrs)", "Total Downtime (hrs)"])
    
    for printer in printers:
        writer.writerow([
            printer.id,
            printer.name,
            printer.status,
            f"{printer.total_print_time:.2f}",
            f"{printer.total_downtime:.2f}"
        ])
    
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=printers_report.csv"}
    )
