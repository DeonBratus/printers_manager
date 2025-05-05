# commands.py
from typing import Dict, List

COMMAND_POOL: Dict[str, Dict] = {
    "get_status": {
        "endpoint": "/printer/objects/query",
        "method": "GET",
        "params": {"objects": "print_stats,display_status"}
    },
    "pause_print": {
        "endpoint": "/printer/print/pause",
        "method": "POST"
    },
    "resume_print": {
        "endpoint": "/printer/print/resume",
        "method": "POST"
    },
    "cancel_print": {
        "endpoint": "/printer/print/cancel",
        "method": "POST"
    },
    "get_files": {
        "endpoint": "/server/files/list",
        "method": "GET"
    },
    "start_print": {
        "endpoint": "/printer/print/start",
        "method": "POST",
        "data_template": {"filename": "{filename}"}
    },
    "home_all": {
        "endpoint": "/printer/gcode/script",
        "method": "POST",
        "data_template": {"script": "G28"}
    }
}

def get_command(name: str, **kwargs) -> Dict:
    """Возвращает команду с подставленными параметрами"""
    if name not in COMMAND_POOL:
        raise ValueError(f"Unknown command: {name}")
    
    command = COMMAND_POOL[name].copy()
    
    if "data_template" in command:
        command["data"] = {k: v.format(**kwargs) for k, v in command["data_template"].items()}
        del command["data_template"]
    
    return command