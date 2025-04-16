import sys
import requests
import time
import json
import socket
import logging
from typing import Dict, List, Any, Optional
import urllib3
from PyQt5.QtWidgets import QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QLabel,  QPushButton, QTextEdit, QTabWidget
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from PyQt5.QtGui import  QColor, QIcon

from wmok_utils.log_viewer import LogViewer
from wmok_utils.requests_tester import RequestTester
from wmok_utils.settings_tab import SettingsTab
from wmok_utils.printer_status_table import PrinterStatusTable

# Disable insecure request warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("printer_monitor")


class PrinterMonitor(QThread):
    """Thread for monitoring printers"""
    update_signal = pyqtSignal(dict)
    log_signal = pyqtSignal(str)
    
    def __init__(self, config):
        super().__init__()
        self.config = config
        self.running = False
        
    def run(self):
        self.running = True
        while self.running:
            try:
                printers = self.get_printer_list()
                self.log_signal.emit(f"Found {len(printers)} printers to monitor")
                
                for printer in printers:
                    if not self.running:
                        break
                        
                    printer_name = printer.get("name")
                    ip_address = printer.get("ip_address")
                    
                    if not ip_address:
                        self.log_signal.emit(f"Skipping printer {printer_name}: no IP address")
                        continue
                    
                    # Check if printer is online
                    is_online = self.is_printer_online(ip_address)
                    
                    if not is_online:
                        self.log_signal.emit(f"Printer {printer_name} ({ip_address}) is offline")
                        data = {
                            "printer_name": printer_name,
                            "ip_address": ip_address,
                            "status": "offline",
                            "result": {},
                            "timestamp": time.time()
                        }
                        self.update_signal.emit(data)
                        continue
                    
                    # Get printer status
                    status_data = self.get_printer_status(ip_address)
                    
                    if status_data:
                        data = {
                            "printer_name": printer_name,
                            "ip_address": ip_address,
                            "status": "online",
                            "result": status_data,
                            "timestamp": time.time()
                        }
                        self.update_signal.emit(data)
                    else:
                        self.log_signal.emit(f"Failed to get status from {printer_name}")
                        data = {
                            "printer_name": printer_name,
                            "ip_address": ip_address,
                            "status": "error",
                            "result": {"error": "Failed to get printer status"},
                            "timestamp": time.time()
                        }
                        self.update_signal.emit(data)
                
                # Sleep until next poll
                time.sleep(self.config["poll_interval"])
                
            except Exception as e:
                self.log_signal.emit(f"Error in monitoring loop: {str(e)}")
                time.sleep(5)
    
    def stop(self):
        self.running = False
        self.wait()
    
    def get_printer_list(self) -> List[Dict]:
        """Get list of printers from server"""
        try:
            response = requests.get(
                f"{self.config['server_url']}/api/printers", 
                timeout=self.config["request_timeout"]
            )
            return response.json() if response.status_code == 200 else []
        except Exception:
            return []
    
    def is_printer_online(self, ip_address: str) -> bool:
        """Check if printer is online"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(2)
            result = s.connect_ex((ip_address, 80))
            s.close()
            return result == 0
        except Exception:
            return False
    
    def get_printer_status(self, ip_address: str) -> Optional[Dict]:
        """Get printer status via Klipper/Moonraker API"""
        try:
            api_url = f"http://{ip_address}/printer/objects/query"
            data = {
                "objects": {
                    "print_stats": None,
                    "heater_bed": None,
                    "extruder": None,
                }
            }
            response = requests.post(
                url=api_url, 
                json=data, 
            )
            return response.json() if response.status_code == 200 else None
        except Exception:
            return None

class PrinterMonitorApp(QMainWindow):
    """Main application window"""
    def __init__(self):
        super().__init__()
        
        # Default configuration
        self.config = {
            "server_url": "http://83.222.17.92:5000",
            "poll_interval": 5,
            "request_timeout": 5
        }
        
        self.monitor_thread = None
        self.log_viewer = None
        self.init_ui()
        
    def init_ui(self):
        self.setWindowTitle("4erv4ok Watcher")
        self.setGeometry(100, 100, 1000, 700)
        
        # Set window icon
        try:
            self.setWindowIcon(QIcon("printer_icon.png"))
        except:
            pass
        
        # Create central widget and layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        
        # Create tabs
        tabs = QTabWidget()
        
        # Status tab
        status_tab = QWidget()
        status_layout = QVBoxLayout(status_tab)
        
        # Control buttons
        control_layout = QHBoxLayout()
        
        self.start_button = QPushButton("Start Monitoring")
        self.start_button.clicked.connect(self.start_monitoring)
        
        self.stop_button = QPushButton("Stop Monitoring")
        self.stop_button.clicked.connect(self.stop_monitoring)
        self.stop_button.setEnabled(False)
        
        self.view_logs_button = QPushButton("View Logs")
        self.view_logs_button.clicked.connect(self.show_log_viewer)
        
        control_layout.addWidget(self.start_button)
        control_layout.addWidget(self.stop_button)
        control_layout.addStretch()
        control_layout.addWidget(self.view_logs_button)
        
        # Printer status table
        self.printer_table = PrinterStatusTable()
        
        # Log output
        self.log_output = QTextEdit()
        self.log_output.setReadOnly(True)
        self.log_output.setStyleSheet("""
            QTextEdit {
                background-color: #222;
                color: #ddd;
                border: 1px solid #444;
                border-radius: 5px;
                padding: 5px;
                font-family: monospace;
            }
        """)
        
        status_layout.addLayout(control_layout)
        status_layout.addWidget(self.printer_table)
        status_layout.addWidget(QLabel("Recent Logs:"))
        status_layout.addWidget(self.log_output)
        
        # Request tester tab
        self.request_tester = RequestTester(self.config)
        
        # Settings tab
        self.settings_tab = SettingsTab(self.config, self.save_settings)
        
        # Add tabs
        tabs.addTab(status_tab, "Status")
        tabs.addTab(self.request_tester, "API Tester")
        tabs.addTab(self.settings_tab, "Settings")
        
        main_layout.addWidget(tabs)
        
        # Status bar
        self.statusBar().showMessage("Ready")
        
    def start_monitoring(self):
        """Start the monitoring thread"""
        if self.monitor_thread is None or not self.monitor_thread.isRunning():
            self.monitor_thread = PrinterMonitor(self.config)
            self.monitor_thread.update_signal.connect(self.update_printer_status)
            self.monitor_thread.log_signal.connect(self.log_message)
            self.monitor_thread.start()
            
            self.start_button.setEnabled(False)
            self.stop_button.setEnabled(True)
            self.statusBar().showMessage("Monitoring started")
            self.log_message("Monitoring started")
    
    def stop_monitoring(self):
        """Stop the monitoring thread"""
        if self.monitor_thread is not None and self.monitor_thread.isRunning():
            self.monitor_thread.stop()
            self.monitor_thread = None
            
            self.start_button.setEnabled(True)
            self.stop_button.setEnabled(False)
            self.statusBar().showMessage("Monitoring stopped")
            self.log_message("Monitoring stopped")
    
    def update_printer_status(self, data):
        """Update printer status in the table"""
        try:
            logger.debug(f"Отправка данных на сервер: {json.dumps(data, indent=2)}")
            response = requests.post(
                f"{self.config['server_url']}/receive_data", 
                json=data,
                timeout=self.config["request_timeout"]
            )
            if response.status_code == 200:
                logger.info(f"Данные успешно отправлены на сервер для принтера {data}")
                self.printer_table.update_printer(data)
                return True
            else:
                logger.error(f"Ошибка отправки данных: {response.status_code}, {response.text}")
                return False        
        except Exception as e:
            logger.error(f"Ошибка при отправке данных: {str(e)}")
            return False
        
    def log_message(self, message):
        """Add a message to the log"""
        timestamp = time.strftime("%H:%M:%S", time.localtime())
        log_entry = f"[{timestamp}] {message}"
        self.log_output.append(log_entry)
        
        # Also send to log viewer if open
        if hasattr(self, 'log_viewer') and self.log_viewer is not None:
            self.log_viewer.append_log(log_entry)
    
    def show_log_viewer(self):
        """Show the log viewer dialog"""
        if not hasattr(self, 'log_viewer') or self.log_viewer is None:
            self.log_viewer = LogViewer(self)
            self.log_viewer.finished.connect(self.on_log_viewer_closed)
        
        self.log_viewer.show()
        self.log_viewer.raise_()
        self.log_viewer.activateWindow()
    
    def on_log_viewer_closed(self):
        """Handle log viewer closing"""
        self.log_viewer = None
    
    def save_settings(self, new_config):
        """Save the updated settings"""
        self.config = new_config
        self.log_message("Settings updated")
        
        # Update request tester with new config
        self.request_tester.config = new_config
        
        # Restart monitoring if it's running
        if self.monitor_thread is not None and self.monitor_thread.isRunning():
            self.stop_monitoring()
            self.start_monitoring()
    
    def closeEvent(self, event):
        """Handle window close event"""
        self.stop_monitoring()
        if hasattr(self, 'log_viewer') and self.log_viewer is not None:
            self.log_viewer.close()
        event.accept()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    
    # Set dark theme
    app.setStyle("Fusion")
    dark_palette = app.palette()
    dark_palette.setColor(dark_palette.Window, QColor(53, 53, 53))
    dark_palette.setColor(dark_palette.WindowText, Qt.white)
    dark_palette.setColor(dark_palette.Base, QColor(35, 35, 35))
    dark_palette.setColor(dark_palette.AlternateBase, QColor(53, 53, 53))
    dark_palette.setColor(dark_palette.ToolTipBase, Qt.white)
    dark_palette.setColor(dark_palette.ToolTipText, Qt.white)
    dark_palette.setColor(dark_palette.Text, Qt.white)
    dark_palette.setColor(dark_palette.Button, QColor(53, 53, 53))
    dark_palette.setColor(dark_palette.ButtonText, Qt.white)
    dark_palette.setColor(dark_palette.BrightText, Qt.red)
    dark_palette.setColor(dark_palette.Link, QColor(42, 130, 218))
    dark_palette.setColor(dark_palette.Highlight, QColor(42, 130, 218))
    dark_palette.setColor(dark_palette.HighlightedText, Qt.black)
    app.setPalette(dark_palette)
    
    window = PrinterMonitorApp()
    window.show()
    sys.exit(app.exec_())