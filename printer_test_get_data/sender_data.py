import requests
import time
import json
import socket
import logging
from typing import Dict, List, Any, Optional, Union
import urllib3
from enum import Enum

# Отключаем предупреждения о незащищенных запросах (для работы с принтерами без HTTPS)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("printer_sender")

# Настройки
SERVER_URL = "http://0.0.0.0:5000" or "http://83.222.17.92:5000"  # Адрес сервера getter_data.py
POLL_INTERVAL = 5  # Интервал обновления данных в секундах
REQUEST_TIMEOUT = 5  # Таймаут запросов в секундах

# Статусы команд
class CommandStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ServerClient:
    """Класс для взаимодействия с сервером."""
    
    def __init__(self, server_url: str = SERVER_URL, timeout: int = REQUEST_TIMEOUT):
        self.server_url = server_url
        self.timeout = timeout
    
    def get_printer_list(self) -> List[Dict]:
        """Получение списка принтеров с сервера"""
        try:
            logger.debug(f"Запрос списка принтеров на {self.server_url}/api/printers")
            response = requests.get(f"{self.server_url}/api/printers", timeout=self.timeout)
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

    def send_printer_data(self, data: Dict) -> bool:
        """Отправка данных о принтере на сервер"""
        try:
            logger.debug(f"Отправка данных на сервер: {json.dumps(data, indent=2)}")
            response = requests.post(
                f"{self.server_url}/receive_data", 
                json=data,
                timeout=self.timeout
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
    
    def get_pending_commands(self, printer_name: str) -> List[Dict]:
        """Получение ожидающих выполнения команд для принтера"""
        try:
            logger.debug(f"Запрос ожидающих команд для принтера {printer_name}")
            response = requests.get(
                f"{self.server_url}/api/commands/{printer_name}/pending",
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                commands = response.json()
                if commands:
                    logger.info(f"Получено {len(commands)} команд для принтера {printer_name}")
                    logger.debug(f"Команды: {json.dumps(commands, indent=2)}")
                return commands
            else:
                logger.error(f"Ошибка получения команд: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Ошибка при запросе команд для принтера {printer_name}: {str(e)}")
            return []
    
    def update_command_status(self, command_id: str, status: CommandStatus, result: Optional[Dict] = None) -> bool:
        """Обновление статуса команды на сервере"""
        try:
            data = {"status": status}
            if result is not None:
                data["result"] = result
                
            logger.debug(f"Обновление статуса команды {command_id} на {status}")
            response = requests.post(
                f"{self.server_url}/api/commands/{command_id}/update",
                json=data,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                logger.info(f"Статус команды {command_id} успешно обновлен на {status}")
                return True
            else:
                logger.error(f"Ошибка обновления статуса команды: {response.status_code}, {response.text}")
                return False
        except Exception as e:
            logger.error(f"Ошибка при обновлении статуса команды {command_id}: {str(e)}")
            return False

class PrinterClient:
    """Класс для взаимодействия с 3D-принтером."""
    
    def __init__(self, ip_address: str, timeout: int = REQUEST_TIMEOUT):
        self.ip_address = ip_address
        self.base_url = f"http://{ip_address}"
        self.timeout = timeout
    
    def is_online(self) -> bool:
        """Проверка доступности принтера"""
        try:
            # Проверяем доступность принтера через ping на порт Moonraker API (обычно 80)
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(2)  # Таймаут 2 секунды
            result = s.connect_ex((self.ip_address, 80))
            s.close()
            
            # Если порт открыт, принтер считается доступным
            return result == 0
        except Exception as e:
            logger.warning(f"Ошибка при проверке доступности принтера {self.ip_address}: {str(e)}")
            return False
    
    def get_status(self) -> Optional[Dict]:
        """Получение статуса принтера по API Klipper/Moonraker"""
        try:
            api_url = f"{self.base_url}/printer/objects/query"
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
            
            response = requests.post(url=api_url, json=data, timeout=self.timeout)
            
            if response.status_code == 200:
                status_data = response.json()
                logger.debug(f"Получены данные от принтера {self.ip_address}")
                
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
                    
                    logger.info(f"Принтер {self.ip_address}: Статус={state}, Стол={bed_temp:.1f}/{bed_target:.1f}°C, Экструдер={extruder_temp:.1f}/{extruder_target:.1f}°C")
                except Exception as e:
                    logger.warning(f"Ошибка при разборе данных принтера {self.ip_address}: {str(e)}")
                
                return status_data
            else:
                logger.warning(f"Не удалось получить данные с принтера {self.ip_address}: код {response.status_code}")
                return None
        except requests.exceptions.Timeout:
            logger.warning(f"Таймаут при запросе статуса принтера {self.ip_address}")
            return None
        except requests.exceptions.ConnectionError:
            logger.warning(f"Ошибка соединения с принтером {self.ip_address}")
            return None
        except Exception as e:
            logger.warning(f"Ошибка при запросе статуса принтера {self.ip_address}: {str(e)}")
            return None
    
    def start_print(self, filename: str) -> Dict[str, Any]:
        """Запуск печати файла"""
        if not filename:
            return {"success": False, "message": "Missing filename parameter"}
        
        api_url = f"{self.base_url}/printer/print/start"
        data = {"filename": filename}
        logger.info(f"Запуск печати файла {filename} на принтере {self.ip_address}")
        
        try:
            response = requests.post(api_url, json=data, timeout=self.timeout)
            if response.status_code == 200:
                return {"success": True, "message": f"Print started: {filename}"}
            else:
                return {
                    "success": False, 
                    "message": f"Failed to start print: {response.status_code}",
                    "response": response.text
                }
        except Exception as e:
            logger.error(f"Ошибка при запуске печати: {str(e)}")
            return {"success": False, "message": f"Error: {str(e)}"}
    
    def pause_print(self) -> Dict[str, Any]:
        """Приостановка печати"""
        api_url = f"{self.base_url}/printer/print/pause"
        logger.info(f"Приостановка печати на принтере {self.ip_address}")
        
        try:
            response = requests.post(api_url, timeout=self.timeout)
            if response.status_code == 200:
                return {"success": True, "message": "Print paused"}
            else:
                return {
                    "success": False, 
                    "message": f"Failed to pause print: {response.status_code}",
                    "response": response.text
                }
        except Exception as e:
            logger.error(f"Ошибка при приостановке печати: {str(e)}")
            return {"success": False, "message": f"Error: {str(e)}"}
    
    def resume_print(self) -> Dict[str, Any]:
        """Возобновление печати"""
        api_url = f"{self.base_url}/printer/print/resume"
        logger.info(f"Возобновление печати на принтере {self.ip_address}")
        
        try:
            response = requests.post(api_url, timeout=self.timeout)
            if response.status_code == 200:
                return {"success": True, "message": "Print resumed"}
            else:
                return {
                    "success": False, 
                    "message": f"Failed to resume print: {response.status_code}",
                    "response": response.text
                }
        except Exception as e:
            logger.error(f"Ошибка при возобновлении печати: {str(e)}")
            return {"success": False, "message": f"Error: {str(e)}"}
    
    def cancel_print(self) -> Dict[str, Any]:
        """Отмена печати"""
        api_url = f"{self.base_url}/printer/print/cancel"
        logger.info(f"Отмена печати на принтере {self.ip_address}")
        
        try:
            response = requests.post(api_url, timeout=self.timeout)
            if response.status_code == 200:
                return {"success": True, "message": "Print cancelled"}
            else:
                return {
                    "success": False, 
                    "message": f"Failed to cancel print: {response.status_code}",
                    "response": response.text
                }
        except Exception as e:
            logger.error(f"Ошибка при отмене печати: {str(e)}")
            return {"success": False, "message": f"Error: {str(e)}"}
    
    def set_temperature(self, heater: str, target: float) -> Dict[str, Any]:
        """Установка температуры"""
        if not heater or target is None:
            return {"success": False, "message": "Missing heater or target parameter"}
        
        # Формируем команду G-code для установки температуры
        gcode = ""
        if heater == "extruder":
            gcode = f"M104 S{target}"  # Установка температуры экструдера без ожидания
        elif heater == "bed":
            gcode = f"M140 S{target}"  # Установка температуры стола без ожидания
        else:
            return {"success": False, "message": f"Unknown heater: {heater}"}
        
        return self.execute_gcode(gcode)
    
    def get_files(self) -> Dict[str, Any]:
        """Получение списка файлов на принтере"""
        # Исправленный URL API для Moonraker
        api_url = f"{self.base_url}/server/files/list?root=gcodes"
        logger.info(f"Запрос списка файлов с принтера {self.ip_address}")
        
        try:
            response = requests.get(api_url, timeout=self.timeout)
            logger.debug(f"Ответ от сервера файлов: {response.status_code}")
            
            if response.status_code == 200:
                files_data = response.json()
                return {
                    "success": True, 
                    "message": "Files retrieved",
                    "files": files_data
                }
            elif response.status_code == 404:
                # Пробуем альтернативный URL для API Moonraker
                api_url = f"{self.base_url}/api/files"
                response = requests.get(api_url, timeout=self.timeout)
                
                if response.status_code == 200:
                    files_data = response.json()
                    return {
                        "success": True, 
                        "message": "Files retrieved using alternative API",
                        "files": files_data
                    }
                else:
                    return {
                        "success": False, 
                        "message": f"Failed to get files with alternative API: {response.status_code}",
                        "response": response.text
                    }
            else:
                return {
                    "success": False, 
                    "message": f"Failed to get files: {response.status_code}",
                    "response": response.text
                }
        except Exception as e:
            logger.error(f"Ошибка при получении списка файлов: {str(e)}")
            return {
                "success": False,
                "message": f"Error getting files: {str(e)}"
            }
    
    def execute_gcode(self, gcode: str) -> Dict[str, Any]:
        """Выполнение произвольной G-code команды"""
        if not gcode:
            return {"success": False, "message": "Missing gcode parameter"}
        
        api_url = f"{self.base_url}/printer/gcode/script"
        data = {"script": gcode}
        logger.info(f"Выполнение G-code на принтере {self.ip_address}: {gcode}")
        
        try:
            response = requests.post(api_url, json=data, timeout=self.timeout)
            if response.status_code == 200:
                return {"success": True, "message": f"GCode executed: {gcode}"}
            else:
                return {
                    "success": False, 
                    "message": f"Failed to execute GCode: {response.status_code}",
                    "response": response.text
                }
        except Exception as e:
            logger.error(f"Ошибка при выполнении G-code: {str(e)}")
            return {"success": False, "message": f"Error: {str(e)}"}

def execute_printer_command(ip_address: str, command_type: str, parameters: Dict) -> Dict[str, Any]:
    """Выполнение команды на принтере"""
    printer = PrinterClient(ip_address)
    
    # Проверяем доступность принтера
    if not printer.is_online():
        return {"success": False, "message": "Printer offline"}
    
    # Обрабатываем различные типы команд
    if command_type == "start_print":
        return printer.start_print(parameters.get("filename", ""))
    
    elif command_type == "pause_print":
        return printer.pause_print()
    
    elif command_type == "resume_print":
        return printer.resume_print()
    
    elif command_type == "cancel_print":
        return printer.cancel_print()
    
    elif command_type == "set_temperature":
        return printer.set_temperature(
            parameters.get("heater", ""), 
            parameters.get("target")
        )
    
    elif command_type == "get_files":
        return printer.get_files()
    
    elif command_type == "get_status":
        status_data = printer.get_status()
        if status_data:
            return {
                "success": True,
                "message": "Status retrieved",
                "status": status_data
            }
        else:
            return {
                "success": False,
                "message": "Failed to get printer status"
            }
    
    elif command_type == "execute_gcode":
        return printer.execute_gcode(parameters.get("gcode", ""))
    
    else:
        return {"success": False, "message": f"Unknown command type: {command_type}"}

def process_commands(printer_name: str, ip_address: str):
    """Обработка команд для принтера"""
    server_client = ServerClient()
    
    # Получаем ожидающие команды
    commands = server_client.get_pending_commands(printer_name)
    
    if not commands:
        logger.debug(f"Нет ожидающих команд для принтера {printer_name}")
        return
    
    for command in commands:
        command_id = command.get("command_id")
        command_type = command.get("command_type")
        parameters = command.get("parameters", {})
        
        logger.info(f"Обработка команды {command_id} ({command_type}) для принтера {printer_name}")
        
        try:
            # Сначала обновляем статус на "processing"
            server_client.update_command_status(command_id, CommandStatus.PROCESSING)
            
            # Выполняем команду
            result = execute_printer_command(ip_address, command_type, parameters)
            
            # Обновляем статус в зависимости от результата
            if result.get("success", False):
                server_client.update_command_status(command_id, CommandStatus.COMPLETED, result)
                logger.info(f"Команда {command_id} успешно выполнена: {result.get('message', '')}")
            else:
                server_client.update_command_status(command_id, CommandStatus.FAILED, result)
                logger.warning(f"Ошибка выполнения команды {command_id}: {result.get('message', '')}")
        
        except Exception as e:
            logger.error(f"Ошибка при обработке команды {command_id}: {str(e)}")
            error_result = {"success": False, "message": f"Error: {str(e)}"}
            server_client.update_command_status(command_id, CommandStatus.FAILED, error_result)

def main_loop():
    """Основной цикл программы"""
    server_client = ServerClient()
    
    logger.info("Запуск клиента сбора данных с принтеров")
    logger.info(f"Сервер: {SERVER_URL}")
    logger.info(f"Интервал опроса: {POLL_INTERVAL} сек")
    
    while True:
        try:
            logger.info("Получение списка принтеров...")
            printers = server_client.get_printer_list()
            logger.info(f"Получен список из {len(printers)} принтеров")
            
            for printer in printers:
                printer_name = printer.get("name")
                ip_address = printer.get("ip_address")
                
                if not ip_address:
                    logger.warning(f"Пропуск принтера {printer_name}: отсутствует IP-адрес")
                    continue
                
                logger.info(f"Обработка принтера {printer_name} ({ip_address})")
                printer_client = PrinterClient(ip_address)
                
                # Проверяем доступность принтера
                is_online = printer_client.is_online()
                
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
                    server_client.send_printer_data(offline_data)
                    continue
                
                # Получаем и обрабатываем команды для принтера
                logger.info(f"Проверка и обработка команд для принтера {printer_name}")
                process_commands(printer_name, ip_address)
                
                # Получаем статус принтера
                logger.debug(f"Запрос статуса принтера {printer_name}")
                status_data = printer_client.get_status()
                
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
                    server_client.send_printer_data(data_to_send)
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
                    server_client.send_printer_data(error_data)
            
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