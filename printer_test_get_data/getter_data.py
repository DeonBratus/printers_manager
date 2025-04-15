from fastapi import FastAPI, Request, Body
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
from typing import Dict, Any, List
from pydantic import BaseModel
import logging
import json
import time

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("printer_getter")

app = FastAPI()

# Монтируем папку static для CSS/JS (если нужно)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Настройка шаблонов Jinja2
templates = Jinja2Templates(directory="templates")

# Словарь для хранения данных всех принтеров, ключ - имя принтера
printers_data: Dict[str, Dict[str, Any]] = {}

# Модель для принтера
class Printer(BaseModel):
    name: str
    ip_address: str

# Список принтеров
printers: List[Printer] = []

@app.post("/receive_data")
async def receive_data(request: Request):
    """Принимает данные от клиента и сохраняет их."""
    global printers_data
    data = await request.json()
    printer_name = data.get("printer_name")
    
    if printer_name:
        logger.info(f"Получены данные от принтера: {printer_name}")
        logger.debug(f"Содержимое данных: {json.dumps(data, indent=2)}")
        
        # Сохраняем данные в словаре
        printers_data[printer_name] = data
        
        # Извлекаем и логируем некоторую ключевую информацию для мониторинга
        status = data.get("status", "неизвестно")
        timestamp = data.get("timestamp", time.time())
        
        if "result" in data and isinstance(data["result"], dict):
            result = data["result"]
            if "status_data" in result:
                status_details = "Данные о статусе получены"
                logger.info(f"Принтер {printer_name}: статус={status}, {status_details}")
            else:
                logger.info(f"Принтер {printer_name}: статус={status}, данные сохранены")
        else:
            logger.warning(f"Принтер {printer_name}: получены данные в неожиданном формате")
        
        return {"message": "Data received successfully", "printer": printer_name}
    else:
        logger.warning("Получены данные без указания имени принтера")
        logger.debug(f"Содержимое данных без имени: {json.dumps(data, indent=2)}")
        return {"message": "Error: missing printer_name", "status": "error"}

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Отображает веб-страницу с данными."""
    logger.info("Запрос главной страницы")
    return templates.TemplateResponse(
        "index.html",
        {"request": request}
    )

@app.get("/api/data")
async def get_latest_data():
    """API-эндпоинт для получения данных о всех принтерах."""
    logger.debug(f"Запрос данных о всех принтерах. Доступно принтеров: {len(printers_data)}")
    return printers_data

@app.get("/api/data/{printer_name}")
async def get_printer_data(printer_name: str):
    """Получение данных для конкретного принтера."""
    logger.debug(f"Запрос данных о принтере: {printer_name}")
    if printer_name in printers_data:
        return printers_data[printer_name]
    logger.warning(f"Запрос данных для несуществующего принтера: {printer_name}")
    return {"error": "Printer not found"}

# Endpoint'ы для управления списком принтеров
@app.get("/api/printers")
async def get_printers():
    """Получение списка принтеров"""
    logger.debug(f"Запрос списка принтеров. Доступно принтеров: {len(printers)}")
    return printers

@app.post("/api/printers")
async def add_printer(printer: Printer):
    """Добавление нового принтера"""
    logger.info(f"Добавление нового принтера: {printer.name} ({printer.ip_address})")
    printers.append(printer)
    return {"message": "Printer added successfully", "printer": printer}

@app.delete("/api/printers/{printer_name}")
async def delete_printer(printer_name: str):
    """Удаление принтера по имени"""
    global printers
    global printers_data
    
    logger.info(f"Запрос на удаление принтера: {printer_name}")
    original_count = len(printers)
    printers = [p for p in printers if p.name != printer_name]
    
    # Удаляем данные принтера, если они есть
    if printer_name in printers_data:
        del printers_data[printer_name]
        logger.info(f"Данные принтера {printer_name} удалены")
    
    if len(printers) < original_count:
        logger.info(f"Принтер {printer_name} успешно удален")
        return {"message": f"Printer '{printer_name}' deleted successfully"}
    
    logger.warning(f"Принтер {printer_name} не найден при попытке удаления")
    return {"message": f"Printer '{printer_name}' not found"}

@app.on_event("startup")
async def startup_event():
    """Выполняется при запуске сервера"""
    logger.info("Сервер получения данных с принтеров запущен")
    logger.info("Ожидание данных...")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)