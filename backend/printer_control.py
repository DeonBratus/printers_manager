from sqlalchemy.orm import Session
from datetime import datetime
import models
from crud import get_printing, get_printer, format_hours_to_hhmm
from sqlalchemy import func

def calculate_printer_downtime(db: Session, printer_id: int, current_time: datetime = None) -> float:
    """
    Вычисляет текущее время простоя принтера.
    Простой считается только когда принтер в состоянии idle.
    """
    if current_time is None:
        current_time = datetime.now()
        
    printer = get_printer(db, printer_id)
    if not printer or printer.status != "idle":
        return 0.0
        
    # Получаем время последней активности принтера
    last_printing = db.query(models.Printing).filter(
        models.Printing.printer_id == printer_id,
        models.Printing.real_time_stop != None
    ).order_by(models.Printing.real_time_stop.desc()).first()
    
    if last_printing:
        # Время простоя от завершения последней печати до текущего момента
        idle_time = (current_time - last_printing.real_time_stop).total_seconds() / 3600
        print(f"Printer {printer_id} idle time since last print: {format_hours_to_hhmm(idle_time)}")
        return idle_time
    else:
        # Если печатей не было, считаем с момента добавления принтера в систему
        idle_time = (current_time - printer.created_at).total_seconds() / 3600
        print(f"Printer {printer_id} idle time since creation: {format_hours_to_hhmm(idle_time)}")
        return idle_time

def complete_printing(db: Session, printing_id: int):
    printing = get_printing(db, printing_id)
    if not printing or printing.real_time_stop is not None:
        return None
    
    printer = get_printer(db, printing.printer_id)
    if not printer:
        return None
    
    current_time = datetime.now()
    printing.real_time_stop = current_time
    actual_printing_time = (printing.real_time_stop - printing.start_time).total_seconds() / 3600
    
    # Определяем успешность печати
    expected_end_time = printing.calculated_time_stop
    time_difference = abs((current_time - expected_end_time).total_seconds() / 3600)
    
    if current_time < expected_end_time and time_difference > (printing.printing_time * 0.1):
        printing.status = "aborted"
    else:
        printing.status = "completed"
    
    # Обновляем статистику принтера
    printer.status = "idle"
    printer.total_print_time += actual_printing_time
    # Простой будет рассчитываться динамически
    
    db.add(printing)
    db.add(printer)
    db.commit()
    db.refresh(printing)
    return printing

def pause_printing(db: Session, printing_id: int):
    printing = get_printing(db, printing_id)
    if not printing or printing.real_time_stop is not None:
        return None
    
    printer = get_printer(db, printing.printer_id)
    if not printer:
        return None
    
    printer.status = "paused"
    printing.pause_time = datetime.now()
    
    db.add(printer)
    db.add(printing)
    db.commit()
    db.refresh(printing)
    return printing

def resume_printing(db: Session, printing_id: int):
    printing = get_printing(db, printing_id)
    if not printing or printing.real_time_stop is not None:
        return None
    
    printer = get_printer(db, printing.printer_id)
    if not printer:
        return None
    
    current_time = datetime.now()
    if printing.pause_time:
        # Обновляем время простоя
        pause_duration = (current_time - printing.pause_time).total_seconds() / 3600
        printing.downtime = (printing.downtime or 0) + pause_duration
        # Корректируем ожидаемое время завершения
        printing.calculated_time_stop = printing.calculated_time_stop + \
            (current_time - printing.pause_time)
    
    printer.status = "printing"
    printing.pause_time = None
    
    db.add(printer)
    db.add(printing)
    db.commit()
    db.refresh(printing)
    return printing

def cancel_printing(db: Session, printing_id: int):
    printing = get_printing(db, printing_id)
    if not printing or printing.real_time_stop is not None:
        return None
    
    printer = get_printer(db, printing.printer_id)
    if not printer:
        return None
    
    current_time = datetime.now()
    printing.real_time_stop = current_time
    printing.status = "cancelled"
    
    # Вычисляем фактическое время печати
    actual_printing_time = (printing.real_time_stop - printing.start_time).total_seconds() / 3600
    
    # Обновляем статистику принтера
    printer.status = "idle"
    printer.total_print_time += actual_printing_time
    # Простой будет рассчитываться динамически
    
    db.add(printing)
    db.add(printer)
    db.commit()
    db.refresh(printing)
    return printing