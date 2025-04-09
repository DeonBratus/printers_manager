from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from fastapi.responses import StreamingResponse
import csv
from io import StringIO

from database import get_db
from crud import get_printers
from reports import get_daily_report, get_printer_report, get_model_report

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
