from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas import ModelCreate, Model
from crud import create_model, get_model, get_models, update_model, delete_model

router = APIRouter(
    prefix="/models",
    tags=["models"]
)

@router.post("/", response_model=Model)
def create_new_model(model: ModelCreate, db: Session = Depends(get_db)):
    return create_model(db, model)

@router.get("/", response_model=List[Model])
def read_models(
    skip: int = 0, 
    limit: int = 100, 
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    db: Session = Depends(get_db)
):
    models = get_models(db, skip=skip, limit=limit, sort_by=sort_by, sort_desc=sort_desc)
    return models

@router.get("/{model_id}", response_model=Model)
def read_model(model_id: int, db: Session = Depends(get_db)):
    db_model = get_model(db, model_id=model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return db_model

@router.put("/{model_id}", response_model=Model)
def update_existing_model(model_id: int, model: ModelCreate, db: Session = Depends(get_db)):
    db_model = update_model(db, model_id=model_id, model=model)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return db_model

@router.delete("/{model_id}", response_model=Model)
def delete_existing_model(model_id: int, db: Session = Depends(get_db)):
    db_model = delete_model(db, model_id=model_id)
    if db_model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return db_model
