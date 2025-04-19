from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from db.database import get_db
from models import User, Studio, user_studio, StudioPermission, UserRole, StudioInvitation, InvitationStatus
import schemas
from auth.auth import get_current_active_user, check_user_permission, get_user_studio_role

# Endpoints for managing studio members and their roles
router = APIRouter(
    prefix="/studios",
    tags=["studios"],
    responses={404: {"description": "Not found"}},
)

# Endpoints for managing studio invitations
@router.post("/{studio_id}/invitations", response_model=schemas.StudioInvitation)
def create_studio_invitation(
    studio_id: int,
    invitation_data: schemas.StudioInvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new invitation to the studio"""
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
            raise HTTPException(status_code=403, detail="Not authorized to invite users to this studio")
    
    # Check if user with this email already exists
    user = db.query(User).filter(User.email == invitation_data.email).first()
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
    existing_invitation = db.query(StudioInvitation).filter(
        StudioInvitation.email == invitation_data.email,
        StudioInvitation.studio_id == studio_id,
        StudioInvitation.status == InvitationStatus.PENDING
    ).first()
    
    if existing_invitation:
        # Return the existing invitation
        existing_invitation.studio_name = db_studio.name
        existing_invitation.inviter_name = current_user.username
        return existing_invitation
    
    # Set expiration date (30 days from now)
    expires_at = datetime.now() + timedelta(days=30)
    
    # Create new invitation
    invitation = StudioInvitation(
        email=invitation_data.email,
        studio_id=studio_id,
        created_by=current_user.id,
        role=invitation_data.role,
        token=str(uuid.uuid4()),
        status=InvitationStatus.PENDING,
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
    current_user: User = Depends(get_current_active_user)
):
    """Get all invitations for a studio"""
    # Check if studio exists
    db_studio = db.query(Studio).filter(Studio.id == studio_id).first()
    if not db_studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    
    # Check if user has access to this studio (either superuser or member with rights)
    if not current_user.is_superuser:
        has_permission = check_user_permission(
            current_user, 
            studio_id, 
            StudioPermission.MANAGE_USERS,
            db
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="Not authorized to view invitations for this studio")
    
    # Query invitations
    query = db.query(StudioInvitation).filter(StudioInvitation.studio_id == studio_id)
    
    # Filter by status if provided
    if status:
        query = query.filter(StudioInvitation.status == status)
    
    invitations = query.all()
    
    # Add additional data for each invitation
    for invitation in invitations:
        invitation.studio_name = db_studio.name
        inviter = db.query(User).filter(User.id == invitation.created_by).first()
        invitation.inviter_name = inviter.username if inviter else None
    
    return invitations

@router.get("/invitations/user", response_model=List[schemas.StudioInvitation])
def get_user_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all pending invitations for the current user"""
    # Query invitations for the user's email
    invitations = db.query(StudioInvitation).filter(
        StudioInvitation.email == current_user.email,
        StudioInvitation.status == InvitationStatus.PENDING,
        StudioInvitation.expires_at > datetime.now()
    ).all()
    
    # Add additional data for each invitation
    for invitation in invitations:
        studio = db.query(Studio).filter(Studio.id == invitation.studio_id).first()
        invitation.studio_name = studio.name if studio else None
        
        inviter = db.query(User).filter(User.id == invitation.created_by).first()
        invitation.inviter_name = inviter.username if inviter else None
    
    return invitations

@router.put("/invitations/{invitation_id}", response_model=schemas.StudioInvitation)
def update_invitation_status(
    invitation_id: int,
    status_data: schemas.StudioInvitationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Accept or reject a studio invitation"""
    # Find the invitation
    invitation = db.query(StudioInvitation).filter(StudioInvitation.id == invitation_id).first()
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
                StudioPermission.MANAGE_USERS,
                db
            )
    
    if not is_invitee and not has_manage_permission:
        raise HTTPException(status_code=403, detail="Not authorized to modify this invitation")
    
    # Check if invitation is expired
    if invitation.expires_at < datetime.now():
        invitation.status = InvitationStatus.EXPIRED
        db.add(invitation)
        db.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")
    
    # Check if invitation is pending
    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Invitation is already {invitation.status}")
    
    # Update invitation status
    invitation.status = status_data.status
    
    # If accepting, add user to studio
    if status_data.status == InvitationStatus.ACCEPTED and is_invitee:
        # Add user to studio with specified role
        db.execute(
            user_studio.insert().values(
                user_id=current_user.id,
                studio_id=invitation.studio_id,
                role=invitation.role
            )
        )
    
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    
    # Add additional fields for response
    studio = db.query(Studio).filter(Studio.id == invitation.studio_id).first()
    invitation.studio_name = studio.name if studio else None
    
    inviter = db.query(User).filter(User.id == invitation.created_by).first()
    invitation.inviter_name = inviter.username if inviter else None
    
    return invitation

@router.delete("/invitations/{invitation_id}")
def delete_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a studio invitation"""
    # Find the invitation
    invitation = db.query(StudioInvitation).filter(StudioInvitation.id == invitation_id).first()
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
                StudioPermission.MANAGE_USERS,
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
    current_user: User = Depends(get_current_active_user)
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
            
            if role in [UserRole.OWNER, UserRole.ADMIN]:
                has_permission = True
                break
        
        if not has_permission:
            raise HTTPException(status_code=403, detail="Not authorized to search users")
    
    # Search for users by email or username, excluding the current user
    users = db.query(User).filter(
        User.id != current_user.id,
        or_(
            User.email.ilike(f"%{query}%"),
            User.username.ilike(f"%{query}%")
        )
    ).limit(10).all()
    
    return users