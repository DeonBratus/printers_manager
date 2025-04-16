
from PyQt5.QtWidgets import QTableWidget, QTableWidgetItem, QHeaderView
from PyQt5.QtGui import  QColor

class PrinterStatusTable(QTableWidget):
    """Table widget to display printer status"""
    def __init__(self):
        super().__init__()
        self.setColumnCount(6)
        self.setHorizontalHeaderLabels(["Printer", "Status", "Bed Temp", "Extruder Temp", "Progress", "IP Address"])
        self.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.verticalHeader().setVisible(False)
        self.setEditTriggers(QTableWidget.NoEditTriggers)
        self.setSelectionBehavior(QTableWidget.SelectRows)
        self.setStyleSheet("""
            QTableWidget {
                border: 1px solid #444;
                border-radius: 5px;
                padding: 5px;
            }
            QHeaderView::section {
                background-color: #333;
                padding: 5px;
                border: none;
            }
        """)
    
    def update_printer(self, data: dict):
        """Update or add printer status"""
        printer_name = data["printer_name"]
        ip_address = data["ip_address"]
        status = data["status"]
        
        # Find existing row
        row = -1
        for i in range(self.rowCount()):
            if self.item(i, 0).text() == printer_name:
                row = i
                break
        
        # Add new row if not found
        if row == -1:
            row = self.rowCount()
            self.insertRow(row)
            self.setItem(row, 0, QTableWidgetItem(printer_name))
            self.setItem(row, 5, QTableWidgetItem(ip_address))
        
        # Update status
        status_item = QTableWidgetItem(status.capitalize())
        if status == "online":
            status_item.setForeground(QColor(0, 200, 0))
        elif status == "offline":
            status_item.setForeground(QColor(200, 0, 0))
        else:
            status_item.setForeground(QColor(200, 200, 0))
        self.setItem(row, 1, status_item)
        
        # Update temperatures and progress if online
        if status == "online":
            result = data.get("result", {}).get("status", {})
            
            # Bed temperature
            bed_temp = result.get("heater_bed", {}).get("temperature", 0)
            bed_target = result.get("heater_bed", {}).get("target", 0)
            bed_text = f"{bed_temp:.1f}°C / {bed_target:.1f}°C" if bed_target else f"{bed_temp:.1f}°C"
            self.setItem(row, 2, QTableWidgetItem(bed_text))
            
            # Extruder temperature
            extruder_temp = result.get("extruder", {}).get("temperature", 0)
            extruder_target = result.get("extruder", {}).get("target", 0)
            extruder_text = f"{extruder_temp:.1f}°C / {extruder_target:.1f}°C" if extruder_target else f"{extruder_temp:.1f}°C"
            self.setItem(row, 3, QTableWidgetItem(extruder_text))
            
            # Print progress
            print_stats = result.get("print_stats", {})
            filename = print_stats.get("filename", "N/A")
            progress = print_stats.get("print_duration", 0)
            self.setItem(row, 4, QTableWidgetItem(f"{filename} ({progress:.0f}s)"))
        else:
            self.setItem(row, 2, QTableWidgetItem("N/A"))
            self.setItem(row, 3, QTableWidgetItem("N/A"))
            self.setItem(row, 4, QTableWidgetItem("N/A"))