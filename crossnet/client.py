# client.py
import httpx
import asyncio
from fastapi import FastAPI
import uvicorn
from devices import get_printer
from typing import Dict, Optional

app = FastAPI()
SERVER_URL = "http://localhost:8000"  # Замените на реальный адрес сервера
POLL_INTERVAL = 3  # Интервал опроса сервера в секундах

async def execute_moonraker_request(printer_id: str, command: Dict) -> Optional[Dict]:
    """Выполняет запрос к Moonraker API"""
    printer = get_printer(printer_id)
    if not printer:
        print(f"Printer {printer_id} not found")
        return None
    
    base_url = f"http://{printer.ip_address}"
    endpoint = command["endpoint"]
    url = f"{base_url}{endpoint}"
    
    headers = {}
    if printer.api_key:
        headers["X-Api-Key"] = printer.api_key
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            method = command["method"].lower()
            
            kwargs = {
                "headers": headers,
                "params": command.get("params"),
                "json": command.get("data")
            }
            
            # Удаляем None значения
            kwargs = {k: v for k, v in kwargs.items() if v is not None}
            
            response = await getattr(client, method)(url, **kwargs)
            
            return {
                "status": "success",
                "status_code": response.status_code,
                "response": response.json() if response.content else None
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

async def poll_tasks():
    """Периодически опрашивает сервер на наличие задач"""
    while True:
        try:
            async with httpx.AsyncClient() as client:
                # Получаем список активных задач
                response = await client.get(f"{SERVER_URL}/tasks/")
                if response.status_code == 200:
                    tasks = response.json()
                    
                    # Обрабатываем каждую задачу
                    for task_id, task_data in tasks.items():
                        if task_data["status"] == "pending":
                            # Получаем детали задачи
                            task_detail = await client.get(f"{SERVER_URL}/tasks/{task_id}")
                            if task_detail.status_code == 200:
                                task = task_detail.json()
                                
                                # Выполняем запрос к принтеру
                                result = await execute_moonraker_request(
                                    task["printer_id"],
                                    task["command"]
                                )
                                
                                # Отправляем результат на сервер
                                if result:
                                    await client.post(
                                        f"{SERVER_URL}/client/upload/{task_id}",
                                        json=result
                                    )
            
            await asyncio.sleep(POLL_INTERVAL)
        except Exception as e:
            print(f"Polling error: {e}")
            await asyncio.sleep(10)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(poll_tasks())

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)