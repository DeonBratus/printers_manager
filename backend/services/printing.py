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
    try:
        printing = printing_dal.get(db, printing_id)
        if not printing:
            return None
            
        # По умолчанию прогресс
        printing.progress = 0
            
        # Добавляем имена принтера и модели
        try:
            printer = printer_service.get_printer(db, printing.printer_id) if printing.printer_id else None
            model = model_service.get_model(db, printing.model_id) if printing.model_id else None
            printing.printer_name = printer.name if printer else "Unknown Printer"
            printing.model_name = model.name if model else "Unknown Model"
        except Exception as e:
            print(f"Error getting printer/model details: {str(e)}")
            printing.printer_name = "Unknown Printer"
            printing.model_name = "Unknown Model"
            
        # Если печать завершена, прогресс = 100%
        if printing.real_time_stop or printing.status in ["completed", "cancelled"]:
            printing.progress = 100
            return printing
            
        # Вычисляем прогресс для активных печатей
        try:
            if printing.start_time:
                current_time = datetime.now()
                
                if printing.calculated_time_stop:
                    # Если есть расчётное время окончания
                    total_time = (printing.calculated_time_stop - printing.start_time).total_seconds()
                    elapsed_time = (current_time - printing.start_time).total_seconds()
                    
                    if total_time > 0:
                        printing.progress = min(100, (elapsed_time / total_time) * 100)
                    else:
                        printing.progress = 100
                elif printing.printing_time:
                    # Если нет calculated_time_stop, но есть printing_time
                    total_seconds = printing.printing_time * 3600  # переводим часы в секунды
                    elapsed_time = (current_time - printing.start_time).total_seconds()
                    
                    if total_seconds > 0:
                        printing.progress = min(100, (elapsed_time / total_seconds) * 100)
                    else:
                        printing.progress = 0
                else:
                    # Если нет ни расчётного времени окончания, ни printing_time
                    printing.progress = 0
                    
                # Автоматически завершаем печать при достижении 100%
                if printing.progress >= 100 and printing.status == "printing":
                    try:
                        from printer_control import complete_printing
                        complete_printing(db, printing.id, auto_complete=True)
                        # Перезагружаем данные печати после автозавершения
                        printing = printing_dal.get(db, printing_id)
                        if printing:
                            printing.progress = 100
                            # Повторно получаем имена принтера и модели
                            printer = printer_service.get_printer(db, printing.printer_id) if printing.printer_id else None
                            model = model_service.get_model(db, printing.model_id) if printing.model_id else None
                            printing.printer_name = printer.name if printer else "Unknown Printer"
                            printing.model_name = model.name if model else "Unknown Model"
                    except Exception as e:
                        print(f"Error auto-completing printing: {str(e)}")
        except Exception as e:
            print(f"Error calculating progress for printing {printing_id}: {str(e)}")
            # В случае ошибки используем безопасное значение
            printing.progress = 0
            
        return printing
    except Exception as e:
        print(f"Unexpected error in get_printing_with_details for printing {printing_id}: {str(e)}")
        return None

def get_printings(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False):
    try:
        printings = printing_dal.get_all(db, skip, limit, sort_by, sort_desc)
        result = []
        
        for p in printings:
            try:
                printing_with_details = get_printing_with_details(db, p.id)
                if printing_with_details:
                    result.append(printing_with_details)
            except Exception as e:
                print(f"Error processing printing {p.id}: {str(e)}")
                # Добавляем базовые детали без расчета прогресса
                p.progress = 0
                p.printer_name = "Unknown Printer"
                p.model_name = "Unknown Model"
                result.append(p)
                
        return result
    except Exception as e:
        print(f"Error in get_printings: {str(e)}")
        return []

def update_printing(db: Session, printing_id: int, printing: PrintingCreate):
    return printing_dal.update(db, printing_id, printing.dict())

def delete_printing(db: Session, printing_id: int):
    return printing_dal.delete(db, printing_id)
