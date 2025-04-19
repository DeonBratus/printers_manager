from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from datetime import datetime
from db.database import SessionLocal
from services.printers.printer_control import calculate_printer_downtime
from services.printers.printer import get_printers, format_hours_to_hhmm
from dal import printer as printer_dal

def update_printer_downtimes():
    """Обновляет время простоя для всех принтеров в неактивном состоянии"""
    db = SessionLocal()
    try:
        printers = get_printers(db)
        current_time = datetime.now()
        print(f"[{current_time}] Checking printer downtimes...")
        
        # Время в минутах между запусками задачи
        # Обычно планировщик запускается раз в 30 секунд, но для надежности используем
        # фактическое время между запусками
        
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
