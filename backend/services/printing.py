from sqlalchemy.orm import Session
from datetime import datetime
from dal import printing as printing_dal
from dal import printer as printer_dal
from schemas import PrintingCreate
from . import printer as printer_service 
from . import model as model_service

def create_printing(db: Session, printing: PrintingCreate):
    try:
        printer = printer_service.get_printer(db, printing.printer_id)
        model = model_service.get_model(db, printing.model_id)
        
        if not printer or not model:
            return None
            
        printing_data = printing.dict()
        db_printing = printing_dal.create(db, printing_data)
        
        # Обновляем статус принтера
        printer_dal.update(db, printer.id, {"status": "printing"})
        
        # Добавляем дополнительные поля для ответа
        db_printing.printer_name = printer.name
        db_printing.model_name = model.name
        db_printing.progress = 0
        
        return db_printing
    except Exception as e:
        print(f"Error in create_printing: {str(e)}")
        raise

def get_printing(db: Session, printing_id: int):
    return printing_dal.get(db, printing_id)

def get_printing_with_details(db: Session, printing_id: int):
    printing = printing_dal.get(db, printing_id)
    if printing:
        # Вычисляем прогресс
        if not printing.real_time_stop:
            if printing.calculated_time_stop and printing.start_time:
                total_time = (printing.calculated_time_stop - printing.start_time).total_seconds()
                elapsed_time = (datetime.now() - printing.start_time).total_seconds()
                printing.progress = min(100, (elapsed_time / (total_time + 0.0000001)) * 100)
                
                # Автоматически завершаем печать при достижении 100%
                if printing.progress >= 100:
                    from printer_control import complete_printing
                    complete_printing(db, printing.id, auto_complete=True)
                    # Перезагружаем данные печати после автозавершения
                    printing = printing_dal.get(db, printing_id)
            else:
                # Если нет calculated_time_stop, используем printing_time
                elapsed_time = (datetime.now() - printing.start_time).total_seconds()
                total_time = printing.printing_time * 3600  # переводим часы в секунды
                printing.progress = min(100, (elapsed_time / (total_time + 0.0000001)) * 100)
        else:
            printing.progress = 100
            
        # Добавляем имена принтера и модели
        printer = printer_service.get_printer(db, printing.printer_id)
        model = model_service.get_model(db, printing.model_id)
        printing.printer_name = printer.name if printer else "Unknown Printer"
        printing.model_name = model.name if model else "Unknown Model"
            
    return printing

def get_printings(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False):
    printings = printing_dal.get_all(db, skip, limit, sort_by, sort_desc)
    return [get_printing_with_details(db, p.id) for p in printings]

def update_printing(db: Session, printing_id: int, printing: PrintingCreate):
    return printing_dal.update(db, printing_id, printing.dict())

def delete_printing(db: Session, printing_id: int):
    return printing_dal.delete(db, printing_id)
