from sqlalchemy.orm import Session
from sqlalchemy import desc
from models import Model, ModelFile, GCodeFile
from schemas.models_schemas import ModelCreate, ModelFileCreate, GCodeFileCreate
import os
from pathlib import Path

# Define constants for file storage
UPLOAD_DIR = Path(os.path.abspath("uploads"))
MODEL_FILES_DIR = UPLOAD_DIR / "models"
GCODE_FILES_DIR = UPLOAD_DIR / "gcodes"

# Ensure directories exist
if not MODEL_FILES_DIR.exists():
    MODEL_FILES_DIR.mkdir(parents=True, exist_ok=True)
if not GCODE_FILES_DIR.exists():
    GCODE_FILES_DIR.mkdir(parents=True, exist_ok=True)

def create(db: Session, model: ModelCreate):
    db_model = Model(**model.dict())
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model

def get(db: Session, model_id: int):
    return db.query(Model).filter(Model.id == model_id).first()

def get_all(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False, studio_id: int = None, parent_id: int = None):
    query = db.query(Model)
    
    # Filter by studio_id if provided
    if studio_id is not None:
        query = query.filter(Model.studio_id == studio_id)
        
    # Filter by parent_id if provided (for composite models)
    if parent_id is not None:
        query = query.filter(Model.parent_id == parent_id)
    else:
        # By default, show only top-level models (not children)
        query = query.filter(Model.parent_id == None)
        
    if sort_by and hasattr(Model, sort_by):
        order_by = desc(getattr(Model, sort_by)) if sort_desc else getattr(Model, sort_by)
        query = query.order_by(order_by)
    return query.offset(skip).limit(limit).all()

def update(db: Session, model_id: int, model_data: dict):
    db_model = get(db, model_id)
    if db_model:
        for key, value in model_data.items():
            setattr(db_model, key, value)
        db.commit()
        db.refresh(db_model)
    return db_model

def delete(db: Session, model_id: int):
    # Get all model files associated with this model
    model_files = db.query(ModelFile).filter(ModelFile.model_id == model_id).all()
    gcode_files = db.query(GCodeFile).filter(GCodeFile.model_id == model_id).all()
    
    # Delete physical files
    for file in model_files:
        try:
            if os.path.exists(file.file_path):
                os.remove(file.file_path)
        except Exception as e:
            print(f"Error deleting file {file.file_path}: {e}")
    
    for file in gcode_files:
        try:
            if os.path.exists(file.file_path):
                os.remove(file.file_path)
        except Exception as e:
            print(f"Error deleting file {file.file_path}: {e}")
    
    db_model = get(db, model_id)
    if db_model:
        db.delete(db_model)
        db.commit()
    return db_model

# Model file operations
def save_model_file(db: Session, model_file: ModelFileCreate, file_content: bytes):
    # Ensure directory exists
    if not MODEL_FILES_DIR.exists():
        MODEL_FILES_DIR.mkdir(parents=True, exist_ok=True)
        
    # Create file path
    filename = f"{model_file.model_id}_{model_file.filename}"
    file_path = str(MODEL_FILES_DIR / filename)
    
    # Save file to disk
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Create model file record
    db_file = ModelFile(
        **model_file.dict(),
        file_path=file_path,
        file_size=file_size
    )
    
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file

def get_model_file(db: Session, file_id: int):
    return db.query(ModelFile).filter(ModelFile.id == file_id).first()

def get_model_files(db: Session, model_id: int):
    return db.query(ModelFile).filter(ModelFile.model_id == model_id).all()

def delete_model_file(db: Session, file_id: int):
    db_file = get_model_file(db, file_id)
    if db_file:
        # Delete physical file
        try:
            if os.path.exists(db_file.file_path):
                os.remove(db_file.file_path)
        except Exception as e:
            print(f"Error deleting file {db_file.file_path}: {e}")
        
        # Delete record
        db.delete(db_file)
        db.commit()
    return db_file

# G-code file operations
def save_gcode_file(db: Session, gcode_file: GCodeFileCreate, file_content: bytes):
    # Ensure directory exists
    if not GCODE_FILES_DIR.exists():
        GCODE_FILES_DIR.mkdir(parents=True, exist_ok=True)
        
    # Create unique filename
    model_id = gcode_file.model_id or "none"
    printer_id = gcode_file.printer_id or "none"
    filename = f"{model_id}_{printer_id}_{gcode_file.filename}"
    file_path = str(GCODE_FILES_DIR / filename)
    
    # Save file to disk
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Create gcode file record
    db_file = GCodeFile(
        **gcode_file.dict(),
        file_path=file_path,
        file_size=file_size
    )
    
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file

def get_gcode_file(db: Session, file_id: int):
    return db.query(GCodeFile).filter(GCodeFile.id == file_id).first()

def get_gcode_files_for_model(db: Session, model_id: int):
    return db.query(GCodeFile).filter(GCodeFile.model_id == model_id).all()

def get_gcode_files_for_printer(db: Session, printer_id: int):
    return db.query(GCodeFile).filter(GCodeFile.printer_id == printer_id).all()

def delete_gcode_file(db: Session, file_id: int):
    db_file = get_gcode_file(db, file_id)
    if db_file:
        # Delete physical file
        try:
            if os.path.exists(db_file.file_path):
                os.remove(db_file.file_path)
        except Exception as e:
            print(f"Error deleting file {db_file.file_path}: {e}")
        
        # Delete record
        db.delete(db_file)
        db.commit()
    return db_file
