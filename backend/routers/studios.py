from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from database import get_db
import models
import schemas
from auth import get_current_active_user, check_user_permission, get_user_studio_role

router = APIRouter(
    prefix="/studios",
    tags=["studios"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.Studio])
def get_studios(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all studios that the current user has access to"""
    # Superusers can see all studios
    if current_user.is_superuser:
        studios = db.query(models.Studio).all()
    else:
        # Regular users see the studios they are members of
        # We use a direct query on the association table
        studios = db.query(models.Studio).join(
            models.user_studio, 
            models.Studio.id == models.user_studio.c.studio_id
        ).filter(
            models.user_studio.c.user_id == current_user.id
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

@router.get("/{studio_id}", response_model=schemas.Studio)
def get_studio(
    studio_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get a specific studio by ID"""
    db_studio = db.query(models.Studio).filter(models.Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Check if user has access to this studio (either superuser or member)
    if not current_user.is_superuser:
        role = get_user_studio_role(current_user, studio_id, db)
        if not role:
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

@router.post("/", response_model=schemas.Studio)
def create_studio(
    studio_data: schemas.StudioCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new studio with the current user as owner"""
    # Only superusers and users with active accounts can create studios
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Account not active")
    
    # Create new studio
    db_studio = models.Studio(**studio_data.dict(exclude={"initial_users"}))
    db.add(db_studio)
    db.flush()  # Get the studio ID without committing
    
    # Add the current user as owner of the studio
    db.execute(
        models.user_studio.insert().values(
            user_id=current_user.id,
            studio_id=db_studio.id,
            role=models.UserRole.OWNER
        )
    )
    
    # Add initial users if provided
    if studio_data.initial_users:
        for user_data in studio_data.initial_users:
            user_id = user_data.get("user_id")
            role = user_data.get("role", models.UserRole.MEMBER)
            
            # Skip if user_id is not provided or is the current user (already added)
            if not user_id or user_id == current_user.id:
                continue
            
            # Verify the user exists
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if not user:
                continue  # Skip this user if not found
                
            # Add user to studio with specified role
            db.execute(
                models.user_studio.insert().values(
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

@router.put("/{studio_id}", response_model=schemas.Studio)
def update_studio(
    studio_id: int,
    studio_data: schemas.StudioUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Update a studio's information"""
    # Check if studio exists
    db_studio = db.query(models.Studio).filter(models.Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Check permissions - only superusers, owners, or admins can update a studio
    if not current_user.is_superuser:
        has_permission = check_user_permission(
            current_user, 
            studio_id, 
            models.StudioPermission.EDIT_STUDIO_SETTINGS,
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

@router.delete("/{studio_id}", response_model=schemas.Studio)
def delete_studio(
    studio_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Delete a studio if it has no associated resources"""
    # Check if studio exists
    db_studio = db.query(models.Studio).filter(models.Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Only superusers or owners can delete a studio
    if not current_user.is_superuser:
        role = get_user_studio_role(current_user, studio_id, db)
        if role != models.UserRole.OWNER:
            raise HTTPException(status_code=403, detail="Not authorized to delete this studio")
    
    # Check if any printers, or models are using this studio
    printers_count = db.query(models.Printer).filter(models.Printer.studio_id == studio_id).count()
    models_count = db.query(models.Model).filter(models.Model.studio_id == studio_id).count()
    
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
    
    # Get all user-studio associations for deletion reference
    users_in_studio = db.execute(
        text("""
        SELECT user_id FROM td_user_studio
        WHERE studio_id = :studio_id
        """),
        {"studio_id": studio_id}
    ).fetchall()
    
    # Delete all user-studio associations
    db.execute(
        models.user_studio.delete().where(
            models.user_studio.c.studio_id == studio_id
        )
    )
    
    # Delete all role-permission customizations for this studio
    db.execute(
        models.role_permission.delete().where(
            models.role_permission.c.studio_id == studio_id
        )
    )
    
    # Delete the studio
    db.delete(db_studio)
    db.commit()
    
    return studio_dict

# Endpoints for managing studio members and their roles

@router.get("/{studio_id}/members", response_model=List[schemas.StudioUserInfo])
def get_studio_members(
    studio_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all members of a studio"""
    # Check if studio exists
    db_studio = db.query(models.Studio).filter(models.Studio.id == studio_id).first()
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
    current_user: models.User = Depends(get_current_active_user)
):
    """Add a new member to the studio"""
    # Check if studio exists
    db_studio = db.query(models.Studio).filter(models.Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Check permissions - only superusers, owners, or admins can add members
    if not current_user.is_superuser:
        has_permission = check_user_permission(
            current_user, 
            studio_id, 
            models.StudioPermission.MANAGE_USERS,
            db
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="Not authorized to add members to this studio")
    
    # Check if user exists
    user = db.query(models.User).filter(models.User.id == member_data.user_id).first()
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
        models.user_studio.insert().values(
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
    current_user: models.User = Depends(get_current_active_user)
):
    """Update a member's role in the studio"""
    # Check if studio exists
    db_studio = db.query(models.Studio).filter(models.Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Check permissions - only superusers, owners, or admins can update roles
    if not current_user.is_superuser:
        has_permission = check_user_permission(
            current_user, 
            studio_id, 
            models.StudioPermission.MANAGE_USERS,
            db
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="Not authorized to update member roles in this studio")
    
    # Check if user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
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
    if membership[0] == models.UserRole.OWNER:
        # Check if we're trying to change the owner's role
        if role_data.role != models.UserRole.OWNER:
            raise HTTPException(
                status_code=400, 
                detail="Cannot change the role of the studio owner - transfer ownership first"
            )
    
    # Update user's role
    db.execute(
        models.user_studio.update().where(
            models.user_studio.c.user_id == user_id,
            models.user_studio.c.studio_id == studio_id
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
    current_user: models.User = Depends(get_current_active_user)
):
    """Remove a member from the studio"""
    # Check if studio exists
    db_studio = db.query(models.Studio).filter(models.Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Check permissions - only superusers, owners, or admins can remove members
    if not current_user.is_superuser:
        has_permission = check_user_permission(
            current_user, 
            studio_id, 
            models.StudioPermission.MANAGE_USERS,
            db
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="Not authorized to remove members from this studio")
    
    # Check if user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
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
    if membership[0] == models.UserRole.OWNER:
        raise HTTPException(
            status_code=400, 
            detail="Cannot remove the studio owner - transfer ownership first"
        )
    
    # Remove user from studio
    db.execute(
        models.user_studio.delete().where(
            models.user_studio.c.user_id == user_id,
            models.user_studio.c.studio_id == studio_id
        )
    )
    
    db.commit()
    
    return {"message": "Member removed from studio"}

# Endpoints for managing studio invitations
@router.post("/{studio_id}/invitations", response_model=schemas.StudioInvitation)
def create_studio_invitation(
    studio_id: int,
    invitation_data: schemas.StudioInvitationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Create a new invitation to the studio"""
    # Check if studio exists
    db_studio = db.query(models.Studio).filter(models.Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Check permissions - only superusers, owners, or admins can add members
    if not current_user.is_superuser:
        has_permission = check_user_permission(
            current_user, 
            studio_id, 
            models.StudioPermission.MANAGE_USERS,
            db
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="Not authorized to invite users to this studio")
    
    # Check if user with this email already exists
    user = db.query(models.User).filter(models.User.email == invitation_data.email).first()
    if user:
        # Check if user is already a member
        membership = db.execute(
            text("""
            SELECT 1 FROM td_user_studio
            WHERE user_id = :user_id AND studio_id = :studio_id
            """),
            {"user_id": user.id, "studio_id": studio_id}
        ).fetchone()
        
        if membership:
            raise HTTPException(status_code=400, detail="User is already a member of this studio")
    
    # Check if an invitation already exists and is pending
    existing_invitation = db.query(models.StudioInvitation).filter(
        models.StudioInvitation.email == invitation_data.email,
        models.StudioInvitation.studio_id == studio_id,
        models.StudioInvitation.status == models.InvitationStatus.PENDING
    ).first()
    
    if existing_invitation:
        # Return the existing invitation
        existing_invitation.studio_name = db_studio.name
        existing_invitation.inviter_name = current_user.username
        return existing_invitation
    
    # Set expiration date (30 days from now)
    expires_at = datetime.now() + timedelta(days=30)
    
    # Create new invitation
    invitation = models.StudioInvitation(
        email=invitation_data.email,
        studio_id=studio_id,
        created_by=current_user.id,
        role=invitation_data.role,
        token=str(uuid.uuid4()),
        status=models.InvitationStatus.PENDING,
        expires_at=expires_at
    )
    
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    
    # Add additional fields for response
    invitation.studio_name = db_studio.name
    invitation.inviter_name = current_user.username
    
    # TODO: Send email notification to the invited user
    
    return invitation

@router.get("/{studio_id}/invitations", response_model=List[schemas.StudioInvitation])
def get_studio_invitations(
    studio_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all invitations for a studio"""
    # Check if studio exists
    db_studio = db.query(models.Studio).filter(models.Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Check if user has access to this studio (either superuser or member with rights)
    if not current_user.is_superuser:
        has_permission = check_user_permission(
            current_user, 
            studio_id, 
            models.StudioPermission.MANAGE_USERS,
            db
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="Not authorized to view invitations for this studio")
    
    # Query invitations
    query = db.query(models.StudioInvitation).filter(models.StudioInvitation.studio_id == studio_id)
    
    # Filter by status if provided
    if status:
        query = query.filter(models.StudioInvitation.status == status)
    
    invitations = query.all()
    
    # Add additional data for each invitation
    for invitation in invitations:
        invitation.studio_name = db_studio.name
        inviter = db.query(models.User).filter(models.User.id == invitation.created_by).first()
        invitation.inviter_name = inviter.username if inviter else None
    
    return invitations

@router.get("/invitations/user", response_model=List[schemas.StudioInvitation])
def get_user_invitations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Get all pending invitations for the current user"""
    # Query invitations for the user's email
    invitations = db.query(models.StudioInvitation).filter(
        models.StudioInvitation.email == current_user.email,
        models.StudioInvitation.status == models.InvitationStatus.PENDING,
        models.StudioInvitation.expires_at > datetime.now()
    ).all()
    
    # Add additional data for each invitation
    for invitation in invitations:
        studio = db.query(models.Studio).filter(models.Studio.id == invitation.studio_id).first()
        invitation.studio_name = studio.name if studio else None
        
        inviter = db.query(models.User).filter(models.User.id == invitation.created_by).first()
        invitation.inviter_name = inviter.username if inviter else None
    
    return invitations

@router.put("/invitations/{invitation_id}", response_model=schemas.StudioInvitation)
def update_invitation_status(
    invitation_id: int,
    status_data: schemas.StudioInvitationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Accept or reject a studio invitation"""
    # Find the invitation
    invitation = db.query(models.StudioInvitation).filter(models.StudioInvitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    # Check if user is authorized (either the invitee or has manage_users permission)
    is_invitee = invitation.email == current_user.email
    has_manage_permission = False
    
    if not is_invitee:
        # Check if user can manage studio users
        if current_user.is_superuser:
            has_manage_permission = True
        else:
            has_manage_permission = check_user_permission(
                current_user, 
                invitation.studio_id, 
                models.StudioPermission.MANAGE_USERS,
                db
            )
    
    if not is_invitee and not has_manage_permission:
        raise HTTPException(status_code=403, detail="Not authorized to modify this invitation")
    
    # Check if invitation is expired
    if invitation.expires_at < datetime.now():
        invitation.status = models.InvitationStatus.EXPIRED
        db.add(invitation)
        db.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")
    
    # Check if invitation is pending
    if invitation.status != models.InvitationStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Invitation is already {invitation.status}")
    
    # Update invitation status
    invitation.status = status_data.status
    
    # If accepting, add user to studio
    if status_data.status == models.InvitationStatus.ACCEPTED and is_invitee:
        # Add user to studio with specified role
        db.execute(
            models.user_studio.insert().values(
                user_id=current_user.id,
                studio_id=invitation.studio_id,
                role=invitation.role
            )
        )
    
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    
    # Add additional fields for response
    studio = db.query(models.Studio).filter(models.Studio.id == invitation.studio_id).first()
    invitation.studio_name = studio.name if studio else None
    
    inviter = db.query(models.User).filter(models.User.id == invitation.created_by).first()
    invitation.inviter_name = inviter.username if inviter else None
    
    return invitation

@router.delete("/invitations/{invitation_id}")
def delete_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Delete a studio invitation"""
    # Find the invitation
    invitation = db.query(models.StudioInvitation).filter(models.StudioInvitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    # Check if user is authorized (either the inviter or has manage_users permission)
    is_inviter = invitation.created_by == current_user.id
    has_manage_permission = False
    
    if not is_inviter:
        # Check if user can manage studio users
        if current_user.is_superuser:
            has_manage_permission = True
        else:
            has_manage_permission = check_user_permission(
                current_user, 
                invitation.studio_id, 
                models.StudioPermission.MANAGE_USERS,
                db
            )
    
    if not is_inviter and not has_manage_permission:
        raise HTTPException(status_code=403, detail="Not authorized to delete this invitation")
    
    # Delete invitation
    db.delete(invitation)
    db.commit()
    
    return {"message": "Invitation deleted successfully"}

@router.get("/users/search", response_model=List[schemas.UserSearchResult])
def search_users(
    query: str = Query(..., min_length=3),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """Search for users by email or username"""
    # Only allow search for users with manage permission in at least one studio
    if not current_user.is_superuser:
        # Check if user has manage_users permission in any studio
        has_permission = False
        user_studios = db.execute(
            text("""
            SELECT studio_id, role FROM td_user_studio 
            WHERE user_id = :user_id
            """),
            {"user_id": current_user.id}
        ).fetchall()
        
        for studio_data in user_studios:
            studio_id = studio_data[0]
            role = studio_data[1]
            
            if role in [models.UserRole.OWNER, models.UserRole.ADMIN]:
                has_permission = True
                break
        
        if not has_permission:
            raise HTTPException(status_code=403, detail="Not authorized to search users")
    
    # Search for users by email or username, excluding the current user
    users = db.query(models.User).filter(
        models.User.id != current_user.id,
        or_(
            models.User.email.ilike(f"%{query}%"),
            models.User.username.ilike(f"%{query}%")
        )
    ).limit(10).all()
    
    return users