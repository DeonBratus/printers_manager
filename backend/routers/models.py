from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas import ModelCreate, Model
from crud import create_model, get_model, get_models, update_model, delete_model
from auth import get_current_active_user, get_studio_id_from_user
from models import User

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
    return create_model(db, model)

@router.get("/", response_model=List[Model])
def read_models(
    skip: int = 0, 
    limit: int = 100, 
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get models filtered by studio_id unless user is superuser
    if current_user.is_superuser:
        models = get_models(db, skip=skip, limit=limit, sort_by=sort_by, sort_desc=sort_desc)
    else:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        
        # Filter models by studio_id
        models = get_models(
            db, 
            skip=skip, 
            limit=limit, 
            sort_by=sort_by, 
            sort_desc=sort_desc,
            studio_id=studio_id
        )
    return models

@router.get("/{model_id}", response_model=Model)
def read_model(
    model_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_model = get_model(db, model_id=model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check if user has access to this model
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        
        if db_model.studio_id != studio_id:
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
    db_model = get_model(db, model_id=model_id)
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
        
    db_model = update_model(db, model_id=model_id, model=model)
    return db_model

@router.delete("/{model_id}", response_model=Model)
def delete_existing_model(
    model_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if model exists and user has access
    db_model = get_model(db, model_id=model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Check permissions
    if not current_user.is_superuser:
        # Get the current studio ID from the user's studios
        studio_id = get_studio_id_from_user(current_user, db)
        
        if db_model.studio_id != studio_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this model")
        
    db_model = delete_model(db, model_id=model_id)
    return db_model
