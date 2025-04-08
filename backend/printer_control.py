from sqlalchemy.orm import Session
from datetime import datetime
import models
from crud import get_printing, get_printer
from sqlalchemy import func

def calculate_printer_downtime(db: Session, printer_id: int, current_time: datetime) -> float:
    """Вычисляет время простоя принтера с момента последней печати"""
    last_printing = db.query(models.Printing).filter(
        models.Printing.printer_id == printer_id,
        models.Printing.real_time_stop != None
    ).order_by(models.Printing.real_time_stop.desc()).first()
    
    if last_printing:
        return (current_time - last_printing.real_time_stop).total_seconds() / 3600
    return 0

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
    
    # Если печать завершилась раньше расчетного времени более чем на 10% - считаем её прерванной
    if current_time < expected_end_time and time_difference > (printing.printing_time * 0.1):
        printing.status = "aborted"
        printing.downtime = time_difference  # Время, которое не допечаталось
    else:
        printing.status = "completed"
        printing.downtime = 0  # Успешная печать не имеет времени простоя
    
    # Обновляем статистику принтера
    printer.status = "idle"
    printer.total_print_time += actual_printing_time
    
    # Добавляем время простоя с момента последней печати
    downtime = calculate_printer_downtime(db, printer.id, printing.start_time)
    printer.total_downtime += downtime
    
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
    printing.pause_time = datetime.now()  # Сохраняем время паузы
    
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
    
    # Вычисляем фактическое время печати и время простоя
    actual_printing_time = (printing.real_time_stop - printing.start_time).total_seconds() / 3600
    remaining_time = (printing.calculated_time_stop - current_time).total_seconds() / 3600
    printing.downtime = max(0, remaining_time)  # Оставшееся время считается простоем
    
    # Обновляем статистику принтера
    printer.status = "idle"
    printer.total_print_time += actual_printing_time
    printer.total_downtime += printing.downtime
    
    db.add(printing)
    db.add(printer)
    db.commit()
    db.refresh(printing)
    return printing