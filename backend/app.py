from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles
import uvicorn
from auth.router import router as auth_router
from routers import tdim_models
from background_tasks import start_scheduler
import os
from pathlib import Path

from database import engine
from models import Base
from routers import printers, printings, reports, printer_parameters, studios

app = FastAPI(
    title="3D Printer Management API",
    description="API for managing 3D printers, models and print jobs",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://83.222.17.92:3000", "http://83.222.17.92:8000"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers
)

# Инициализация базы данных
Base.metadata.create_all(bind=engine)

# Создаем директорию для аватаров, если она не существует
AVATAR_DIR = Path("uploads/avatars")
AVATAR_DIR.mkdir(parents=True, exist_ok=True)

# Добавляем статические файлы для аватаров
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Подключаем роутеры
app.include_router(printers.router)
app.include_router(printings.router)
app.include_router(tdim_models.router)
app.include_router(reports.router)
app.include_router(printer_parameters.router)
app.include_router(auth_router)
app.include_router(studios.router)

# Запускаем планировщик при старте приложения
@app.on_event("startup")
async def startup_event():
    start_scheduler()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
