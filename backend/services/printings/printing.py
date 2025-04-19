from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from dal import printing as printing_dal
from dal import printer as printer_dal
from schemas import PrintingCreate
from services.printers.printer import get_printer
from services import ModelService
from models.models import Printer, Printing

class PrintingService():
    def create_printing(self, db: Session, printing: PrintingCreate):
        try:
            printer = get_printer(self, db, printing.printer_id)
            model = ModelService.get_model(self, db, printing.model_id)
            
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
            
            self, db_printing = printing_dal.create(self, db, printing_data)
            
            # Обновляем статус принтера
            printer_dal.update(self, db, printer.id, {"status": "printing"})
            
            # Добавляем дополнительные поля для ответа
            self, db_printing.printer_name = printer.name
            self, db_printing.model_name = model.name
            self, db_printing.progress = 0
            
            return self, db_printing
        except Exception as e:
            print(f"Error in create_printing: {str(e)}")
            raise

    def get_printing(self, db: Session, printing_id: int):
        return printing_dal.get(self, db, printing_id)

    def get_printing_with_details(self, db: Session, printing_id: int):
        try:
            printing = printing_dal.get(self, db, printing_id)
            if not printing:
                return None
                
            # По умолчанию прогресс
            printing.progress = 0
                
            # Добавляем имена принтера и модели
            try:
                printer = get_printer(self, db, printing.printer_id) if printing.printer_id else None
                model = ModelService.get_model(self, db, printing.model_id) if printing.model_id else None
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
                            from services.printers.printer_control import complete_printing
                            complete_printing(self, db, printing.id, auto_complete=True)
                            # Перезагружаем данные печати после автозавершения
                            printing = printing_dal.get(self, db, printing_id)
                            if printing:
                                printing.progress = 100
                                # Повторно получаем имена принтера и модели
                                printer = get_printer(self, db, printing.printer_id) if printing.printer_id else None
                                model = ModelService.get_model(self, db, printing.model_id) if printing.model_id else None
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

    def get_printings(self, db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False, studio_id: int = None):
        try:
            printings: Printing = printing_dal.get_all(self, db, skip, limit, sort_by, sort_desc, studio_id)
            result = []
            
            for p in printings:
                try:
                    printing_with_details = self.get_printing_with_details(self, db, p.id)
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

    def update_printing(self, db: Session, printing_id: int, printing: PrintingCreate):
        return printing_dal.update(self, db, printing_id, printing.dict())

    def delete_printing(self, db: Session, printing_id: int):
        return printing_dal.delete(self, db, printing_id)