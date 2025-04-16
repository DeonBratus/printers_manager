import sys
import requests
import time
import json
import socket
import logging
from typing import Dict, List, Any, Optional
import urllib3
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                            QLabel, QLineEdit, QPushButton, QTextEdit, QListWidget, 
                            QTabWidget, QGroupBox, QSpinBox, QDoubleSpinBox, QCheckBox,
                            QComboBox, QTableWidget, QTableWidgetItem, QHeaderView,
                            QMessageBox, QDialog, QPlainTextEdit)
from PyQt5.QtCore import QTimer, Qt, QThread, pyqtSignal
from PyQt5.QtGui import QFont, QColor, QIcon, QTextCursor
from wmok_utils.log_viewer import LogViewer
# Disable insecure request warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("printer_monitor")




class RequestTester(QWidget):
    """Widget for testing API requests"""
    def __init__(self, config):
        super().__init__()
        self.config = config
        self.init_ui()
        
    def init_ui(self):
        layout = QVBoxLayout()
        
        # URL input
        url_group = QGroupBox("Request Settings")
        url_layout = QVBoxLayout()
        
        self.method_combo = QComboBox()
        self.method_combo.addItems(["GET", "POST", "PUT", "DELETE"])
        
        self.url_input = QLineEdit()
        self.url_input.setPlaceholderText("Enter URL or endpoint (e.g. /api/printers)")
        
        self.body_input = QTextEdit()
        self.body_input.setPlaceholderText("Request body (JSON)")
        
        url_layout.addWidget(QLabel("Method:"))
        url_layout.addWidget(self.method_combo)
        url_layout.addWidget(QLabel("URL:"))
        url_layout.addWidget(self.url_input)
        url_layout.addWidget(QLabel("Body:"))
        url_layout.addWidget(self.body_input)
        url_group.setLayout(url_layout)
        
        # Response area
        response_group = QGroupBox("Response")
        response_layout = QVBoxLayout()
        
        self.response_output = QTextEdit()
        self.response_output.setReadOnly(True)
        
        response_layout.addWidget(self.response_output)
        response_group.setLayout(response_layout)
        
        # Buttons
        self.send_button = QPushButton("Send Request")
        self.send_button.clicked.connect(self.send_request)
        
        layout.addWidget(url_group)
        layout.addWidget(response_group)
        layout.addWidget(self.send_button)
        
        self.setLayout(layout)
    
    def send_request(self):
        """Send the API request"""
        method = self.method_combo.currentText()
        url = self.url_input.text().strip()
        body_text = self.body_input.toPlainText().strip()
        
        if not url.startswith("http"):
            url = f"{self.config['server_url']}{url if url.startswith('/') else '/' + url}"
        
        try:
            body = json.loads(body_text) if body_text else None
        except json.JSONDecodeError:
            self.response_output.setPlainText("Error: Invalid JSON in request body")
            return
            
        try:
            if method == "GET":
                response = requests.get(url, timeout=self.config["request_timeout"])
            elif method == "POST":
                response = requests.post(url, json=body, timeout=self.config["request_timeout"])
            elif method == "PUT":
                response = requests.put(url, json=body, timeout=self.config["request_timeout"])
            elif method == "DELETE":
                response = requests.delete(url, timeout=self.config["request_timeout"])
            
            # Format the response
            try:
                formatted = json.dumps(response.json(), indent=2)
            except ValueError:
                formatted = response.text
                
            output = f"Status: {response.status_code}\n\nHeaders:\n{json.dumps(dict(response.headers), indent=2)}\n\nBody:\n{formatted}"
            self.response_output.setPlainText(output)
            
        except Exception as e:
            self.response_output.setPlainText(f"Error: {str(e)}")