from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import List, Optional
import uvicorn
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.requests import Request
from background_tasks import start_scheduler
import csv
from io import StringIO

from database import get_db
from models import Base
from schemas import (
    PrinterBase, PrinterCreate, Printer,
    ModelBase, ModelCreate, Model,
    PrintingBase, PrintingCreate, Printing,
)
from crud import (
    create_printer, get_printer, get_printers, update_printer, delete_printer,
    create_model, get_model, get_models, update_model, delete_model,
    create_printing, get_printing, get_printings, update_printing, delete_printing,
)
from printer_control import complete_printing, pause_printing, resume_printing, cancel_printing, calculate_printer_downtime
from reports import get_daily_report, get_printer_report, get_model_report
from sqlalchemy.orm import Session
from sqlalchemy import create_engine

app = FastAPI(
    title="3D Printer Management API",
    description="API for managing 3D printers, models and print jobs",
    version="1.0.0"
)

origins = [
    "http://localhost",
    "http://127.0.0.1",
    "http://localhost:5500",  # для Live Server в VSCode
    "*"  # временно разрешаем все источники для разработки
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализация базы данных
engine = create_engine("postgresql://postgres:postgres@localhost/3d_printer_db")
Base.metadata.create_all(bind=engine)

# Настройка статических файлов и шаблонов
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Запускаем планировщик при старте приложения
@app.on_event("startup")
async def startup_event():
    start_scheduler()

# Обновленный корневой маршрут для отображения фронтенда
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Printer endpoints
@app.post("/printers/", response_model=List[Printer])
def create_new_printer(printer: PrinterCreate, db: Session = Depends(get_db)):
    return create_printer(db, printer)

@app.get("/printers/", response_model=List[Printer])
def read_printers(
    skip: int = 0, 
    limit: int = 100, 
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    db: Session = Depends(get_db)
):
    printers = get_printers(db, skip=skip, limit=limit, sort_by=sort_by, sort_desc=sort_desc)
    return printers

@app.get("/printers/{printer_id}", response_model=Printer)
def read_printer(printer_id: int, db: Session = Depends(get_db)):
    db_printer = get_printer(db, printer_id=printer_id)
    if db_printer is None:
        raise HTTPException(status_code=404, detail="Printer not found")
    return db_printer

@app.put("/printers/{printer_id}", response_model=Printer)
def update_existing_printer(printer_id: int, printer: PrinterCreate, db: Session = Depends(get_db)):
    db_printer = update_printer(db, printer_id=printer_id, printer=printer)
    if db_printer is None:
        raise HTTPException(status_code=404, detail="Printer not found")
    return db_printer

@app.delete("/printers/{printer_id}", response_model=Printer)
def delete_existing_printer(printer_id: int, db: Session = Depends(get_db)):
    db_printer = delete_printer(db, printer_id=printer_id)
    if db_printer is None:
        raise HTTPException(status_code=404, detail="Printer not found")
    return db_printer

@app.get("/printers/{printer_id}/downtime")
def get_printer_downtime(printer_id: int, db: Session = Depends(get_db)):
    """Получение текущего времени простоя принтера"""
    try:
        downtime = calculate_printer_downtime(db, printer_id)
        return {"printer_id": printer_id, "downtime": downtime}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Printer control endpoints
@app.post("/printers/{printer_id}/resume", response_model=Printer)
def resume_printer(printer_id: int, db: Session = Depends(get_db)):
    """Возобновление печати на принтере"""
    printer = get_printer(db, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    if printer.status != "waiting":
        raise HTTPException(status_code=400, detail="Printer is not in waiting state")
    
    printer.status = "printing"
    db.add(printer)
    db.commit()
    db.refresh(printer)
    return printer

@app.post("/printers/{printer_id}/confirm", response_model=Printer)
def confirm_printer(printer_id: int, db: Session = Depends(get_db)):
    """Подтверждение завершения печати"""
    printer = get_printer(db, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    if printer.status != "waiting":
        raise HTTPException(status_code=400, detail="Printer is not in waiting state")
    
    # Находим последнюю печать этого принтера
    last_printing = db.query(Printing).filter(
        Printing.printer_id == printer_id,
        Printing.real_time_stop == None
    ).first()
    
    if last_printing:
        current_time = datetime.now()
        last_printing.real_time_stop = current_time
        last_printing.status = "completed"
        actual_printing_time = (current_time - last_printing.start_time).total_seconds() / 3600
        printer.total_print_time += actual_printing_time
        db.add(last_printing)
    
    printer.status = "idle"
    db.add(printer)
    db.commit()
    db.refresh(printer)
    return printer

# Model endpoints
@app.post("/models/", response_model=Model)
def create_new_model(model: ModelCreate, db: Session = Depends(get_db)):
    return create_model(db, model)

@app.get("/models/", response_model=List[Model])
def read_models(
    skip: int = 0, 
    limit: int = 100, 
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    db: Session = Depends(get_db)
):
    models = get_models(db, skip=skip, limit=limit, sort_by=sort_by, sort_desc=sort_desc)
    return models

@app.get("/models/{model_id}", response_model=Model)
def read_model(model_id: int, db: Session = Depends(get_db)):
    db_model = get_model(db, model_id=model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return db_model

@app.put("/models/{model_id}", response_model=Model)
def update_existing_model(model_id: int, model: ModelCreate, db: Session = Depends(get_db)):
    db_model = update_model(db, model_id=model_id, model=model)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return db_model

@app.delete("/models/{model_id}", response_model=Model)
def delete_existing_model(model_id: int, db: Session = Depends(get_db)):
    db_model = delete_model(db, model_id=model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return db_model

# Printing endpoints
@app.post("/printings/", response_model=Printing)
def create_new_printing(printing: PrintingCreate, db: Session = Depends(get_db)):
    try:
        # Проверяем доступность принтера
        printer = get_printer(db, printing.printer_id)
        if not printer:
            raise HTTPException(status_code=404, detail="Printer not found")
        if printer.status != "idle":
            raise HTTPException(status_code=400, detail="Printer is not available")

        # Проверяем существование модели
        model = get_model(db, printing.model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")

        # Создаем запись о печати
        result = create_printing(db, printing)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create printing")

        # Обновляем статус принтера
        printer.status = "printing"
        db.add(printer)
        db.commit()

        return result
    except Exception as e:
        db.rollback()
        print(f"Error creating printing: {str(e)}")  # Отладочный лог
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/printings/", response_model=List[Printing])
def read_printings(
    skip: int = 0, 
    limit: int = 100, 
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    db: Session = Depends(get_db)
):
    printings = get_printings(db, skip=skip, limit=limit, sort_by=sort_by, sort_desc=sort_desc)
    return printings

@app.get("/printings/{printing_id}", response_model=Printing)
def read_printing(printing_id: int, db: Session = Depends(get_db)):
    db_printing = get_printing(db, printing_id=printing_id)
    if db_printing is None:
        raise HTTPException(status_code=404, detail="Printing not found")
    return db_printing

@app.put("/printings/{printing_id}", response_model=Printing)
def update_existing_printing(printing_id: int, printing: PrintingCreate, db: Session = Depends(get_db)):
    db_printing = update_printing(db, printing_id=printing_id, printing=printing)
    if db_printing is None:
        raise HTTPException(status_code=404, detail="Printing not found")
    return db_printing

@app.delete("/printings/{printing_id}", response_model=Printing)
def delete_existing_printing(printing_id: int, db: Session = Depends(get_db)):
    db_printing = delete_printing(db, printing_id=printing_id)
    if db_printing is None:
        raise HTTPException(status_code=404, detail="Printing not found")
    return db_printing

# Printing control endpoints
@app.post("/printings/{printing_id}/complete", response_model=Printing)
def complete_existing_printing(printing_id: int, db: Session = Depends(get_db)):
    db_printing = complete_printing(db, printing_id=printing_id)
    if db_printing is None:
        raise HTTPException(status_code=404, detail="Printing not found or already completed")
    return db_printing

@app.post("/printings/{printing_id}/pause", response_model=Printing)
def pause_existing_printing(printing_id: int, db: Session = Depends(get_db)):
    db_printing = pause_printing(db, printing_id=printing_id)
    if db_printing is None:
        raise HTTPException(status_code=404, detail="Printing not found or already completed")
    return db_printing

@app.post("/printings/{printing_id}/resume", response_model=Printing)
def resume_existing_printing(printing_id: int, db: Session = Depends(get_db)):
    db_printing = resume_printing(db, printing_id=printing_id)
    if db_printing is None:
        raise HTTPException(status_code=404, detail="Printing not found or already completed")
    return db_printing

@app.post("/printings/{printing_id}/cancel", response_model=Printing)
def cancel_existing_printing(printing_id: int, db: Session = Depends(get_db)):
    db_printing = cancel_printing(db, printing_id=printing_id)
    if db_printing is None:
        raise HTTPException(status_code=404, detail="Printing not found or already completed")
    return db_printing

@app.post("/printers/{printer_id}/start_printing/", response_model=Printing)
def start_printing(printer_id: int, printing: PrintingCreate, db: Session = Depends(get_db)):
    printer = get_printer(db, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    if printer.status != "idle":
        raise HTTPException(status_code=400, detail="Printer is not idle")
    
    model = get_model(db, printing.model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    if not printing.start_time:
        printing.start_time = datetime.now()
    printing.calculated_time_stop = printing.start_time + timedelta(hours=printing.printing_time)
    
    print(f"Creating printing with data: {printing.dict()}")  # Отладочное сообщение
    
    try:
        new_printing = create_printing(db, printing)
        printer.status = "printing"
        db.add(printer)
        db.commit()
        db.refresh(new_printing)
        return new_printing
    except Exception as e:
        print(f"Error saving printing: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save printing")
    
# Report endpoints
@app.get("/reports/daily/")
def get_daily_report_endpoint(date: Optional[str] = None, db: Session = Depends(get_db)):
    report_date = datetime.strptime(date, "%Y-%m-%d").date() if date else datetime.now().date()
    return get_daily_report(db, report_date)

@app.get("/reports/printers/{printer_id}")
def get_printer_report_endpoint(printer_id: int, db: Session = Depends(get_db)):
    report = get_printer_report(db, printer_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Printer not found")
    return report

@app.get("/reports/models/{model_id}")
def get_model_report_endpoint(model_id: int, db: Session = Depends(get_db)):
    report = get_model_report(db, model_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return report

@app.get("/reports/printers/export/", response_class=StreamingResponse)
def export_printers_report(db: Session = Depends(get_db)):
    """Экспорт отчета по всем принтерам в формате CSV"""
    printers = get_printers(db)
    
    # Создаем CSV в памяти
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
