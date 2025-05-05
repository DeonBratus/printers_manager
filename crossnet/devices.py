# devices.py
from pydantic import BaseModel
from typing import Dict

class PrinterDevice(BaseModel):
    ip_address: str
    name: str
    api_key: str = ""
    description: str = ""

# Хранилище принтеров (вместо БД)
printer_registry: Dict[str, PrinterDevice] = {}

def add_printer(printer_id: str, printer: PrinterDevice):
    printer_registry[printer_id] = printer

def get_printer(printer_id: str) -> PrinterDevice:
    return printer_registry.get(printer_id)

def list_printers() -> Dict[str, PrinterDevice]:
    return printer_registry