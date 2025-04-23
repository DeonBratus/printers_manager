from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from db.database import get_db
from schemas import ModelCreate, Model, ModelFile, ModelFileCreate, GCodeFile, GCodeFileCreate, ModelSimple
from services import ModelService
from auth.auth import get_current_active_user, get_studio_id_from_user
from models import User
import os
import shutil

router = APIRouter(
    prefix="/models",
    tags=["models"]
)

@router.post("/", response_model=Model)
def create_new_model(
    model: ModelCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Set studio_id if not provided
    if not model.studio_id:
        model.studio_id = get_studio_id_from_user(current_user, db)
    return ModelService.create_model(db, model)

@router.get("/", response_model=List[Model])
def read_models(
    skip: int = 0, 
    limit: int = 100, 
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    studio_id: Optional[int] = None,
    related_to_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get models filtered by studio_id unless user is superuser
    if current_user.is_superuser:
        models = ModelService.get_models(
            db, 
            skip=skip, 
            limit=limit, 
            sort_by=sort_by, 
            sort_desc=sort_desc, 
            related_to_id=related_to_id
        )
    else:
        # Get the current studio ID from the user's studios using the passed studio_id
        user_studio_id = get_studio_id_from_user(current_user, db, studio_id)
        
        # Filter models by studio_id
        models = ModelService.get_models(
            db, 
            skip=skip, 
            limit=limit, 
            sort_by=sort_by, 
            sort_desc=sort_desc,
            studio_id=user_studio_id,
            related_to_id=related_to_id
        )
    return models

@router.get("/{model_id}", response_model=Model)
def read_model(
    model_id: int, 
    studio_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_model = ModelService.get_model(db, model_id=model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check if user has access to this model
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios using the passed studio_id
        user_studio_id = get_studio_id_from_user(current_user, db, studio_id)
        
        if db_model.studio_id != user_studio_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this model")
    
    return db_model

@router.put("/{model_id}", response_model=Model)
def update_existing_model(
    model_id: int, 
    model: ModelCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if model exists and user has access
    db_model = ModelService.get_model(db, model_id=model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check permissions
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        
        if db_model.studio_id != studio_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this model")
    
    # Ensure studio_id is set if not provided in update
    if not model.studio_id:
        model.studio_id = get_studio_id_from_user(current_user, db)
        
    db_model = ModelService.update_model(db, model_id=model_id, model=model)
    return db_model

@router.delete("/{model_id}", response_model=Model)
def delete_existing_model(
    model_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if model exists and user has access
    db_model = ModelService.get_model(db, model_id=model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check permissions
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        
        if db_model.studio_id != studio_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this model")
        
    db_model = ModelService.delete_model(db, model_id=model_id)
    return db_model

# Model file endpoints
@router.post("/{model_id}/files", response_model=ModelFile)
async def upload_model_file(
    model_id: int,
    file: UploadFile = File(...),
    file_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if model exists and user has access
    db_model = ModelService.get_model(db, model_id=model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check permissions
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        
        if db_model.studio_id != studio_id:
            raise HTTPException(status_code=403, detail="Not authorized to upload files to this model")
    
    # Read file content
    file_content = await file.read()
    
    # Create model file
    model_file = ModelFileCreate(
        filename=file.filename,
        file_type=file_type,
        model_id=model_id
    )
    
    # Save model file
    return ModelService.upload_model_file(db, model_file, file_content)

@router.get("/{model_id}/files", response_model=List[ModelFile])
def list_model_files(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if model exists and user has access
    db_model = ModelService.get_model(db, model_id=model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check permissions
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        
        if db_model.studio_id != studio_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this model's files")
    
    # Get model files
    return ModelService.get_model_files(db, model_id)

@router.get("/files/{file_id}")
async def download_model_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get model file
    db_file = ModelService.get_model_file(db, file_id)
    if db_file is None:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get model
    db_model = ModelService.get_model(db, model_id=db_file.model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check permissions
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        
        if db_model.studio_id != studio_id:
            raise HTTPException(status_code=403, detail="Not authorized to download this file")
    
    # Check if file exists
    if not os.path.exists(db_file.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Return file
    return FileResponse(
        path=db_file.file_path,
        filename=db_file.filename,
        media_type="application/octet-stream"
    )

@router.delete("/files/{file_id}", response_model=ModelFile)
def delete_model_file_endpoint(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get model file
    db_file = ModelService.get_model_file(db, file_id)
    if db_file is None:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get model
    db_model = ModelService.get_model(db, model_id=db_file.model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check permissions
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        
        if db_model.studio_id != studio_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this file")
    
    # Delete file
    return ModelService.delete_model_file(db, file_id)

# G-code file endpoints
@router.post("/gcode", response_model=GCodeFile)
async def upload_gcode_file(
    file: UploadFile = File(...),
    model_id: Optional[int] = Form(None),
    printer_id: Optional[int] = Form(None),
    estimated_print_time: Optional[float] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # At least one of model_id or printer_id must be provided
    if model_id is None and printer_id is None:
        raise HTTPException(
            status_code=400, 
            detail="At least one of model_id or printer_id must be provided"
        )
    
    # Get studio_id from current user
    studio_id = get_studio_id_from_user(current_user, db)
    
    # If model_id is provided, check if model exists and user has access
    if model_id is not None:
        db_model = ModelService.get_model(db, model_id=model_id)
        if db_model is None:
            raise HTTPException(status_code=404, detail="Model not found")
        
        # Check permissions
        if not current_user.is_superuser and db_model.studio_id != studio_id:
            raise HTTPException(
                status_code=403, 
                detail="Not authorized to upload files to this model"
            )
    
    # Read file content
    file_content = await file.read()
    
    # Create G-code file
    gcode_file = GCodeFileCreate(
        filename=file.filename,
        model_id=model_id,
        printer_id=printer_id,
        studio_id=studio_id,
        estimated_print_time=estimated_print_time
    )
    
    # Save G-code file
    return ModelService.upload_gcode_file(db, gcode_file, file_content)

@router.get("/gcode/{file_id}")
async def download_gcode_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get G-code file
    db_file = ModelService.get_gcode_file(db, file_id)
    if db_file is None:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get studio_id from current user
    studio_id = get_studio_id_from_user(current_user, db)
    
    # Check permissions
    if not current_user.is_superuser and db_file.studio_id != studio_id:
        raise HTTPException(status_code=403, detail="Not authorized to download this file")
    
    # Check if file exists
    if not os.path.exists(db_file.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Return file
    return FileResponse(
        path=db_file.file_path,
        filename=db_file.filename,
        media_type="application/octet-stream"
    )

@router.get("/model/{model_id}/gcode", response_model=List[GCodeFile])
def list_model_gcode_files(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if model exists and user has access
    db_model = ModelService.get_model(db, model_id=model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check permissions
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        
        if db_model.studio_id != studio_id:
            raise HTTPException(
                status_code=403, 
                detail="Not authorized to access this model's G-code files"
            )
    
    # Get G-code files
    return ModelService.get_gcode_files_for_model(db, model_id)

@router.get("/printer/{printer_id}/gcode", response_model=List[GCodeFile])
def list_printer_gcode_files(
    printer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get printer's G-code files
    return ModelService.get_gcode_files_for_printer(db, printer_id)

@router.delete("/gcode/{file_id}", response_model=GCodeFile)
def delete_gcode_file_endpoint(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get G-code file
    db_file = ModelService.get_gcode_file(db, file_id)
    if db_file is None:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get studio_id from current user
    studio_id = get_studio_id_from_user(current_user, db)
    
    # Check permissions
    if not current_user.is_superuser and db_file.studio_id != studio_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this file")
    
    # Delete file
    return ModelService.delete_gcode_file(db, file_id)

# Add new endpoints for model relationships
@router.post("/{model_id}/relations/{related_model_id}")
def add_model_relation(
    model_id: int,
    related_model_id: int,
    relation_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if models exist and user has access
    model = ModelService.get_model(db, model_id=model_id)
    related_model = ModelService.get_model(db, model_id=related_model_id)
    
    if model is None or related_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check permissions
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        
        if model.studio_id != studio_id or related_model.studio_id != studio_id:
            raise HTTPException(status_code=403, detail="Not authorized to update model relations")
    
    return ModelService.add_model_relation(db, model_id, related_model_id, relation_type)

@router.delete("/{model_id}/relations/{related_model_id}")
def remove_model_relation(
    model_id: int,
    related_model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if models exist and user has access
    model = ModelService.get_model(db, model_id=model_id)
    related_model = ModelService.get_model(db, model_id=related_model_id)
    
    if model is None or related_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check permissions
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        
        if model.studio_id != studio_id or related_model.studio_id != studio_id:
            raise HTTPException(status_code=403, detail="Not authorized to update model relations")
    
    return ModelService.remove_model_relation(db, model_id, related_model_id)

@router.get("/{model_id}/relations", response_model=List[ModelSimple])
def get_related_models(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if model exists and user has access
    model = ModelService.get_model(db, model_id=model_id)
    
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check permissions
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        
        if model.studio_id != studio_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this model")
    
    return ModelService.get_related_models(db, model_id)
