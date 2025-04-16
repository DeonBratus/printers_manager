import sys
import requests
import time
import json
import socket
import logging
from typing import Dict, List, Any, Optional
import urllib3
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                           QHBoxLayout, QLabel, QPushButton, QTextEdit, 
                           QTabWidget, QDialog, QLineEdit, QFormLayout,
                           QMessageBox, QCheckBox, QMenu, QAction, 
                           QListWidget, QComboBox, QGroupBox, QSplitter,
                           QTableWidget, QTableWidgetItem, QHeaderView)
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from PyQt5.QtGui import QColor, QIcon

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


class AddPrinterDialog(QDialog):
    """Dialog for adding a new printer"""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Add Printer")
        self.setModal(True)
        self.init_ui()
        
    def init_ui(self):
        layout = QFormLayout()
        
        # Printer name input
        self.name_input = QLineEdit()
        layout.addRow("Printer Name:", self.name_input)
        
        # IP address input
        self.ip_input = QLineEdit()
        layout.addRow("IP Address:", self.ip_input)
        
        # Buttons
        button_layout = QHBoxLayout()
        self.cancel_button = QPushButton("Cancel")
        self.cancel_button.clicked.connect(self.reject)
        
        self.add_button = QPushButton("Add Printer")
        self.add_button.clicked.connect(self.accept)
        
        button_layout.addWidget(self.cancel_button)
        button_layout.addWidget(self.add_button)
        
        layout.addRow("", button_layout)
        self.setLayout(layout)
    
    def get_printer_data(self):
        return {
            "name": self.name_input.text().strip(),
            "ip_address": self.ip_input.text().strip()
        }


class SavedRequestsTab(QWidget):
    """Tab for saving and executing predefined printer requests"""
    def __init__(self, config, printer_list_getter):
        super().__init__()
        self.config = config
        self.get_printer_list = printer_list_getter
        self.saved_requests = self.load_default_requests()
        self.init_ui()
        
    def init_ui(self):
        layout = QVBoxLayout()
        
        # Create splitter for requests list and details
        splitter = QSplitter(Qt.Horizontal)
        
        # Request list on the left
        requests_widget = QWidget()
        requests_layout = QVBoxLayout(requests_widget)
        
        self.requests_list = QListWidget()
        self.requests_list.currentRowChanged.connect(self.on_request_selected)
        
        # Add predefined requests to list
        for request in self.saved_requests:
            self.requests_list.addItem(request["name"])
        
        # Buttons for managing requests
        list_buttons_layout = QHBoxLayout()
        
        add_btn = QPushButton("New Request")
        add_btn.clicked.connect(self.add_new_request)
        
        delete_btn = QPushButton("Delete Request")
        delete_btn.clicked.connect(self.delete_request)
        
        list_buttons_layout.addWidget(add_btn)
        list_buttons_layout.addWidget(delete_btn)
        
        requests_layout.addWidget(QLabel("Saved Requests:"))
        requests_layout.addWidget(self.requests_list)
        requests_layout.addLayout(list_buttons_layout)
        
        # Request details on the right
        details_widget = QWidget()
        self.details_layout = QVBoxLayout(details_widget)
        
        # Printer selection
        printer_group = QGroupBox("Target Printer")
        printer_layout = QVBoxLayout()
        
        self.printer_combo = QComboBox()
        self.update_printer_list()
        
        printer_layout.addWidget(self.printer_combo)
        printer_group.setLayout(printer_layout)
        
        # Request details
        request_group = QGroupBox("Request Details")
        self.request_layout = QVBoxLayout(request_group)
        
        # Name field
        name_layout = QHBoxLayout()
        name_layout.addWidget(QLabel("Name:"))
        self.request_name = QLineEdit()
        name_layout.addWidget(self.request_name)
        
        # URL field
        url_layout = QHBoxLayout()
        url_layout.addWidget(QLabel("URL:"))
        self.request_url = QLineEdit()
        url_layout.addWidget(self.request_url)
        
        # Method selection
        method_layout = QHBoxLayout()
        method_layout.addWidget(QLabel("Method:"))
        self.method_combo = QComboBox()
        self.method_combo.addItems(["GET", "POST"])
        method_layout.addWidget(self.method_combo)
        
        # Data field
        data_layout = QVBoxLayout()
        data_layout.addWidget(QLabel("Request Data (JSON):"))
        self.request_data = QTextEdit()
        self.request_data.setPlaceholderText('{\n    "key": "value"\n}')
        data_layout.addWidget(self.request_data)
        
        # Add all to request layout
        self.request_layout.addLayout(name_layout)
        self.request_layout.addLayout(url_layout)
        self.request_layout.addLayout(method_layout)
        self.request_layout.addLayout(data_layout)
        
        # Response area
        response_group = QGroupBox("Response")
        response_layout = QVBoxLayout()
        
        self.response_text = QTextEdit()
        self.response_text.setReadOnly(True)
        
        response_layout.addWidget(self.response_text)
        response_group.setLayout(response_layout)
        
        # Execute button
        self.execute_btn = QPushButton("Execute Request")
        self.execute_btn.clicked.connect(self.execute_request)
        
        # Save button
        self.save_btn = QPushButton("Save Changes")
        self.save_btn.clicked.connect(self.save_request)
        
        # Add all to details layout
        button_layout = QHBoxLayout()
        button_layout.addWidget(self.execute_btn)
        button_layout.addWidget(self.save_btn)
        
        self.details_layout.addWidget(printer_group)
        self.details_layout.addWidget(request_group)
        self.details_layout.addWidget(response_group)
        self.details_layout.addLayout(button_layout)
        
        # Add widgets to splitter
        splitter.addWidget(requests_widget)
        splitter.addWidget(details_widget)
        splitter.setSizes([200, 400])  # Set initial sizes
        
        layout.addWidget(splitter)
        self.setLayout(layout)
        
        # Select first item if available
        if self.requests_list.count() > 0:
            self.requests_list.setCurrentRow(0)
    
    def update_printer_list(self):
        """Update the printer dropdown with current printers"""
        self.printer_combo.clear()
        for printer in self.get_printer_list():
            self.printer_combo.addItem(f"{printer['name']} ({printer['ip_address']})", printer)
    
    def on_request_selected(self, row):
        """Update UI when a saved request is selected"""
        if row < 0 or row >= len(self.saved_requests):
            return
            
        request = self.saved_requests[row]
        self.request_name.setText(request["name"])
        self.request_url.setText(request["url"])
        
        # Set method
        method_index = self.method_combo.findText(request["method"])
        if method_index >= 0:
            self.method_combo.setCurrentIndex(method_index)
            
        # Set data
        if "data" in request and request["data"]:
            try:
                formatted_data = json.dumps(request["data"], indent=4)
                self.request_data.setText(formatted_data)
            except:
                self.request_data.setText(str(request["data"]))
        else:
            self.request_data.clear()
            
        # Clear response
        self.response_text.clear()
    
    def add_new_request(self):
        """Add a new empty request"""
        new_request = {
            "name": "New Request",
            "url": "/printer/objects/query",
            "method": "POST",
            "data": {"objects": {"print_stats": None, "heater_bed": None, "extruder": None}}
        }
        
        self.saved_requests.append(new_request)
        self.requests_list.addItem(new_request["name"])
        self.requests_list.setCurrentRow(len(self.saved_requests) - 1)
    
    def delete_request(self):
        """Delete the selected request"""
        row = self.requests_list.currentRow()
        if row < 0:
            return
            
        # Ask for confirmation
        reply = QMessageBox.question(
            self,
            "Confirm Deletion",
            f"Are you sure you want to delete '{self.saved_requests[row]['name']}'?",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            self.saved_requests.pop(row)
            self.requests_list.takeItem(row)
            
            # Select another item if available
            if self.requests_list.count() > 0:
                self.requests_list.setCurrentRow(max(0, row - 1))
    
    def save_request(self):
        """Save changes to the current request"""
        row = self.requests_list.currentRow()
        if row < 0:
            return
            
        # Get values from fields
        name = self.request_name.text().strip()
        if not name:
            QMessageBox.warning(self, "Invalid Input", "Request name cannot be empty")
            return
            
        # Update the request
        self.saved_requests[row]["name"] = name
        self.saved_requests[row]["url"] = self.request_url.text().strip()
        self.saved_requests[row]["method"] = self.method_combo.currentText()
        
        # Parse JSON data
        data_text = self.request_data.toPlainText().strip()
        if data_text:
            try:
                data = json.loads(data_text)
                self.saved_requests[row]["data"] = data
            except json.JSONDecodeError as e:
                QMessageBox.warning(self, "Invalid JSON", f"Request data is not valid JSON: {str(e)}")
                return
        else:
            self.saved_requests[row]["data"] = None
        
        # Update list item
        self.requests_list.item(row).setText(name)
        
        QMessageBox.information(self, "Success", "Request saved successfully")
    
    def execute_request(self):
        """Execute the current request against the selected printer"""
        # Check if printer is selected
        if self.printer_combo.count() == 0:
            QMessageBox.warning(self, "No Printers", "Please add at least one printer first")
            return
            
        # Get selected printer
        printer_data = self.printer_combo.currentData()
        if not printer_data:
            return
            
        # Get current request
        row = self.requests_list.currentRow()
        if row < 0:
            return
        request = self.saved_requests[row]
        
        # Construct full URL
        base_url = f"http://{printer_data['ip_address']}"
        url = base_url + request["url"] if request["url"].startswith("/") else base_url + "/" + request["url"]
        
        # Execute request
        try:
            self.response_text.setText("Sending request...")
            self.response_text.repaint()  # Force update
            
            if request["method"] == "GET":
                response = requests.get(url, timeout=self.config["request_timeout"])
            else:
                response = requests.post(url, json=request["data"], timeout=self.config["request_timeout"])
            
            # Display response
            try:
                response_json = response.json()
                formatted_response = json.dumps(response_json, indent=4)
                self.response_text.setText(f"Status: {response.status_code}\n\n{formatted_response}")
            except:
                self.response_text.setText(f"Status: {response.status_code}\n\n{response.text}")
                
        except Exception as e:
            self.response_text.setText(f"Error: {str(e)}")
    
    def load_default_requests(self):
        """Load default printer requests"""
        return [
            {
                "name": "Printer Status",
                "url": "/printer/objects/query",
                "method": "POST",
                "data": {
                    "objects": {
                        "print_stats": None,
                        "heater_bed": None,
                        "extruder": None,
                        "virtual_sdcard": None
                    }
                }
            },
            {
                "name": "Set Extruder Temperature",
                "url": "/printer/gcode/script",
                "method": "POST",
                "data": {
                    "script": "SET_HEATER_TEMPERATURE HEATER=extruder TARGET=200"
                }
            },
            {
                "name": "Set Bed Temperature",
                "url": "/printer/gcode/script",
                "method": "POST",
                "data": {
                    "script": "SET_HEATER_TEMPERATURE HEATER=heater_bed TARGET=60"
                }
            },
            {
                "name": "Pause Print",
                "url": "/printer/print/pause",
                "method": "POST",
                "data": {}
            },
            {
                "name": "Resume Print",
                "url": "/printer/print/resume",
                "method": "POST",
                "data": {}
            },
            {
                "name": "Cancel Print",
                "url": "/printer/print/cancel",
                "method": "POST",
                "data": {}
            },
            {
                "name": "Home All Axes",
                "url": "/printer/gcode/script",
                "method": "POST",
                "data": {
                    "script": "G28"
                }
            },
            {
                "name": "Get Printer Info",
                "url": "/printer/info",
                "method": "GET",
                "data": None
            }
        ]


class PrinterMonitor(QThread):
    """Thread for monitoring printers"""
    update_signal = pyqtSignal(dict)
    log_signal = pyqtSignal(str)
    
    def __init__(self, config, printer_list):
        super().__init__()
        self.config = config
        self.printer_list = printer_list
        self.running = False
        self.send_to_server = False
        
    def run(self):
        self.running = True
        while self.running:
            try:
                self.log_signal.emit(f"Monitoring {len(self.printer_list)} printers")
                
                for printer in self.printer_list:
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
                            "timestamp": time.time(),
                            "send_to_server": self.send_to_server
                        }
                        self.update_signal.emit(data)
                        continue
                    
                    # Get printer status
                    status_data = self.get_printer_status(ip_address)
                    
                    if status_data:
                        self.log_signal.emit(f"Received data from {printer_name}")
                        data = {
                            "printer_name": printer_name,
                            "ip_address": ip_address,
                            "status": "online",
                            "result": status_data,
                            "timestamp": time.time(),
                            "send_to_server": self.send_to_server
                        }
                        self.update_signal.emit(data)
                    else:
                        self.log_signal.emit(f"Failed to get status from {printer_name}")
                        data = {
                            "printer_name": printer_name,
                            "ip_address": ip_address,
                            "status": "error",
                            "result": {"error": "Failed to get printer status"},
                            "timestamp": time.time(),
                            "send_to_server": self.send_to_server
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
    
    def set_send_to_server(self, value):
        """Set whether to send data to server"""
        self.send_to_server = value
        status = "enabled" if value else "disabled"
        self.log_signal.emit(f"Server data transmission {status}")
    
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
        self.printer_list = []
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
        
        # Printer management buttons
        printer_mgmt_layout = QHBoxLayout()
        
        self.add_printer_button = QPushButton("Add Printer")
        self.add_printer_button.clicked.connect(self.add_printer)
        
        self.delete_printer_button = QPushButton("Delete Printer")
        self.delete_printer_button.clicked.connect(self.delete_printer)
        
        printer_mgmt_layout.addWidget(self.add_printer_button)
        printer_mgmt_layout.addWidget(self.delete_printer_button)
        printer_mgmt_layout.addStretch()
        
        # Control buttons
        control_layout = QHBoxLayout()
        
        self.start_button = QPushButton("Start Monitoring")
        self.start_button.clicked.connect(self.start_monitoring)
        
        self.stop_button = QPushButton("Stop Monitoring")
        self.stop_button.clicked.connect(self.stop_monitoring)
        self.stop_button.setEnabled(False)
        
        self.server_connection_button = QPushButton("Connect to Server")
        self.server_connection_button.setCheckable(True)
        self.server_connection_button.clicked.connect(self.toggle_server_connection)
        
        self.view_logs_button = QPushButton("View Logs")
        self.view_logs_button.clicked.connect(self.show_log_viewer)
        
        control_layout.addWidget(self.start_button)
        control_layout.addWidget(self.stop_button)
        control_layout.addWidget(self.server_connection_button)
        control_layout.addStretch()
        control_layout.addWidget(self.view_logs_button)
        
        # Printer status table
        self.printer_table = PrinterStatusTable()
        self.printer_table.setContextMenuPolicy(Qt.CustomContextMenu)
        self.printer_table.customContextMenuRequested.connect(self.show_printer_context_menu)
        
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
        
        status_layout.addLayout(printer_mgmt_layout)
        status_layout.addLayout(control_layout)
        status_layout.addWidget(self.printer_table)
        status_layout.addWidget(QLabel("Recent Logs:"))
        status_layout.addWidget(self.log_output)
        
        # Saved Requests tab
        self.saved_requests_tab = SavedRequestsTab(self.config, self.get_printer_list)
        
        # Request tester tab
        self.request_tester = RequestTester(self.config)
        
        # Settings tab
        self.settings_tab = SettingsTab(self.config, self.save_settings)
        
        # Add tabs
        tabs.addTab(status_tab, "Status")
        tabs.addTab(self.saved_requests_tab, "Saved Requests")
        tabs.addTab(self.request_tester, "API Tester")
        tabs.addTab(self.settings_tab, "Settings")
        
        main_layout.addWidget(tabs)
        
        # Status bar
        self.statusBar().showMessage("Ready")
        
    def add_printer(self):
        """Add a new printer to the list"""
        dialog = AddPrinterDialog(self)
        if dialog.exec_():
            printer_data = dialog.get_printer_data()
            
            # Validate
            if not printer_data["name"]:
                QMessageBox.warning(self, "Invalid Input", "Printer name cannot be empty")
                return
                
            if not printer_data["ip_address"]:
                QMessageBox.warning(self, "Invalid Input", "IP address cannot be empty")
                return
                
            # Check for duplicates
            for printer in self.printer_list:
                if printer["name"] == printer_data["name"]:
                    QMessageBox.warning(self, "Duplicate Printer", 
                                       f"A printer with the name '{printer_data['name']}' already exists")
                    return
            
            self.printer_list.append(printer_data)
            self.log_message(f"Added printer: {printer_data['name']} ({printer_data['ip_address']})")
            
            # Update saved requests tab printer list
            self.saved_requests_tab.update_printer_list()
            
            # Restart monitoring if running
            if self.monitor_thread is not None and self.monitor_thread.isRunning():
                self.stop_monitoring()
                self.start_monitoring()
    
    def delete_printer(self):
        """Delete the selected printer"""
        selected_rows = self.printer_table.selectionModel().selectedRows()
        if not selected_rows:
            QMessageBox.information(self, "No Selection", "Please select a printer to delete")
            return
            
        row = selected_rows[0].row()
        if row < 0 or row >= len(self.printer_list):
            return
            
        printer_name = self.printer_list[row]["name"]
            
        # Ask for confirmation
        reply = QMessageBox.question(
            self,
            "Confirm Deletion",
            f"Are you sure you want to delete printer '{printer_name}'?",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            # Remove from list
            del self.printer_list[row]
            self.log_message(f"Deleted printer: {printer_name}")
            
            # Remove from table
            for i in range(self.printer_table.rowCount()):
                if self.printer_table.item(i, 0).text() == printer_name:
                    self.printer_table.removeRow(i)
                    break
            
            # Update saved requests tab printer list
            self.saved_requests_tab.update_printer_list()
            
            # Restart monitoring if running
            if self.monitor_thread is not None and self.monitor_thread.isRunning():
                self.stop_monitoring()
                self.start_monitoring()
    
    def show_printer_context_menu(self, position):
        """Show context menu for printer table"""
        context_menu = QMenu()
        delete_action = QAction("Delete Printer", self)
        delete_action.triggered.connect(self.delete_printer)
        context_menu.addAction(delete_action)
        
        # Show menu at cursor position
        context_menu.exec_(self.printer_table.mapToGlobal(position))
    
    def get_printer_list(self):
        """Return the current printer list"""
        return self.printer_list
    
    def start_monitoring(self):
        """Start the monitoring thread"""
        if not self.printer_list:
            QMessageBox.warning(self, "No Printers", "Please add at least one printer before starting monitoring")
            return
            
        if self.monitor_thread is None or not self.monitor_thread.isRunning():
            self.monitor_thread = PrinterMonitor(self.config, self.printer_list)
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
    
    def toggle_server_connection(self):
        """Toggle sending data to server"""
        if self.server_connection_button.isChecked():
            self.server_connection_button.setText("Disconnect from Server")
            if self.monitor_thread is not None:
                self.monitor_thread.set_send_to_server(True)
        else:
            self.server_connection_button.setText("Connect to Server")
            if self.monitor_thread is not None:
                self.monitor_thread.set_send_to_server(False)
    
    def update_printer_status(self, data):
        """Update printer status in the table and optionally send to server"""
        # Update the local table
        self.printer_table.update_printer(data)
        
        # Send to server if enabled
        if data.get("send_to_server", False):
            try:
                logger.debug(f"Sending data to server: {json.dumps(data, indent=2)}")
                # Remove the send_to_server flag from data before sending
                send_data = data.copy()
                if "send_to_server" in send_data:
                    del send_data["send_to_server"]
                    
                response = requests.post(
                    f"{self.config['server_url']}/receive_data", 
                    json=send_data,
                    timeout=self.config["request_timeout"]
                )
                if response.status_code == 200:
                    logger.info(f"Data successfully sent to server for printer {data['printer_name']}")
                    return True
                else:
                    logger.error(f"Error sending data: {response.status_code}, {response.text}")
                    return False        
            except Exception as e:
                logger.error(f"Error when sending data: {str(e)}")
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
        self.saved_requests_tab.config = new_config
        
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