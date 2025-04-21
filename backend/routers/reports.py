from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi.responses import StreamingResponse
import csv
from io import StringIO

from db.database import get_db
from services import PrinterService
from services.reports.reports import get_daily_report, get_printer_report, get_model_report
from models.models import Printer, Model, Printing

router = APIRouter(
    prefix="/reports",
    tags=["reports"]
)

@router.get("/daily/")
def get_daily_report_endpoint(date: Optional[str] = None, studio_id: Optional[int] = None, db: Session = Depends(get_db)):
    report_date = datetime.strptime(date, "%Y-%m-%d").date() if date else datetime.now().date()
    return get_daily_report(db, report_date, studio_id)

@router.get("/printers/{printer_id}")
def get_printer_report_endpoint(printer_id: int, db: Session = Depends(get_db)):
    report = get_printer_report(db, printer_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Printer not found")
    return report

@router.get("/models/{model_id}")
def get_model_report_endpoint(model_id: int, studio_id: Optional[int] = None, db: Session = Depends(get_db)):
    report = get_model_report(db, model_id, studio_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return report

@router.get("/printer-status")
def get_printer_status_report(studio_id: Optional[int] = None, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get a comprehensive report on the status of all printers"""
    if studio_id:
        printers = db.query(Printer).filter(Printer.studio_id == studio_id).all()
    else:
        printers = db.query(Printer).all()
    
    # Count printers by status
    status_counts = {
        "idle": 0,
        "printing": 0,
        "paused": 0,
        "error": 0,
        "waiting": 0
    }
    
    printer_data = []
    total_efficiency = 0
    printers_with_data = 0
    
    for printer in printers:
        # Count by status
        status = printer.status.lower() if printer.status else "idle"
        if status in status_counts:
            status_counts[status] += 1
        
        # Calculate printer efficiency (time printing vs. total time available)
        total_time = printer.total_print_time + printer.total_downtime
        efficiency = 0
        
        if total_time > 0:
            efficiency = (printer.total_print_time / total_time * 100)
            total_efficiency += efficiency
            printers_with_data += 1
        
        printer_data.append({
            "id": printer.id,
            "name": printer.name,
            "status": status,
            "efficiency": round(efficiency, 1),
            "total_print_time": printer.total_print_time,  # Already in hours
            "total_downtime": printer.total_downtime  # Already in hours
        })
    
    average_efficiency = total_efficiency / printers_with_data if printers_with_data > 0 else 0
    
    return {
        "total_printers": len(printers),
        "status_counts": status_counts,
        "printers": printer_data,
        "average_efficiency": round(average_efficiency, 1)
    }

@router.get("/printing-efficiency")
def get_printing_efficiency_report(studio_id: Optional[int] = None, db: Session = Depends(get_db),
                                  days: int = 30) -> Dict[str, Any]:
    """Get report on printing efficiency over time"""
    # Get data for the specified time period
    start_date = datetime.now() - timedelta(days=days)
    
    # Filter printings by studio if specified
    query = db.query(Printing).filter(Printing.start_time >= start_date)
    if studio_id:
        query = query.join(Printer).filter(Printer.studio_id == studio_id)
    printings = query.all()
    
    # Filter models by studio if specified
    if studio_id:
        models = db.query(Model).filter(Model.studio_id == studio_id).all()
    else:
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
    print_time_by_printer = {}
    if studio_id:
        printers = db.query(Printer).filter(Printer.studio_id == studio_id).all()
    else:
        printers = db.query(Printer).all()
    
    # Calculate total print time and total downtime
    total_print_time = 0
    total_downtime = 0
    
    for printer in printers:
        if printer.name not in downtime_by_printer:
            downtime_by_printer[printer.name] = 0
            print_time_by_printer[printer.name] = 0
        
        # Add current downtime - convert to hours
        downtime_by_printer[printer.name] = printer.total_downtime/60
        print_time_by_printer[printer.name] = printer.total_print_time/60
        
        # Add to totals
        total_print_time += printer.total_print_time
        total_downtime += printer.total_downtime
    
    # Calculate estimated material consumption
    # Assume 50g of material per hour of printing on average
    total_material_kg = total_print_time * 0.05  # 50g per hour
    
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
        "print_time_by_printer": print_time_by_printer,
        "total_print_time": total_print_time/60,
        "total_downtime": total_downtime/60,
        "estimated_material_usage": round(total_material_kg, 2),
        "models": model_data
    }

@router.get("/printers/export/", response_class=StreamingResponse)
def export_printers_report(studio_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Экспорт отчета по всем принтерам в формате CSV"""
    printers = PrinterService.get_printers(db, studio_id)
    
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
