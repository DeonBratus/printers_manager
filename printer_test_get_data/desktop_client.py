import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import requests
import time
import json
import socket
import logging
from typing import Dict, List, Any, Optional
import urllib3
import threading
import webbrowser
from PIL import Image, ImageTk
import io
import base64

# Отключаем предупреждения о незащищенных запросах
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("printer_sender")

class PrinterMonitorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Klipper Printer Monitor")
        self.root.geometry("1200x800")
        self.root.minsize(1000, 700)
        
        # Настройки по умолчанию
        self.settings = {
            "SERVER_URL": "http://83.222.17.92:5000",
            "POLL_INTERVAL": 5,
            "REQUEST_TIMEOUT": 5
        }
        
        # Состояние приложения
        self.is_running = False
        self.printers = []
        self.last_update_time = ""
        
        # Создаем стиль для темной темы
        self.setup_style()
        
        # Создаем интерфейс
        self.setup_ui()
        
        # Запускаем поток для мониторинга
        self.monitor_thread = None
        
    def setup_style(self):
        style = ttk.Style()
        style.theme_use('clam')
        
        # Общие настройки стиля
        style.configure('.', background='#333333', foreground='white')
        style.configure('TFrame', background='#333333')
        style.configure('TLabel', background='#333333', foreground='white')
        style.configure('TButton', background='#444444', foreground='white', 
                         borderwidth=1, focusthickness=3, focuscolor='none')
        style.map('TButton', background=[('active', '#555555')])
        style.configure('TEntry', fieldbackground='#444444', foreground='white')
        style.configure('TCombobox', fieldbackground='#444444', foreground='white')
        style.configure('TNotebook', background='#333333', borderwidth=0)
        style.configure('TNotebook.Tab', background='#444444', foreground='white',
                        padding=[10, 5], font=('Helvetica', 10))
        style.map('TNotebook.Tab', background=[('selected', '#555555')])
        style.configure('Treeview', background='#444444', foreground='white', 
                        fieldbackground='#444444', borderwidth=0)
        style.configure('Treeview.Heading', background='#555555', foreground='white')
        style.map('Treeview', background=[('selected', '#0078D7')])
        style.configure('Vertical.TScrollbar', background='#444444', 
                         arrowcolor='white', troughcolor='#333333')
        style.configure('Horizontal.TScrollbar', background='#444444', 
                         arrowcolor='white', troughcolor='#333333')
        style.configure('TProgressbar', background='#0078D7', troughcolor='#444444')
        
    def setup_ui(self):
        # Основной контейнер
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Верхняя панель с кнопками управления
        control_frame = ttk.Frame(main_frame)
        control_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.start_btn = ttk.Button(control_frame, text="Старт", command=self.start_monitoring)
        self.start_btn.pack(side=tk.LEFT, padx=5)
        
        self.stop_btn = ttk.Button(control_frame, text="Стоп", command=self.stop_monitoring, state=tk.DISABLED)
        self.stop_btn.pack(side=tk.LEFT, padx=5)
        
        self.settings_btn = ttk.Button(control_frame, text="Настройки", command=self.open_settings)
        self.settings_btn.pack(side=tk.LEFT, padx=5)
        
        self.refresh_btn = ttk.Button(control_frame, text="Обновить список", command=self.refresh_printer_list)
        self.refresh_btn.pack(side=tk.LEFT, padx=5)
        
        self.status_label = ttk.Label(control_frame, text="Статус: Остановлено")
        self.status_label.pack(side=tk.RIGHT, padx=5)
        
        # Панель с вкладками
        notebook = ttk.Notebook(main_frame)
        notebook.pack(fill=tk.BOTH, expand=True)
        
        # Вкладка с принтерами
        printers_tab = ttk.Frame(notebook)
        notebook.add(printers_tab, text="Принтеры")
        
        # Таблица с принтерами
        self.printer_tree = ttk.Treeview(printers_tab, columns=('name', 'ip', 'status', 'temp', 'progress'), 
                                         selectmode='browse')
        self.printer_tree.heading('#0', text='ID')
        self.printer_tree.heading('name', text='Имя принтера')
        self.printer_tree.heading('ip', text='IP адрес')
        self.printer_tree.heading('status', text='Статус')
        self.printer_tree.heading('temp', text='Температура')
        self.printer_tree.heading('progress', text='Прогресс')
        
        self.printer_tree.column('#0', width=50, stretch=tk.NO)
        self.printer_tree.column('name', width=200, anchor=tk.W)
        self.printer_tree.column('ip', width=150, anchor=tk.W)
        self.printer_tree.column('status', width=150, anchor=tk.W)
        self.printer_tree.column('temp', width=200, anchor=tk.W)
        self.printer_tree.column('progress', width=150, anchor=tk.W)
        
        vsb = ttk.Scrollbar(printers_tab, orient="vertical", command=self.printer_tree.yview)
        hsb = ttk.Scrollbar(printers_tab, orient="horizontal", command=self.printer_tree.xview)
        self.printer_tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
        
        self.printer_tree.grid(row=0, column=0, sticky='nsew')
        vsb.grid(row=0, column=1, sticky='ns')
        hsb.grid(row=1, column=0, sticky='ew')
        
        printers_tab.grid_rowconfigure(0, weight=1)
        printers_tab.grid_columnconfigure(0, weight=1)
        
        # Контекстное меню для принтеров
        self.tree_menu = tk.Menu(self.root, tearoff=0)
        self.tree_menu.add_command(label="Обновить статус", command=self.refresh_selected_printer)
        self.tree_menu.add_command(label="Открыть в браузере", command=self.open_printer_in_browser)
        self.tree_menu.add_separator()
        self.tree_menu.add_command(label="Скопировать IP", command=self.copy_printer_ip)
        
        self.printer_tree.bind("<Button-3>", self.show_tree_menu)
        
        # Вкладка с логами
        logs_tab = ttk.Frame(notebook)
        notebook.add(logs_tab, text="Логи")
        
        self.log_text = scrolledtext.ScrolledText(logs_tab, wrap=tk.WORD, width=100, height=30,
                                                 bg='#444444', fg='white', insertbackground='white')
        self.log_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Перенаправляем логи в текстовое поле
        class TextHandler(logging.Handler):
            def __init__(self, text_widget):
                super().__init__()
                self.text_widget = text_widget
            
            def emit(self, record):
                msg = self.format(record)
                self.text_widget.configure(state='normal')
                self.text_widget.insert(tk.END, msg + '\n')
                self.text_widget.configure(state='disabled')
                self.text_widget.see(tk.END)
        
        text_handler = TextHandler(self.log_text)
        text_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        logger.addHandler(text_handler)
        
        # Вкладка с графиками (заглушка)
        graphs_tab = ttk.Frame(notebook)
        notebook.add(graphs_tab, text="Графики")
        
        graphs_label = ttk.Label(graphs_tab, text="Графики температур и прогресса будут здесь")
        graphs_label.pack(pady=50)
        
        # Нижняя панель с информацией
        bottom_frame = ttk.Frame(main_frame)
        bottom_frame.pack(fill=tk.X, pady=(10, 0))
        
        self.last_update_label = ttk.Label(bottom_frame, text="Последнее обновление: никогда")
        self.last_update_label.pack(side=tk.LEFT)
        
        self.printer_count_label = ttk.Label(bottom_frame, text="Принтеров: 0")
        self.printer_count_label.pack(side=tk.RIGHT)
        
        # Загружаем начальный список принтеров
        self.refresh_printer_list()
    
    def show_tree_menu(self, event):
        item = self.printer_tree.identify_row(event.y)
        if item:
            self.printer_tree.selection_set(item)
            self.tree_menu.post(event.x_root, event.y_root)
    
    def refresh_selected_printer(self):
        selected = self.printer_tree.selection()
        if selected:
            item = self.printer_tree.item(selected[0])
            printer_name = item['values'][0]
            ip_address = item['values'][1]
            
            thread = threading.Thread(target=self.update_printer_status, args=(printer_name, ip_address), daemon=True)
            thread.start()
    
    def open_printer_in_browser(self):
        selected = self.printer_tree.selection()
        if selected:
            item = self.printer_tree.item(selected[0])
            ip_address = item['values'][1]
            webbrowser.open(f"http://{ip_address}")
    
    def copy_printer_ip(self):
        selected = self.printer_tree.selection()
        if selected:
            item = self.printer_tree.item(selected[0])
            ip_address = item['values'][1]
            self.root.clipboard_clear()
            self.root.clipboard_append(ip_address)
            self.status_label.config(text="IP скопирован в буфер")
            self.root.after(3000, lambda: self.status_label.config(text="Статус: Работает" if self.is_running else "Статус: Остановлено"))
    
    def start_monitoring(self):
        if not self.is_running:
            self.is_running = True
            self.start_btn.config(state=tk.DISABLED)
            self.stop_btn.config(state=tk.NORMAL)
            self.status_label.config(text="Статус: Работает")
            
            self.monitor_thread = threading.Thread(target=self.monitoring_loop, daemon=True)
            self.monitor_thread.start()
            
            logger.info("Мониторинг принтеров запущен")
    
    def stop_monitoring(self):
        if self.is_running:
            self.is_running = False
            self.start_btn.config(state=tk.NORMAL)
            self.stop_btn.config(state=tk.DISABLED)
            self.status_label.config(text="Статус: Остановлено")
            
            logger.info("Мониторинг принтеров остановлен")
    
    def monitoring_loop(self):
        while self.is_running:
            try:
                for printer in self.printers:
                    printer_name = printer.get("name")
                    ip_address = printer.get("ip_address")
                    
                    if not ip_address:
                        continue
                    
                    self.update_printer_status(printer_name, ip_address)
                
                self.last_update_time = time.strftime("%H:%M:%S")
                self.last_update_label.config(text=f"Последнее обновление: {self.last_update_time}")
                
                time.sleep(self.settings["POLL_INTERVAL"])
                
            except Exception as e:
                logger.error(f"Ошибка в цикле мониторинга: {str(e)}")
                time.sleep(1)
    
    def update_printer_status(self, printer_name, ip_address):
        # Проверяем доступность принтера
        is_online = self.is_printer_online(ip_address)
        
        if not is_online:
            logger.warning(f"Принтер {printer_name} ({ip_address}) недоступен")
            self.update_printer_tree(printer_name, ip_address, "offline", "N/A", "0%")
            return
        
        # Получаем статус принтера
        status_data = self.get_printer_status(ip_address)
        
        if status_data:
            # Извлекаем данные для отображения
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
            
            temp_str = f"Стол: {bed_temp:.1f}°C / {bed_target:.1f}°C | Экстр: {extruder_temp:.1f}°C / {extruder_target:.1f}°C"
            
            # Прогресс печати
            progress = 0
            if state == "printing":
                virtual_sdcard = status.get("virtual_sdcard", {})
                progress = virtual_sdcard.get("progress", 0) * 100
                progress_str = f"{progress:.1f}%"
            else:
                progress_str = "0%"
            
            self.update_printer_tree(printer_name, ip_address, state, temp_str, progress_str)
        else:
            logger.warning(f"Не удалось получить данные с принтера {printer_name}")
            self.update_printer_tree(printer_name, ip_address, "error", "N/A", "0%")
    
    def update_printer_tree(self, name, ip, status, temp, progress):
        # Ищем принтер в дереве
        for child in self.printer_tree.get_children():
            item = self.printer_tree.item(child)
            if item['values'][0] == name and item['values'][1] == ip:
                # Обновляем существующую запись
                self.printer_tree.item(child, values=(name, ip, status, temp, progress))
                
                # Устанавливаем цвет в зависимости от статуса
                if status == "offline":
                    self.printer_tree.tag_configure('offline', foreground='red')
                    self.printer_tree.item(child, tags=('offline',))
                elif status == "error":
                    self.printer_tree.tag_configure('error', foreground='orange')
                    self.printer_tree.item(child, tags=('error',))
                elif status == "printing":
                    self.printer_tree.tag_configure('printing', foreground='green')
                    self.printer_tree.item(child, tags=('printing',))
                else:
                    self.printer_tree.item(child, tags=())
                
                return
        
        # Если принтер не найден, добавляем новую запись
        item_id = self.printer_tree.insert('', tk.END, text=str(len(self.printer_tree.get_children()) + 1), 
                                          values=(name, ip, status, temp, progress))
        
        # Устанавливаем цвет в зависимости от статуса
        if status == "offline":
            self.printer_tree.tag_configure('offline', foreground='red')
            self.printer_tree.item(item_id, tags=('offline',))
        elif status == "error":
            self.printer_tree.tag_configure('error', foreground='orange')
            self.printer_tree.item(item_id, tags=('error',))
        elif status == "printing":
            self.printer_tree.tag_configure('printing', foreground='green')
            self.printer_tree.item(item_id, tags=('printing',))
    
    def refresh_printer_list(self):
        try:
            self.printers = self.get_printer_list()
            self.printer_count_label.config(text=f"Принтеров: {len(self.printers)}")
            
            # Очищаем дерево
            for item in self.printer_tree.get_children():
                self.printer_tree.delete(item)
            
            # Добавляем принтеры в дерево
            for printer in self.printers:
                self.printer_tree.insert('', tk.END, text=str(len(self.printer_tree.get_children()) + 1), 
                                        values=(printer.get("name"), printer.get("ip_address"), "Не проверено", "N/A", "0%"))
            
            logger.info(f"Список принтеров обновлен. Получено {len(self.printers)} принтеров.")
            
        except Exception as e:
            logger.error(f"Ошибка при обновлении списка принтеров: {str(e)}")
            messagebox.showerror("Ошибка", f"Не удалось получить список принтеров: {str(e)}")
    
    def open_settings(self):
        settings_window = tk.Toplevel(self.root)
        settings_window.title("Настройки")
        settings_window.geometry("500x300")
        settings_window.resizable(False, False)
        
        # Фрейм для настроек
        settings_frame = ttk.Frame(settings_window)
        settings_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Поля для ввода настроек
        ttk.Label(settings_frame, text="URL сервера:").grid(row=0, column=0, sticky=tk.W, pady=5)
        server_url_entry = ttk.Entry(settings_frame, width=40)
        server_url_entry.grid(row=0, column=1, sticky=tk.EW, pady=5)
        server_url_entry.insert(0, self.settings["SERVER_URL"])
        
        ttk.Label(settings_frame, text="Интервал опроса (сек):").grid(row=1, column=0, sticky=tk.W, pady=5)
        poll_interval_entry = ttk.Entry(settings_frame, width=10)
        poll_interval_entry.grid(row=1, column=1, sticky=tk.W, pady=5)
        poll_interval_entry.insert(0, str(self.settings["POLL_INTERVAL"]))
        
        ttk.Label(settings_frame, text="Таймаут запросов (сек):").grid(row=2, column=0, sticky=tk.W, pady=5)
        timeout_entry = ttk.Entry(settings_frame, width=10)
        timeout_entry.grid(row=2, column=1, sticky=tk.W, pady=5)
        timeout_entry.insert(0, str(self.settings["REQUEST_TIMEOUT"]))
        
        # Кнопки
        button_frame = ttk.Frame(settings_frame)
        button_frame.grid(row=3, column=0, columnspan=2, pady=20)
        
        def save_settings():
            try:
                self.settings["SERVER_URL"] = server_url_entry.get()
                self.settings["POLL_INTERVAL"] = int(poll_interval_entry.get())
                self.settings["REQUEST_TIMEOUT"] = int(timeout_entry.get())
                
                messagebox.showinfo("Сохранено", "Настройки успешно сохранены")
                settings_window.destroy()
                
            except ValueError:
                messagebox.showerror("Ошибка", "Пожалуйста, введите корректные числовые значения")
        
        save_btn = ttk.Button(button_frame, text="Сохранить", command=save_settings)
        save_btn.pack(side=tk.LEFT, padx=10)
        
        cancel_btn = ttk.Button(button_frame, text="Отмена", command=settings_window.destroy)
        cancel_btn.pack(side=tk.LEFT, padx=10)
    
    # Методы для работы с принтерами (аналогичные оригинальному скрипту)
    def get_printer_list(self) -> List[Dict]:
        """Получение списка принтеров с сервера"""
        try:
            logger.debug(f"Запрос списка принтеров на {self.settings['SERVER_URL']}/api/printers")
            response = requests.get(f"{self.settings['SERVER_URL']}/api/printers", 
                                  timeout=self.settings["REQUEST_TIMEOUT"])
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
                f"{self.settings['SERVER_URL']}/receive_data", 
                json=data,
                timeout=self.settings["REQUEST_TIMEOUT"]
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
    
    def get_printer_status(self, ip_address: str) -> Optional[Dict]:
        """Получение статуса принтера по API Klipper/Moonraker"""
        try:
            api_url = f"http://{ip_address}/printer/objects/query"
            logger.debug(f"Запрос статуса принтера по адресу: {api_url}")
            
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
            
            response = requests.post(url=api_url, json=data, timeout=self.settings["REQUEST_TIMEOUT"])
            
            if response.status_code == 200:
                status_data = response.json()
                logger.debug(f"Получены данные от принтера {ip_address}")
                
                # Отправляем данные на сервер
                printer_name = next((p["name"] for p in self.printers if p["ip_address"] == ip_address), "Unknown")
                data_to_send = {
                    "printer_name": printer_name,
                    "ip_address": ip_address,
                    "status": "online",
                    "result": status_data,
                    "timestamp": time.time()
                }
                self.send_printer_data(data_to_send)
                
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
    
    def is_printer_online(self, ip_address: str) -> bool:
        """Проверка доступности принтера"""
        try:
            logger.debug(f"Проверка доступности принтера {ip_address}")
            socket.create_connection((ip_address, 7125), timeout=self.settings["REQUEST_TIMEOUT"])
            logger.debug(f"Принтер {ip_address} доступен")
            return True
        except (socket.timeout, socket.error) as e:
            logger.debug(f"Принтер {ip_address} недоступен: {str(e)}")
            return False

if __name__ == "__main__":
    root = tk.Tk()
    app = PrinterMonitorApp(root)
    root.mainloop()