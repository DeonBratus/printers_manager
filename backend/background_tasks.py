from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from datetime import datetime
from database import SessionLocal
from printer_control import calculate_printer_downtime
from services.printer import get_printers, format_hours_to_hhmm
from dal import printer as printer_dal

def update_printer_downtimes():
    """Обновляет время простоя для всех принтеров в состоянии idle"""
    db = SessionLocal()
    try:
        printers = get_printers(db)
        current_time = datetime.now()
        print(f"[{current_time}] Checking printer downtimes...")
        
        for printer in printers:
            if printer.status == "idle" or printer.status == "waiting":
                # Получаем актуальное время простоя с момента последней активности
                current_downtime = calculate_printer_downtime(db, printer.id, current_time)
                # Вычисляем разницу между текущим простоем и прошлым
                downtime_difference = current_downtime - printer.total_downtime
                print(f"[{current_time}] Printer {printer.id} downtime difference: {downtime_difference}")
                # Обновляем через DAL только разницу
                printer_dal.update(db, printer.id, {"total_downtime": downtime_difference})
                formatted_time = format_hours_to_hhmm(downtime_difference)        
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
