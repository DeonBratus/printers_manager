from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from db.database import get_db
from models import User, Studio, user_studio, StudioPermission, UserRole, Model, Printer, role_permission
import schemas
from auth.auth import get_current_active_user, check_user_permission, get_user_studio_role


# Endpoints for managing studio members and their roles
router = APIRouter(
    prefix="/studios",
    tags=["studios"],
    responses={404: {"description": "Not found"}},
)

@router.get("/{studio_id}/members", response_model=List[schemas.StudioUserInfo])
def get_studio_members(
    studio_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all members of a studio"""
    # Check if studio exists
    db_studio = db.query(Studio).filter(Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Check if user has access to this studio (either superuser or member)
    if not current_user.is_superuser:
        role = get_user_studio_role(current_user, studio_id, db)
        if not role:
            raise HTTPException(status_code=403, detail="Not authorized to access this studio")
    
    # Get all users in this studio with their roles
    users = db.execute(
        text("""
        SELECT u.id, u.username, u.email, us.role
        FROM td_users u
        JOIN td_user_studio us ON u.id = us.user_id
        WHERE us.studio_id = :studio_id
        """),
        {"studio_id": studio_id}
    ).fetchall()
    
    result = []
    for user in users:
        result.append({
            "id": user[0],
            "username": user[1],
            "email": user[2],
            "role": user[3]
        })
    
    return result

@router.post("/{studio_id}/members", response_model=schemas.UserStudio)
def add_studio_member(
    studio_id: int,
    member_data: schemas.UserStudioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a new member to the studio"""
    # Check if studio exists
    db_studio = db.query(Studio).filter(Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Check permissions - only superusers, owners, or admins can add members
    if not current_user.is_superuser:
        has_permission = check_user_permission(
            current_user, 
            studio_id, 
            StudioPermission.MANAGE_USERS,
            db
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="Not authorized to add members to this studio")
    
    # Check if user exists
    user = db.query(User).filter(User.id == member_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is already a member
    existing = db.execute(
        text("""
        SELECT 1 FROM td_user_studio
        WHERE user_id = :user_id AND studio_id = :studio_id
        """),
        {"user_id": member_data.user_id, "studio_id": studio_id}
    ).fetchone()
    
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this studio")
    
    # Add user to studio
    db.execute(
        user_studio.insert().values(
            user_id=member_data.user_id,
            studio_id=studio_id,
            role=member_data.role
        )
    )
    
    db.commit()
    
    # Return the created association
    return {
        "user_id": member_data.user_id,
        "studio_id": studio_id,
        "role": member_data.role,
        "created_at": datetime.now()
    }

@router.put("/{studio_id}/members/{user_id}", response_model=schemas.UserStudio)
def update_member_role(
    studio_id: int,
    user_id: int,
    role_data: schemas.UserStudioBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a member's role in the studio"""
    # Check if studio exists
    db_studio = db.query(Studio).filter(Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Check permissions - only superusers, owners, or admins can update roles
    if not current_user.is_superuser:
        has_permission = check_user_permission(
            current_user, 
            studio_id, 
            StudioPermission.MANAGE_USERS,
            db
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="Not authorized to update member roles in this studio")
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is a member
    membership = db.execute(
        text("""
        SELECT role, created_at FROM td_user_studio
        WHERE user_id = :user_id AND studio_id = :studio_id
        """),
        {"user_id": user_id, "studio_id": studio_id}
    ).fetchone()
    
    if not membership:
        raise HTTPException(status_code=404, detail="User is not a member of this studio")
    
    # Can't change the role of the owner (only one owner per studio)
    if membership[0] == UserRole.OWNER:
        # Check if we're trying to change the owner's role
        if role_data.role != UserRole.OWNER:
            raise HTTPException(
                status_code=400, 
                detail="Cannot change the role of the studio owner - transfer ownership first"
            )
    
    # Update user's role
    db.execute(
        user_studio.update().where(
            user_studio.c.user_id == user_id,
            user_studio.c.studio_id == studio_id
        ).values(
            role=role_data.role
        )
    )
    
    db.commit()
    
    # Return the updated association
    return {
        "user_id": user_id,
        "studio_id": studio_id,
        "role": role_data.role,
        "created_at": membership[1]
    }

@router.delete("/{studio_id}/members/{user_id}")
def remove_studio_member(
    studio_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """ Remove a member from the studio"""
    # Check if studio exists
    db_studio = db.query(Studio).filter(Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Check permissions - only superusers, owners, or admins can remove members
    if not current_user.is_superuser:
        has_permission = check_user_permission(
            current_user, 
            studio_id, 
            StudioPermission.MANAGE_USERS,
            db
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="Not authorized to remove members from this studio")
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is a member
    membership = db.execute(
        text("""
        SELECT role FROM td_user_studio
        WHERE user_id = :user_id AND studio_id = :studio_id
        """),
        {"user_id": user_id, "studio_id": studio_id}
    ).fetchone()
    
    if not membership:
        raise HTTPException(status_code=404, detail="User is not a member of this studio")
    
    # Can't remove the owner
    if membership[0] == UserRole.OWNER:
        raise HTTPException(
            status_code=400, 
            detail="Cannot remove the studio owner - transfer ownership first"
        )
    
    # Remove user from studio
    db.execute(
        user_studio.delete().where(
            user_studio.c.user_id == user_id,
            user_studio.c.studio_id == studio_id
        )
    )
    
    db.commit()
    
    return {"message": "Member removed from studio"}
