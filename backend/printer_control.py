from sqlalchemy.orm import Session
from datetime import datetime
import models
from services.printer import format_minutes_to_hhmm, get_printers, get_printer
from services.printing import get_printings, get_printing
from dal import printer as printer_dal


def calculate_printer_downtime(db: Session, printer_id: int, current_time: datetime = None) -> float:
    """
    Вычисляет текущее время простоя принтера.
    Простой считается когда принтер в состоянии idle или waiting
    """
    if current_time is None:
        current_time = datetime.now()
        
    printer = get_printer(db, printer_id)
    if not printer:
        return 0.0
        
    # Если принтер активен (printing, paused), то нет простоя
    if printer.status not in ["idle", "waiting", "error"]:
        return printer.total_downtime
        
    # Получаем время последней активности принтера
    last_printing = db.query(models.Printing).filter(
        models.Printing.printer_id == printer_id
    ).order_by(models.Printing.real_time_stop.desc()).first()
    
    current_downtime = 0.0
    
    if last_printing and last_printing.real_time_stop:
        # Время простоя от завершения последней печати до текущего момента в минутах
        current_downtime = (current_time - last_printing.real_time_stop).total_seconds() / 60
        print(f"Printer {printer_id} idle time since last print: {format_minutes_to_hhmm(current_downtime)}")
    else:
        # Если печатей не было или нет завершенных, считаем с момента добавления принтера в систему
        current_downtime = (current_time - printer.created_at).total_seconds() / 60
        print(f"Printer {printer_id} idle time since creation: {format_minutes_to_hhmm(current_downtime)}")
    
    # Обновляем общее время простоя в БД
    total_downtime = (printer.total_downtime or 0) + current_downtime
    printer_dal.update(db, printer_id, {"total_downtime": total_downtime})
    
    return total_downtime

def complete_printing(db: Session, printing_id: int, auto_complete: bool = False):
    printing = get_printing(db, printing_id)
    if not printing or printing.real_time_stop is not None:
        return None
    
    printer = get_printer(db, printing.printer_id)
    if not printer:
        return None
    
    current_time = datetime.now()
    printing.real_time_stop = current_time
    
    # Обновляем статус печати
    if auto_complete:
        printing.status = "completed"
        printer_dal.update(db, printer.id, {"status": "waiting"})
    else:
        printing.status = "completed"
        # Вычисляем фактическое время печати без учета простоев в минутах
        actual_printing_time = (current_time - printing.start_time).total_seconds() / 60
        
        if printing.downtime:
            actual_printing_time -= printing.downtime
        
        # Обновляем общее время работы принтера
        total_print_time = (printer.total_print_time or 0) + actual_printing_time
        printer_dal.update(db, printer.id, {
            "status": "idle",
            "total_print_time": total_print_time
        })
    
    # Сохраняем изменения в печати
    db.add(printing)
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
    printing.status = "paused"
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
        # Обновляем время простоя (в минутах)
        pause_duration = (current_time - printing.pause_time).total_seconds() / 60
        printing.downtime = (printing.downtime or 0) + pause_duration
        # Корректируем ожидаемое время завершения
        if printing.calculated_time_stop:
            printing.calculated_time_stop = printing.calculated_time_stop + \
                (current_time - printing.pause_time)
    
    printer.status = "printing"
    printing.status = "printing"
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
    printing.status = "cancelled"  # Изменено с "aborted" на "cancelled" для соответствия с фронтендом
    
    # Вычисляем фактическое время печати (в минутах)
    actual_printing_time = (current_time - printing.start_time).total_seconds() / 60
    
    # Вычитаем время простоя
    if printing.downtime:
        actual_printing_time -= printing.downtime
    
    # Обновляем статистику принтера
    total_print_time = (printer.total_print_time or 0) + actual_printing_time
    printer.status = "idle"
    printer.total_print_time = total_print_time
    
    # Сохраняем изменения
    db.add(printing)
    db.add(printer)
    db.commit()
    
    # Обновляем объект печати из базы данных
    db.refresh(printing)
    return printing