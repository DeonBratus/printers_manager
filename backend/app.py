from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles
import uvicorn

from routers.tdim_models import router as models_router
from routers.printers import router as printer_router
from routers.printings import router as printings_router
from routers.printer_parameters import router as printer_params_router
from routers.reports import router as report_router

from auth.router import router as auth_router
from routers.studios import router as studio_router
from routers.invitations import router as invitations_router
from routers.members import router as members_router

from services.printers.background_tasks import start_scheduler
from pathlib import Path

from db.database import engine
from models.models import Base

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
app.include_router(printer_router)

app.include_router(printings_router)
app.include_router(models_router)
app.include_router(printer_params_router)
app.include_router(report_router)
app.include_router(members_router)
app.include_router(invitations_router)
app.include_router(studio_router)
app.include_router(auth_router)


# Запускаем планировщик при старте приложения
@app.on_event("startup")
async def startup_event():
    start_scheduler()
    ...


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
