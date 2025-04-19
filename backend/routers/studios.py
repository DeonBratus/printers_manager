from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from db.database import get_db
from models import User, Studio, user_studio, StudioPermission, UserRole, Model, Printer, role_permission
import schemas
from auth.auth import get_current_active_user, check_user_permission, get_user_studio_role

router = APIRouter(
    prefix="/studios",
    tags=["studios"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.StudioSchema])
def get_studios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all studios that the current user has access to"""
    # Superusers can see all studios
    if current_user.is_superuser:
        studios = db.query(Studio).all()
    else:
        # Regular users see the studios they are members of
        # We use a direct query on the association table
        studios = db.query(Studio).join(
            user_studio, 
            Studio.id == user_studio.c.studio_id
        ).filter(
            user_studio.c.user_id == current_user.id
        ).all()
    
    # Manually build the response with users and their roles
    result = []
    for studio in studios:
        # Get users with their roles in this studio
        users = db.execute(
            text("""
            SELECT u.id, u.username, u.email, us.role
            FROM td_users u
            JOIN td_user_studio us ON u.id = us.user_id
            WHERE us.studio_id = :studio_id
            """),
            {"studio_id": studio.id}
        ).fetchall()
        
        # Format user data
        user_data = []
        for user in users:
            user_data.append({
                "id": user[0],
                "username": user[1],
                "email": user[2],
                "role": user[3]
            })
        
        # Create studio dict with users
        studio_dict = {
            "id": studio.id,
            "name": studio.name,
            "description": studio.description,
            "created_at": studio.created_at,
            "users": user_data
        }
        
        result.append(studio_dict)
    
    return result

@router.get("/{studio_id}", response_model=schemas.StudioSchema)
def get_studio(
    studio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific studio by ID"""
    db_studio = db.query(Studio).filter(Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Проверяем базовое право на просмотр студии
    if not current_user.is_superuser:
        has_permission = check_user_permission(
            current_user, 
            studio_id, 
            StudioPermission.VIEW_STUDIO,
            db
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="Not authorized to access this studio")

    # Get users with their roles in this studio
    users = db.execute(
        text("""
        SELECT u.id, u.username, u.email, us.role
        FROM td_users u
        JOIN td_user_studio us ON u.id = us.user_id
        WHERE us.studio_id = :studio_id
        """),
        {"studio_id": studio_id}
    ).fetchall()
    
    # Format user data
    user_data = []
    for user in users:
        user_data.append({
            "id": user[0],
            "username": user[1],
            "email": user[2],
            "role": user[3]
        })
    
    # Create studio dict with users
    studio_dict = {
        "id": db_studio.id,
        "name": db_studio.name,
        "description": db_studio.description,
        "created_at": db_studio.created_at,
        "users": user_data
    }
    
    return studio_dict

@router.post("/", response_model=schemas.StudioSchema)
def create_studio(
    studio_data: schemas.StudioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new studio with the current user as owner"""
    # Only superusers and users with active accounts can create studios
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Account not active")
    
    # Create new studio
    db_studio = Studio(**studio_data.dict(exclude={"initial_users"}))
    db.add(db_studio)
    db.flush()  # Get the studio ID without committing
    
    # Add the current user as owner of the studio
    db.execute(
        user_studio.insert().values(
            user_id=current_user.id,
            studio_id=db_studio.id,
            role=UserRole.OWNER
        )
    )
    
    # Add initial users if provided
    if studio_data.initial_users:
        for user_data in studio_data.initial_users:
            user_id = user_data.get("user_id")
            role = user_data.get("role", UserRole.MEMBER)
            
            # Skip if user_id is not provided or is the current user (already added)
            if not user_id or user_id == current_user.id:
                continue
            
            # Verify the user exists
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                continue  # Skip this user if not found
                
            # Add user to studio with specified role
            db.execute(
                user_studio.insert().values(
                    user_id=user_id,
                    studio_id=db_studio.id,
                    role=role
                )
            )
    
    db.commit()
    db.refresh(db_studio)
    
    # Get users with their roles in this studio
    users = db.execute(
        text("""
        SELECT u.id, u.username, u.email, us.role
        FROM td_users u
        JOIN td_user_studio us ON u.id = us.user_id
        WHERE us.studio_id = :studio_id
        """),
        {"studio_id": db_studio.id}
    ).fetchall()
    
    # Format user data
    user_data = []
    for user in users:
        user_data.append({
            "id": user[0],
            "username": user[1],
            "email": user[2],
            "role": user[3]
        })
    
    # Create studio dict with users
    studio_dict = {
        "id": db_studio.id,
        "name": db_studio.name,
        "description": db_studio.description,
        "created_at": db_studio.created_at,
        "users": user_data
    }
    
    return studio_dict

@router.put("/{studio_id}", response_model=schemas.StudioSchema)
def update_studio(
    studio_id: int,
    studio_data: schemas.StudioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a studio's information"""
    # Check if studio exists
    db_studio = db.query(Studio).filter(Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Check permissions - only superusers, owners, or admins can update a studio
    if not current_user.is_superuser:
        has_permission = check_user_permission(
            current_user, 
            studio_id, 
            StudioPermission.EDIT_STUDIO_SETTINGS,
            db
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="Not authorized to update this studio")
    
    # Update fields
    update_data = studio_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_studio, key, value)
    
    db.commit()
    db.refresh(db_studio)
    
    # Get users with their roles in this studio
    users = db.execute(
        text("""
        SELECT u.id, u.username, u.email, us.role
        FROM td_users u
        JOIN td_user_studio us ON u.id = us.user_id
        WHERE us.studio_id = :studio_id
        """),
        {"studio_id": studio_id}
    ).fetchall()
    
    # Format user data
    user_data = []
    for user in users:
        user_data.append({
            "id": user[0],
            "username": user[1],
            "email": user[2],
            "role": user[3]
        })
    
    # Create studio dict with users
    studio_dict = {
        "id": db_studio.id,
        "name": db_studio.name,
        "description": db_studio.description,
        "created_at": db_studio.created_at,
        "users": user_data
    }
    
    return studio_dict

@router.delete("/{studio_id}", response_model=schemas.StudioSchema)
def delete_studio(
    studio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a studio if it has no associated resources"""
    # Check if studio exists
    db_studio = db.query(Studio).filter(Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Only superusers or owners can delete a studio
    if not current_user.is_superuser:
        role = get_user_studio_role(current_user, studio_id, db)
        if role != UserRole.OWNER:
            raise HTTPException(status_code=403, detail="Not authorized to delete this studio")
    
    # Check if any printers, or models are using this studio
    printers_count = db.query(Printer).filter(Printer.studio_id == studio_id).count()
    models_count = db.query(Model).filter(Model.studio_id == studio_id).count()
    
    if printers_count > 0 or models_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete studio with associated printers ({printers_count}) or models ({models_count})"
        )
    
    # Get all users associated with this studio for our return value
    users = db.execute(
        text("""
        SELECT u.id, u.username, u.email, us.role
        FROM td_users u
        JOIN td_user_studio us ON u.id = us.user_id
        WHERE us.studio_id = :studio_id
        """),
        {"studio_id": studio_id}
    ).fetchall()
    
    # Format user data for response
    user_data = []
    for user in users:
        user_data.append({
            "id": user[0],
            "username": user[1],
            "email": user[2],
            "role": user[3]
        })
    
    # Create studio dict with users
    studio_dict = {
        "id": db_studio.id,
        "name": db_studio.name,
        "description": db_studio.description,
        "created_at": db_studio.created_at,
        "users": user_data
    }
    
    # Delete all user-studio associations
    db.execute(
        user_studio.delete().where(
            user_studio.c.studio_id == studio_id
        )
    )
    
    # Delete all role-permission customizations for this studio
    db.execute(
        role_permission.delete().where(
            role_permission.c.studio_id == studio_id
        )
    )
    
    # Delete the studio
    db.delete(db_studio)
    db.commit()
    
    return studio_dict