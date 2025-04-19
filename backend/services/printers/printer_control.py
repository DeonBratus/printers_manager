from sqlalchemy.orm import Session
from datetime import datetime
from models.models import Printer, Printing
from services.printers.printer import format_minutes_to_hhmm, get_printer
from services import PrintingService
from dal import printer as printer_dal


def calculate_printer_downtime(db: Session, printer_id: int, current_time: datetime = None) -> float:
    """
    Вычисляет полное время простоя принтера с момента последней активности.
    Используется при изменении статуса принтера с активного на неактивный.
    Возвращает время простоя в минутах.
    """
    if current_time is None:
        current_time = datetime.now()
        
    printer = get_printer(db, printer_id)
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

def update_printer_status(db: Session, printer_id: int, new_status: str) -> Printer:
    """
    Обновляет статус принтера с учётом изменения режима работы.
    При переходе из активного состояния в неактивное, обновляет время простоя.
    """
    printer = get_printer(db, printer_id)
    if not printer:
        return None
        
    # Если статус не изменился, просто возвращаем принтер
    if printer.status == new_status:
        return printer
        
    # Проверяем переход из активного состояния в неактивное
    active_states = ["printing", "paused"]
    inactive_states = ["idle", "waiting", "error"]
    
    # Обновляем статус
    printer_dal.update(db, printer_id, {"status": new_status})
    
    # Обновляем принтер из базы данных
    db.refresh(printer)
    return printer

def complete_printing(db: Session, printing_id: int, auto_complete: bool = False):
    printing = PrintingService.get_printing(db, printing_id)
    if not printing:
        return None
    
    printer = get_printer(db, printing.printer_id)
    if not printer:
        return None
    
    current_time = datetime.now()
    # Always set the real_time_stop field
    if not printing.real_time_stop:
        printing.real_time_stop = current_time
    
    # Обновляем статус печати
    if auto_complete:
        printing.status = "completed"
        update_printer_status(db, printer.id, "waiting")
    else:
        printing.status = "completed"
        # Вычисляем фактическое время печати без учета простоев в минутах
        actual_printing_time = (current_time - printing.start_time).total_seconds() / 60
        
        if printing.downtime:
            actual_printing_time -= printing.downtime
        
        # Обновляем общее время работы принтера
        total_print_time = (printer.total_print_time or 0) + actual_printing_time
        
        # Обновляем статус принтера на idle и общее время печати
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
    printing = PrintingService.get_printing(db, printing_id)
    if not printing or printing.real_time_stop is not None:
        return None
    
    printer = get_printer(db, printing.printer_id)
    if not printer:
        return None
    
    # Обновляем статус принтера на "paused"
    update_printer_status(db, printer.id, "paused")
    
    printing.status = "paused"
    printing.pause_time = datetime.now()
    
    db.add(printing)
    db.commit()
    db.refresh(printing)
    return printing

def resume_printing(db: Session, printing_id: int):
    printing = PrintingService.get_printing(db, printing_id)
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
    
    # Обновляем статус принтера на "printing"
    update_printer_status(db, printer.id, "printing")
    
    printing.status = "printing"
    printing.pause_time = None
    
    db.add(printing)
    db.commit()
    db.refresh(printing)
    return printing

def cancel_printing(db: Session, printing_id: int):
    printing = PrintingService.get_printing(db, printing_id)
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
    
    # Обновляем статус принтера на "idle" и общее время печати
    printer_dal.update(db, printer.id, {
        "status": "idle",
        "total_print_time": total_print_time
    })
    
    # Сохраняем изменения
    db.add(printing)
    db.commit()
    
    # Обновляем объект печати из базы данных
    db.refresh(printing)
    return printing