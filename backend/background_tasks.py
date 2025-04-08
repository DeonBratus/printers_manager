from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from database import SessionLocal
from printer_control import calculate_printer_downtime
from crud import get_printers, get_printer, format_hours_to_hhmm
from datetime import datetime

def update_printer_downtimes():
    """Обновляет время простоя для всех принтеров в состоянии idle"""
    db = SessionLocal()
    try:
        printers = get_printers(db)
        current_time = datetime.now()
        print(f"[{current_time}] Checking printer downtimes...")
        
        for printer in printers:
            if printer.status == "idle":
                # Получаем актуальное время простоя с момента последней активности
                current_downtime = calculate_printer_downtime(db, printer.id, current_time)
                printer.total_downtime = current_downtime  # Сохраняем числовое значение
                printer.formatted_downtime = format_hours_to_hhmm(current_downtime)  # Форматированное значение
                print(f"Printer {printer.name} (ID: {printer.id}) downtime updated: {printer.formatted_downtime}")
                db.add(printer)
        
        db.commit()
    except Exception as e:
        print(f"Error updating printer downtimes: {e}")
        db.rollback()
    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    # Запускаем задачу каждые 30 секунд
    scheduler.add_job(update_printer_downtimes, 
                     'interval', 
                     seconds=30,
                     next_run_time=datetime.now())  # Немедленный запуск
    scheduler.start()
    print(f"[{datetime.now()}] Scheduler started - updating printer downtimes every 30 seconds")
    return scheduler
