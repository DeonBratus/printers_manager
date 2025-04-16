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
SERVER_URL = "http://83.222.17.92:5000"  # Адрес сервера getter_data.py
POLL_INTERVAL = 5  # Интервал обновления данных в секундах
REQUEST_TIMEOUT = 5  # Таймаут запросов в секундах

def get_printer_list() -> List[Dict]:
    """Получение списка принтеров с сервера"""
    try:
        logger.debug(f"Запрос списка принтеров на {SERVER_URL}/api/printers")
        response = requests.get(f"{SERVER_URL}/api/printers", timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            printers = response.json()
            logger.debug(f"Получен список принтеров: {json.dumps(printers, indent=2)}")
            return printers
        else:
            logger.error(f"Ошибка получения списка принтеров: {response.status_code}")
            return []
    except Exception as e:
        logger.error(f"Ошибка при запросе списка принтеров: {str(e)}")
        return []

def send_printer_data(data: Dict) -> bool:
    """Отправка данных о принтере на сервер"""
    try:
        logger.debug(f"Отправка данных на сервер: {json.dumps(data, indent=2)}")
        response = requests.post(
            f"{SERVER_URL}/receive_data", 
            json=data,
            timeout=REQUEST_TIMEOUT
        )
        if response.status_code == 200:
            logger.info(f"Данные успешно отправлены на сервер для принтера {data.get('printer_name')}")
            return True
        else:
            logger.error(f"Ошибка отправки данных: {response.status_code}, {response.text}")
            return False
    except Exception as e:
        logger.error(f"Ошибка при отправке данных: {str(e)}")
        return False

def is_printer_online(ip_address: str) -> bool:
    """Проверка доступности принтера"""
    try:
        # Проверяем доступность принтера через ping на порт Moonraker API (обычно 80)
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)  # Таймаут 2 секунды
        result = s.connect_ex((ip_address, 80))
        s.close()
        
        # Если порт открыт, принтер считается доступным
        return result == 0
    except Exception as e:
        logger.warning(f"Ошибка при проверке доступности принтера {ip_address}: {str(e)}")
        return False

def get_printer_status(ip_address: str) -> Optional[Dict]:
    """Получение статуса принтера по API Klipper/Moonraker"""
    try:
        api_url = f"http://{ip_address}/printer/objects/query"
        logger.debug(f"Запрос статуса принтера по адресу: {api_url}")
        
        # Расширенный список запрашиваемых объектов
        data = {
            "objects": {
                "print_stats": None,
                "heater_bed": None,
                "extruder": None,
                "gcode_move": None,
                "toolhead": None,
                "virtual_sdcard": None,
                "display_status": None,
                "fan": None
            }
        }
        
        response = requests.post(url=api_url, json=data, timeout=REQUEST_TIMEOUT)
        
        if response.status_code == 200:
            status_data = response.json()
            logger.debug(f"Получены данные от принтера {ip_address}")
            
            # Извлечем и выведем в лог основные параметры для мониторинга
            try:
                result = status_data.get("result", {})
                status = result.get("status", {})
                
                # Статус печати
                print_stats = status.get("print_stats", {})
                state = print_stats.get("state", "неизвестно")
                
                # Температуры
                bed_temp = status.get("heater_bed", {}).get("temperature", 0)
                bed_target = status.get("heater_bed", {}).get("target", 0)
                
                extruder_temp = status.get("extruder", {}).get("temperature", 0)
                extruder_target = status.get("extruder", {}).get("target", 0)
                
                logger.info(f"Принтер {ip_address}: Статус={state}, Стол={bed_temp:.1f}/{bed_target:.1f}°C, Экструдер={extruder_temp:.1f}/{extruder_target:.1f}°C")
            except Exception as e:
                logger.warning(f"Ошибка при разборе данных принтера {ip_address}: {str(e)}")
            
            return status_data
        else:
            logger.warning(f"Не удалось получить данные с принтера {ip_address}: код {response.status_code}")
            return None
    except requests.exceptions.Timeout:
        logger.warning(f"Таймаут при запросе статуса принтера {ip_address}")
        return None
    except requests.exceptions.ConnectionError:
        logger.warning(f"Ошибка соединения с принтером {ip_address}")
        return None
    except Exception as e:
        logger.warning(f"Ошибка при запросе статуса принтера {ip_address}: {str(e)}")
        return None


def main_loop():
    """Основной цикл программы"""
    logger.info("Запуск клиента сбора данных с принтеров")
    logger.info(f"Сервер: {SERVER_URL}")
    logger.info(f"Интервал опроса: {POLL_INTERVAL} сек")
    
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
                
                logger.info(f"Обработка принтера {printer_name} ({ip_address})")
                
                # Проверяем доступность принтера
                is_online = is_printer_online(ip_address)
                
                if not is_online:
                    logger.warning(f"Принтер {printer_name} ({ip_address}) недоступен")
                    # Отправляем статус оффлайн
                    offline_data = {
                        "printer_name": printer_name,
                        "ip_address": ip_address,
                        "status": "offline",
                        "result": {},
                        "timestamp": time.time()
                    }
                    send_printer_data(offline_data)
                    continue
                
                # Получаем статус принтера
                logger.debug(f"Запрос статуса принтера {printer_name}")
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
                    # Отправляем статус ошибки
                    error_data = {
                        "printer_name": printer_name,
                        "ip_address": ip_address,
                        "status": "error",
                        "result": {"error": "Не удалось получить данные с принтера"},
                        "timestamp": time.time()
                    }
                    send_printer_data(error_data)
            
            # Спим до следующего опроса
            logger.info(f"Ожидание {POLL_INTERVAL} секунд до следующего опроса...")
            time.sleep(POLL_INTERVAL)
            
        except KeyboardInterrupt:
            logger.info("Программа остановлена пользователем")
            break
        except Exception as e:
            logger.error(f"Произошла ошибка в основном цикле: {str(e)}", exc_info=True)
            # Ожидаем перед повторной попыткой
            time.sleep(1)

if __name__ == "__main__":
    main_loop()