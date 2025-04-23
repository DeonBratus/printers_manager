from sqlalchemy.orm import Session
from dal import model as model_dal
from schemas.models_schemas import ModelCreate, ModelFileCreate, GCodeFileCreate

class ModelService():
    def create_model(db: Session, model: ModelCreate):
        return model_dal.create(db, model)

    def get_model(db: Session, model_id: int):
        return model_dal.get(db, model_id)

    def get_models(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False, studio_id: int = None, related_to_id: int = None):
        return model_dal.get_all(db, skip, limit, sort_by, sort_desc, studio_id, related_to_id)

    def update_model(db: Session, model_id: int, model: ModelCreate):
        return model_dal.update(db, model_id, model.dict())

    def delete_model(db: Session, model_id: int):
        return model_dal.delete(db, model_id)
    
    # Model file methods
    def upload_model_file(db: Session, model_file: ModelFileCreate, file_content: bytes):
        try:
            return model_dal.save_model_file(db, model_file, file_content)
        except Exception as e:
            # Log the error but don't propagate it
            print(f"Error uploading model file: {str(e)}")
            # Recreate directories if they don't exist
            from pathlib import Path
            upload_dir = Path("uploads")
            model_dir = upload_dir / "models"
            model_dir.mkdir(parents=True, exist_ok=True)
            # Try again
            return model_dal.save_model_file(db, model_file, file_content)
    
    def get_model_file(db: Session, file_id: int):
        return model_dal.get_model_file(db, file_id)
    
    def get_model_files(db: Session, model_id: int):
        return model_dal.get_model_files(db, model_id)
    
    def delete_model_file(db: Session, file_id: int):
        return model_dal.delete_model_file(db, file_id)
    
    # G-code file methods
    def upload_gcode_file(db: Session, gcode_file: GCodeFileCreate, file_content: bytes):
        try:
            return model_dal.save_gcode_file(db, gcode_file, file_content)
        except Exception as e:
            # Log the error but don't propagate it
            print(f"Error uploading gcode file: {str(e)}")
            # Recreate directories if they don't exist
            from pathlib import Path
            upload_dir = Path("uploads")
            gcode_dir = upload_dir / "gcodes"
            gcode_dir.mkdir(parents=True, exist_ok=True)
            # Try again
            return model_dal.save_gcode_file(db, gcode_file, file_content)
    
    def get_gcode_file(db: Session, file_id: int):
        return model_dal.get_gcode_file(db, file_id)
    
    def get_gcode_files_for_model(db: Session, model_id: int):
        return model_dal.get_gcode_files_for_model(db, model_id)
    
    def get_gcode_files_for_printer(db: Session, printer_id: int):
        return model_dal.get_gcode_files_for_printer(db, printer_id)
    
    def delete_gcode_file(db: Session, file_id: int):
        return model_dal.delete_gcode_file(db, file_id)

    # Add new methods for model relationships
    def add_model_relation(db: Session, model_id: int, related_model_id: int, relation_type: str = None):
        return model_dal.add_model_relation(db, model_id, related_model_id, relation_type)

    def remove_model_relation(db: Session, model_id: int, related_model_id: int):
        return model_dal.remove_model_relation(db, model_id, related_model_id)

    def get_related_models(db: Session, model_id: int):
        return model_dal.get_related_models(db, model_id)
