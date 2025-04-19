from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from datetime import datetime
from db.database import SessionLocal
from services import PrinterService
from services.utils.time_utils import format_hours_to_hhmm, format_minutes_to_hhmm
from models.models import Printing
from dal import printer as printer_dal


def calculate_printer_downtime(db: Session, printer_id: int, current_time: datetime = None) -> float:
    """
    Вычисляет полное время простоя принтера с момента последней активности.
    Используется при изменении статуса принтера с активного на неактивный.
    Возвращает время простоя в минутах.
    """
    if current_time is None:
        current_time = datetime.now()
        
    printer = PrinterService.get_printer(db, printer_id)
    if not printer:
        return 0.0
        
    # Получаем время последней активности принтера
    last_printing = db.query(Printing).filter(
        Printing.printer_id == printer_id
    ).order_by(Printing.real_time_stop.desc()).first()
    
    if last_printing and last_printing.real_time_stop:
        # Время простоя от завершения последней печати до текущего момента в минутах
        idle_time = (current_time - last_printing.real_time_stop).total_seconds() / 60
        print(f"Printer {printer_id} idle time since last print: {format_minutes_to_hhmm(idle_time)}")
        return idle_time
    else:
        # Если печатей не было или нет завершенных, считаем с момента добавления принтера в систему
        idle_time = (current_time - printer.created_at).total_seconds() / 60
        print(f"Printer {printer_id} idle time since creation: {format_minutes_to_hhmm(idle_time)}")
        return idle_time


def update_printer_downtimes():
    """Обновляет время простоя для всех принтеров в неактивном состоянии"""
    db = SessionLocal()
    try:
        printers = PrinterService.get_printers(db, None)
        current_time = datetime.now()
        print(f"[{current_time}] Checking printer downtimes...")
        
        for printer in printers:
            # Обновляем время простоя только для принтеров в неактивном состоянии
            if printer.status in ["idle", "waiting", "error"]:
                # Добавляем инкрементальное время простоя
                # Используем 0.5 минуты (30 секунд) как стандартный интервал планировщика
                increment_minutes = 0.5  # 30 секунд в минутах
                
                # Получаем текущее время простоя
                current_downtime = float(printer.total_downtime or 0)
                
                # Добавляем инкрементальное время
                new_downtime = current_downtime + increment_minutes
                
                # Обновляем общее время простоя
                printer_dal.update(db, printer.id, {"total_downtime": new_downtime})
                
                formatted_time = format_hours_to_hhmm(new_downtime)
                print(f"[{current_time}] Printer {printer.id} updated downtime: {formatted_time} (+{increment_minutes:.2f} min)")
        
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
