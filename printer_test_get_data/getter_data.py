from fastapi import FastAPI, Request, Body
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
from typing import Dict, Any, List
from pydantic import BaseModel

app = FastAPI()

# Монтируем папку static для CSS/JS (если нужно)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Настройка шаблонов Jinja2
templates = Jinja2Templates(directory="templates")

# Глобальная переменная для хранения последних данных (можно заменить на БД)
latest_printer_data: Dict[str, Any] = {}

# Модель для принтера
class Printer(BaseModel):
    name: str
    ip_address: str

# Список принтеров
printers: List[Printer] = []

@app.post("/receive_data")
async def receive_data(request: Request):
    """Принимает данные от клиента и сохраняет их."""
    global latest_printer_data
    data = await request.json()
    latest_printer_data = data
    print("Данные обновлены:", latest_printer_data)  # Для отладки
    return {"message": "Data received successfully"}

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Отображает веб-страницу с данными."""
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "data": latest_printer_data}
    )

@app.get("/api/data")
async def get_latest_data():
    """API-эндпоинт для получения данных (используется JavaScript-ом)."""
    return latest_printer_data

# Новые endpoint'ы для управления списком принтеров
@app.get("/api/printers")
async def get_printers():
    """Получение списка принтеров"""
    return printers

@app.post("/api/printers")
async def add_printer(printer: Printer):
    """Добавление нового принтера"""
    printers.append(printer)
    return {"message": "Printer added successfully", "printer": printer}

@app.delete("/api/printers/{printer_name}")
async def delete_printer(printer_name: str):
    """Удаление принтера по имени"""
    global printers
    original_count = len(printers)
    printers = [p for p in printers if p.name != printer_name]
    
    if len(printers) < original_count:
        return {"message": f"Printer '{printer_name}' deleted successfully"}
    return {"message": f"Printer '{printer_name}' not found"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)