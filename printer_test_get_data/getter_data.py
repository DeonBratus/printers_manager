from fastapi import FastAPI, Request, Body, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging
import json
import time
import uuid
from enum import Enum

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

# Статус команды
class CommandStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

# Модель команды
class PrinterCommand(BaseModel):
    command_id: str
    printer_name: str
    command_type: str
    parameters: Dict[str, Any]
    status: CommandStatus = CommandStatus.PENDING
    result: Optional[Dict[str, Any]] = None
    created_at: float
    updated_at: float
    
# Класс для создания новой команды
class CreateCommand(BaseModel):
    printer_name: str
    command_type: str
    parameters: Dict[str, Any] = {}

# Хранилище команд
# Структура: {printer_name: {command_id: PrinterCommand}}
printer_commands: Dict[str, Dict[str, PrinterCommand]] = {}

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

# API для управления командами принтеров
@app.post("/api/commands", response_model=PrinterCommand)
async def create_command(command: CreateCommand):
    """Создание новой команды для принтера"""
    printer_name = command.printer_name
    
    # Проверяем, существует ли принтер
    if not any(p.name == printer_name for p in printers):
        raise HTTPException(status_code=404, detail=f"Printer '{printer_name}' not found")
    
    # Создаем команду
    now = time.time()
    command_id = str(uuid.uuid4())
    
    new_command = PrinterCommand(
        command_id=command_id,
        printer_name=printer_name,
        command_type=command.command_type,
        parameters=command.parameters,
        created_at=now,
        updated_at=now
    )
    
    # Инициализируем словарь команд для принтера, если его еще нет
    if printer_name not in printer_commands:
        printer_commands[printer_name] = {}
    
    # Сохраняем команду
    printer_commands[printer_name][command_id] = new_command
    
    logger.info(f"Создана новая команда {command_id} для принтера {printer_name}: {command.command_type}")
    logger.debug(f"Параметры команды: {json.dumps(command.parameters, indent=2)}")
    
    return new_command

@app.get("/api/commands")
async def get_all_commands():
    """Получение всех команд для всех принтеров"""
    all_commands = []
    for printer_cmds in printer_commands.values():
        all_commands.extend(printer_cmds.values())
    
    # Сортируем команды по времени создания (сначала новые)
    all_commands.sort(key=lambda x: x.created_at, reverse=True)
    
    return all_commands

@app.get("/api/commands/{printer_name}")
async def get_printer_commands(printer_name: str):
    """Получение команд для конкретного принтера"""
    if printer_name not in printer_commands:
        return []
    
    # Получаем команды и сортируем по времени создания
    cmds = list(printer_commands[printer_name].values())
    cmds.sort(key=lambda x: x.created_at, reverse=True)
    
    return cmds

@app.get("/api/commands/{printer_name}/pending")
async def get_pending_commands(printer_name: str):
    """Получение ожидающих команд для конкретного принтера"""
    if printer_name not in printer_commands:
        return []
    
    # Фильтруем только ожидающие команды
    pending_cmds = [
        cmd for cmd in printer_commands[printer_name].values() 
        if cmd.status == CommandStatus.PENDING
    ]
    
    # Сортируем по времени создания (сначала старые, чтобы выполнялись в порядке очереди)
    pending_cmds.sort(key=lambda x: x.created_at)
    
    return pending_cmds

@app.post("/api/commands/{command_id}/update", response_model=PrinterCommand)
async def update_command_status(
    command_id: str, 
    data: Dict[str, Any] = Body(...)
):
    """Обновление статуса команды"""
    # Извлекаем данные из тела запроса
    status = data.get("status")
    result = data.get("result")
    
    # Проверяем, что status - это валидное значение перечисления CommandStatus
    if status not in [s.value for s in CommandStatus]:
        raise HTTPException(status_code=400, detail=f"Invalid status value: {status}")
        
    # Ищем команду во всех принтерах
    for printer_name, commands in printer_commands.items():
        if command_id in commands:
            cmd = commands[command_id]
            cmd.status = status
            cmd.updated_at = time.time()
            
            if result is not None:
                cmd.result = result
            
            logger.info(f"Обновлен статус команды {command_id} для принтера {printer_name}: {status}")
            if result:
                logger.debug(f"Результат команды: {json.dumps(result, indent=2)}")
            
            return cmd
    
    raise HTTPException(status_code=404, detail=f"Command with ID {command_id} not found")

@app.on_event("startup")
async def startup_event():
    """Выполняется при запуске сервера"""
    logger.info("Сервер получения данных с принтеров запущен")
    logger.info("Ожидание данных...")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)