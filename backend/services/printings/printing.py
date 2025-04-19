from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from dal import printing as printing_dal
from dal import printer as printer_dal
from schemas import PrintingCreate
from services import PrinterService
from services import ModelService
from models.models import Printer, Printing, Model

class PrintingService():

    def create_printing(db: Session, printing: PrintingCreate):
        try:
            print(printing.printer_id, printing.model_id)
            printer: Printer = PrinterService.get_printer(db, printing.printer_id)
            model: Model = ModelService.get_model(db, printing.model_id)
            print(f"{printer.name} and {model.name}")
            if not printer or not model:
                return None
                
            printing_data = printing.dict()
            
            # Если время печати не указано, берем из модели
            if not printing_data.get('printing_time'):
                printing_data['printing_time'] = model.printing_time
                
            # Устанавливаем время начала печати, если не задано
            if not printing_data.get('start_time'):
                printing_data['start_time'] = datetime.now()
                
            # Рассчитываем предполагаемое время завершения в минутах
            if printing_data.get('printing_time'):
                # Конвертируем минуты в секунды для timedelta
                seconds = printing_data['printing_time'] * 60
                printing_data['calculated_time_stop'] = printing_data['start_time'] + timedelta(seconds=seconds)
            
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
                printer = PrinterService.get_printer(db, printing.printer_id) if printing.printer_id else None
                model = ModelService.get_model(db, printing.model_id) if printing.model_id else None
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
                        # Если нет calculated_time_stop, но есть printing_time (в минутах)
                        total_seconds = printing.printing_time * 60  # переводим минуты в секунды
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
                            __class__.complete_printing(db, printing.id, auto_complete=True)
                            # Перезагружаем данные печати после автозавершения
                            printing = printing_dal.get(db, printing_id)
                            if printing:
                                printing.progress = 100
                                # Повторно получаем имена принтера и модели
                                printer = PrinterService.get_printer(db, printing.printer_id) if printing.printer_id else None
                                model = ModelService.get_model(db, printing.model_id) if printing.model_id else None
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

    def get_printings(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False, studio_id: int = None):
        try:
            printings: Printing = printing_dal.get_all(db, skip, limit, sort_by, sort_desc, studio_id)
            result = []
            
            for p in printings:
                try:
                    printing_with_details = __class__.get_printing_with_details(db, p.id)
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
    


    def complete_printing(db: Session, printing_id: int, auto_complete: bool = False):
        printing = PrintingService.get_printing(db, printing_id)
        if not printing:
            return None
        
        printer = PrinterService.get_printer(db, printing.printer_id)
        if not printer:
            return None
        
        current_time = datetime.now()
        # Always set the real_time_stop field
        if not printing.real_time_stop:
            printing.real_time_stop = current_time
        
        # Обновляем статус печати
        if auto_complete:
            printing.status = "completed"
            PrinterService.update_printer_status(db, printer.id, "waiting")
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
        
        printer =PrinterService. get_printer(db, printing.printer_id)
        if not printer:
            return None
        
        # Обновляем статус принтера на "paused"
        PrinterService.update_printer_status(db, printer.id, "paused")
        
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
        
        printer = PrinterService.get_printer(db, printing.printer_id)
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
        PrinterService.update_printer_status(db, printer.id, "printing")
        
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
        
        printer = PrinterService.get_printer(db, printing.printer_id)
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