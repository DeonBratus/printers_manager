import requests
import time

# Настройки принтера
PRINTER_API_URL = "http://192.168.1.125/printer/objects/query"
# Настройки сервера
SERVER_URL = "http://83.222.17.92:5000/receive_data"  # Замените на ваш URL сервера

def get_printer_data():
    """Получает данные с принтера через API."""
    data = {
        "objects": {
            "print_stats": None,
            "heater_bed": None,
            "extruder": None,
        }
    }
    try:
        response = requests.post(PRINTER_API_URL, json=data)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Ошибка при запросе к API принтера: {e}")
        return None

def send_data_to_server(data):
    """Отправляет данные на сервер."""
    try:
        response = requests.post(SERVER_URL, json=data)
        response.raise_for_status()
        print("Данные успешно отправлены на сервер")
    except requests.exceptions.RequestException as e:
        print(f"Ошибка при отправке данных на сервер: {e}")

def main():
    """Основной цикл работы клиента."""
    while True:
        printer_data = get_printer_data()
        if printer_data:
            send_data_to_server(printer_data)
        time.sleep(1)  # Отправляем данные каждые 5 секунд

if __name__ == "__main__":
    main()