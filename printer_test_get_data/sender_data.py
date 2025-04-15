from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
from typing import Dict, Any

app = FastAPI()

# Монтируем папку static для CSS/JS (если нужно)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Настройка шаблонов Jinja2
templates = Jinja2Templates(directory="templates")

# Глобальная переменная для хранения последних данных (можно заменить на БД)
latest_printer_data: Dict[str, Any] = {}

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)