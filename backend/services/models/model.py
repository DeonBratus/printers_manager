from sqlalchemy.orm import Session
from dal import model as model_dal
from schemas.models_schemas import ModelCreate

class ModelService():
    def create_model(db: Session, model: ModelCreate):
        return model_dal.create(db, model)

    def get_model(db: Session, model_id: int):
        return model_dal.get(db, model_id)

    def get_models(db: Session, skip: int = 0, limit: int = 100, sort_by: str = None, sort_desc: bool = False, studio_id: int = None):
        return model_dal.get_all(db, skip, limit, sort_by, sort_desc, studio_id)

    def update_model(db: Session, model_id: int, model: ModelCreate):
        return model_dal.update(db, model_id, model.dict())

    def delete_model(db: Session, model_id: int):
        return model_dal.delete(db, model_id)
