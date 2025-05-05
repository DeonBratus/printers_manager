# server.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
import uuid
import uvicorn
from commands import get_command, COMMAND_POOL
from devices import PrinterDevice, add_printer, get_printer, list_printers

app = FastAPI()

# Хранилище задач и результатов
tasks_db = {}
results_db = {}

class TaskRequest(BaseModel):
    printer_id: str
    command_name: str
    command_args: Optional[Dict] = None

class PrinterCreateRequest(BaseModel):
    ip_address: str
    name: str
    api_key: Optional[str] = None
    description: Optional[str] = None

@app.post("/printers/", status_code=201)
async def register_printer(printer_id: str, printer_data: PrinterCreateRequest):
    printer = PrinterDevice(**printer_data.dict())
    add_printer(printer_id, printer)
    return {"status": "registered", "printer_id": printer_id}

@app.get("/printers/")
async def get_all_printers():
    return list_printers()

@app.get("/commands/")
async def get_available_commands():
    return list(COMMAND_POOL.keys())

@app.get("/tasks/")
async def get_all_tasks():
    return tasks_db

@app.post("/tasks/")
async def create_task(task: TaskRequest):
    # Проверяем существование принтера
    printer = get_printer(task.printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    # Получаем команду
    try:
        command = get_command(task.command_name, **(task.command_args or {}))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Создаем задачу
    task_id = str(uuid.uuid4())
    tasks_db[task_id] = {
        "printer_id": task.printer_id,
        "command": command,
        "status": "pending"
    }
    
    return {"task_id": task_id, "status": "queued"}

@app.get("/tasks/{task_id}")
async def get_task_result(task_id: str):
    if task_id in results_db:
        return results_db[task_id]
    elif task_id in tasks_db:
        return {"status": tasks_db[task_id]["status"]}
    raise HTTPException(status_code=404, detail="Task not found")

@app.post("/client/upload/{task_id}")
async def upload_result(task_id: str, result: Dict):
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")
    
    tasks_db[task_id]["status"] = "completed"
    results_db[task_id] = result
    return {"status": "result_uploaded"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)