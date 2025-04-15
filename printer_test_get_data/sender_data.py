import requests
import time
import json
import socket
import logging
from typing import Dict, List, Any, Optional
import urllib3

# Отключаем предупреждения о незащищенных запросах (для работы с принтерами без HTTPS)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("printer_sender")

# Настройки
SERVER_URL = "http://localhost:5000"  # Адрес сервера getter_data.py
POLL_INTERVAL = 30  # Интервал обновления данных в секундах
REQUEST_TIMEOUT = 5  # Таймаут запросов в секундах

def get_printer_list() -> List[Dict]:
    """Получение списка принтеров с сервера"""
    try:
        response = requests.get(f"{SERVER_URL}/api/printers", timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Ошибка получения списка принтеров: {response.status_code}")
            return []
    except Exception as e:
        logger.error(f"Ошибка при запросе списка принтеров: {str(e)}")
        return []

def send_printer_data(data: Dict) -> bool:
    """Отправка данных о принтере на сервер"""
    try:
        response = requests.post(
            f"{SERVER_URL}/receive_data", 
            json=data,
            timeout=REQUEST_TIMEOUT
        )
        if response.status_code == 200:
            logger.info(f"Данные успешно отправлены на сервер для принтера {data.get('printer_name')}")
            return True
        else:
            logger.error(f"Ошибка отправки данных: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Ошибка при отправке данных: {str(e)}")
        return False

def get_printer_status(ip_address: str) -> Optional[Dict]:
    """Получение статуса принтера по API Klipper/Moonraker"""
    try:
        # Пробуем подключиться к Moonraker API (обычно на порту 7125)
        api_url = f"http://{ip_address}:7125/printer/objects/query?extruder&heater_bed&print_stats"
        response = requests.get(api_url, timeout=REQUEST_TIMEOUT)
        
        if response.status_code == 200:
            return response.json()
        else:
            logger.warning(f"Не удалось получить данные с принтера {ip_address}: {response.status_code}")
            return None
    except Exception as e:
        logger.warning(f"Ошибка при запросе статуса принтера {ip_address}: {str(e)}")
        return None

def is_printer_online(ip_address: str) -> bool:
    """Проверка доступности принтера"""
    try:
        # Проверяем доступность хоста через сокет
        socket.create_connection((ip_address, 7125), timeout=REQUEST_TIMEOUT)
        return True
    except (socket.timeout, socket.error):
        return False

def main_loop():
    """Основной цикл программы"""
    logger.info("Запуск клиента сбора данных с принтеров")
    logger.info(f"Сервер: {SERVER_URL}")
    
    while True:
        try:
            logger.info("Получение списка принтеров...")
            printers = get_printer_list()
            logger.info(f"Получен список из {len(printers)} принтеров")
            
            for printer in printers:
                printer_name = printer.get("name")
                ip_address = printer.get("ip_address")
                
                if not ip_address:
                    logger.warning(f"Пропуск принтера {printer_name}: отсутствует IP-адрес")
                    continue
                
                logger.info(f"Проверка принтера {printer_name} ({ip_address})...")
                
                # Проверяем доступность принтера
                if not is_printer_online(ip_address):
                    logger.warning(f"Принтер {printer_name} ({ip_address}) недоступен")
                    # Отправляем информацию о недоступности
                    send_printer_data({
                        "printer_name": printer_name,
                        "ip_address": ip_address,
                        "status": "offline",
                        "timestamp": time.time()
                    })
                    continue
                
                # Получаем статус принтера
                status_data = get_printer_status(ip_address)
                
                if status_data:
                    # Формируем данные для отправки
                    data_to_send = {
                        "printer_name": printer_name,
                        "ip_address": ip_address,
                        "status": "online",
                        "result": status_data,
                        "timestamp": time.time()
                    }
                    
                    # Отправляем данные на сервер
                    logger.info(f"Отправка данных для принтера {printer_name}")
                    send_printer_data(data_to_send)
                else:
                    logger.warning(f"Не удалось получить данные с принтера {printer_name}")
            
            # Спим до следующего опроса
            logger.info(f"Ожидание {POLL_INTERVAL} секунд до следующего опроса...")
            time.sleep(POLL_INTERVAL)
            
        except KeyboardInterrupt:
            logger.info("Программа остановлена пользователем")
            break
        except Exception as e:
            logger.error(f"Произошла ошибка в основном цикле: {str(e)}")
            # Ожидаем перед повторной попыткой
            time.sleep(10)

if __name__ == "__main__":
    main_loop()