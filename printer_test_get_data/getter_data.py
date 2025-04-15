from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
import uvicorn
from pydantic import BaseModel
from typing import Optional, Dict, Any

app = FastAPI()

# Модель для валидации входящих данных (опционально)
class PrinterData(BaseModel):
    result: Dict[str, Any]
    # Можно добавить дополнительные поля, если нужно

@app.post("/receive_data")
async def receive_data(request: Request):
    """Принимает данные от клиента и выводит их в консоль."""
    try:
        data = await request.json()
        if not data:
            raise HTTPException(status_code=400, detail="No data received")
        
        # Вывод данных в консоль
        print("\n--- Получены данные с принтера (FastAPI) ---")
        print(f"Статус печати: {data['result']['status']['print_stats']['state']}")
        print(f"Температура стола: {data['result']['status']['heater_bed']['temperature']} °C")
        print(f"Целевая температура стола: {data['result']['status']['heater_bed']['target']} °C")
        print(f"Температура экструдера: {data['result']['status']['extruder']['temperature']} °C")
        print(f"Целевая температура экструдера: {data['result']['status']['extruder']['target']} °C")

        return JSONResponse(
            content={"message": "Data received successfully"},
            status_code=200,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)