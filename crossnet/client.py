# client.py
import httpx
import asyncio
from fastapi import FastAPI
import uvicorn
import time
from typing import Optional, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
SERVER_URL = "http://localhost:8000"  # URL вашего сервера
POLL_INTERVAL = 5

class ClientState:
    def __init__(self):
        self.last_activity = ""
        self.last_error = ""
        self.activity_log = []

client_state = ClientState()

def log_activity(message: str):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {message}"
    client_state.last_activity = log_entry
    client_state.activity_log.append(log_entry)
    logger.info(log_entry)

async def mock_moonraker_request(printer_ip: str, command: Dict) -> Dict:
    """Мок-функция для тестирования без реального принтера"""
    log_activity(f"Mock request to {printer_ip}: {command}")
    await asyncio.sleep(1)  # Имитация задержки сети
    
    # Генерируем правдоподобные ответы для разных команд
    if command.get("endpoint", "").startswith("/printer/objects/query"):
        return {
            "status": "success",
            "response": {
                "print_stats": {
                    "state": "printing",
                    "filename": "test.gcode",
                    "total_duration": 3567.8
                }
            }
        }
    elif command.get("endpoint", "").startswith("/printer/print/"):
        return {"status": "success", "response": {"action": "ok"}}
    
    return {"status": "success", "response": {"mock": True}}

async def poll_server():
    while True:
        try:
            async with httpx.AsyncClient() as client:
                # 1. Проверяем новые задачи
                log_activity("Checking for new tasks...")
                resp = await client.get(f"{SERVER_URL}/api/tasks/")
                
                if resp.status_code == 200:
                    tasks = resp.json()
                    for task in tasks["pending"]:
                        task_id = task["task_id"]
                        printer_id = task["printer_id"]
                        command = task["command"]
                        params = task.get("params", {})
                        
                        log_activity(f"Processing task {task_id}: {command} for printer {printer_id}")
                        
                        # 2. Получаем данные принтера
                        printer_resp = await client.get(f"{SERVER_URL}/api/printers/{printer_id}")
                        if printer_resp.status_code == 200:
                            printer = printer_resp.json()
                            
                            # 3. Имитируем запрос к Moonraker
                            result = await mock_moonraker_request(
                                printer["ip"],
                                {"command": command, **params}
                            )
                            
                            # 4. Отправляем результат на сервер
                            await client.post(
                                f"{SERVER_URL}/api/client/response/{task_id}",
                                json=result
                            )
                            log_activity(f"Task {task_id} completed")
                
                await asyncio.sleep(POLL_INTERVAL)
                
        except httpx.ConnectError:
            error_msg = "Connection to server failed"
            client_state.last_error = error_msg
            logger.error(error_msg)
            await asyncio.sleep(10)
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            client_state.last_error = error_msg
            logger.error(error_msg)
            await asyncio.sleep(10)

@app.on_event("startup")
async def startup_event():
    log_activity("Client started")
    asyncio.create_task(poll_server())

@app.get("/status/")
async def get_status():
    return {
        "last_activity": client_state.last_activity,
        "last_error": client_state.last_error,
        "log": client_state.activity_log[-10:]  # Последние 10 записей
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)