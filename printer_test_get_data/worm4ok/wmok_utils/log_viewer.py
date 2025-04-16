from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                            QLabel, QLineEdit, QPushButton, QTextEdit, QListWidget, 
                            QTabWidget, QGroupBox, QSpinBox, QDoubleSpinBox, QCheckBox,
                            QComboBox, QTableWidget, QTableWidgetItem, QHeaderView,
                            QMessageBox, QDialog, QPlainTextEdit)
from PyQt5.QtCore import QTimer, Qt, QThread, pyqtSignal
from PyQt5.QtGui import QFont, QColor, QIcon, QTextCursor

class LogViewer(QDialog):
    """Dialog for viewing logs"""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Application Logs")
        self.setGeometry(200, 200, 800, 600)
        
        layout = QVBoxLayout()
        
        self.log_view = QPlainTextEdit()
        self.log_view.setReadOnly(True)
        self.log_view.setStyleSheet("""
            QPlainTextEdit {
                background-color: #222;
                color: #ddd;
                border: 1px solid #444;
                border-radius: 5px;
                padding: 5px;
                font-family: monospace;
            }
        """)
        
        button_box = QHBoxLayout()
        self.clear_button = QPushButton("Clear Logs")
        self.close_button = QPushButton("Close")
        
        button_box.addWidget(self.clear_button)
        button_box.addStretch()
        button_box.addWidget(self.close_button)
        
        layout.addWidget(self.log_view)
        layout.addLayout(button_box)
        
        self.setLayout(layout)
        
        # Connect signals
        self.clear_button.clicked.connect(self.clear_logs)
        self.close_button.clicked.connect(self.close)
    
    def append_log(self, message):
        """Append a message to the log viewer"""
        self.log_view.appendPlainText(message)
        self.log_view.moveCursor(QTextCursor.End)
    
    def clear_logs(self):
        """Clear all logs"""
        self.log_view.clear()