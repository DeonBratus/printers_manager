from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import List, Optional
import uvicorn
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.requests import Request
from background_tasks import start_scheduler

from database import get_db, engine
from models import Base
from sqlalchemy.orm import Session
from routers import printers, printings, models, reports

app = FastAPI(
    title="3D Printer Management API",
    description="API for managing 3D printers, models and print jobs",
    version="1.0.0"
)

origins = [
    "http://localhost",
    "http://127.0.0.1",
    "http://localhost:3000",  # для Live Server в VSCode
    "http://localhost:3001"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Инициализация базы данных
Base.metadata.create_all(bind=engine)


# Подключаем роутеры
app.include_router(printers.router)
app.include_router(printings.router)
app.include_router(models.router)
app.include_router(reports.router)

# Запускаем планировщик при старте приложения
@app.on_event("startup")
async def startup_event():
    start_scheduler()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)