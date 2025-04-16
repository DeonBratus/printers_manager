
from PyQt5.QtWidgets import ( QWidget, QVBoxLayout, QLabel, QLineEdit, QPushButton, QGroupBox, QSpinBox, QMessageBox)


class SettingsTab(QWidget):
    """Application settings tab"""
    def __init__(self, config, on_save):
        super().__init__()
        self.config = config
        self.on_save = on_save
        self.init_ui()
        
    def init_ui(self):
        layout = QVBoxLayout()
        
        # Server settings
        server_group = QGroupBox("Server Settings")
        server_layout = QVBoxLayout()
        
        self.server_url_input = QLineEdit(self.config["server_url"])
        self.server_url_input.setPlaceholderText("http://server:port")
        
        server_layout.addWidget(QLabel("Server URL:"))
        server_layout.addWidget(self.server_url_input)
        server_group.setLayout(server_layout)
        
        # Monitoring settings
        monitor_group = QGroupBox("Monitoring Settings")
        monitor_layout = QVBoxLayout()
        
        self.poll_interval_spin = QSpinBox()
        self.poll_interval_spin.setRange(1, 3600)
        self.poll_interval_spin.setValue(self.config["poll_interval"])
        
        self.timeout_spin = QSpinBox()
        self.timeout_spin.setRange(1, 60)
        self.timeout_spin.setValue(self.config["request_timeout"])
        
        monitor_layout.addWidget(QLabel("Poll Interval (seconds):"))
        monitor_layout.addWidget(self.poll_interval_spin)
        monitor_layout.addWidget(QLabel("Request Timeout (seconds):"))
        monitor_layout.addWidget(self.timeout_spin)
        monitor_group.setLayout(monitor_layout)
        
        # Save button
        save_button = QPushButton("Save Settings")
        save_button.clicked.connect(self.save_settings)
        
        layout.addWidget(server_group)
        layout.addWidget(monitor_group)
        layout.addStretch()
        layout.addWidget(save_button)
        
        self.setLayout(layout)
    
    def save_settings(self):
        """Save the settings"""
        self.config["server_url"] = self.server_url_input.text().strip()
        self.config["poll_interval"] = self.poll_interval_spin.value()
        self.config["request_timeout"] = self.timeout_spin.value()
        self.on_save(self.config)
        QMessageBox.information(self, "Settings Saved", "Settings have been saved successfully.")