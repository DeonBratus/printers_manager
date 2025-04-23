from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, Table, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, backref
from db.database import Base
from datetime import datetime
import uuid
import enum

# Define role enum
class UserRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    MEMBER = "member"
    VIEWER = "viewer"

# Define model file type enum
class ModelFileType(str, enum.Enum):
    STL = "stl"
    OBJ = "obj"
    AMF = "amf"
    THREEMF = "3mf"
    OTHER = "other"

# Define permission enum
class StudioPermission(str, enum.Enum):
    MANAGE_USERS = "manage_users"
    MANAGE_PRINTERS = "manage_printers"
    MANAGE_MODELS = "manage_models"
    MANAGE_PRINTINGS = "manage_printings"
    VIEW_REPORTS = "view_reports"
    EDIT_STUDIO_SETTINGS = "edit_studio_settings"

# Define invitation status enum
class InvitationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"

# Association table for User-Studio many-to-many relationship
user_studio = Table(
    "td_user_studio",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("td_users.id"), primary_key=True),
    Column("studio_id", Integer, ForeignKey("td_studios.id"), primary_key=True),
    Column("role", String, default=UserRole.MEMBER),
    Column("created_at", DateTime, default=datetime.now),
)

# Association table for Role-Permission many-to-many relationship
role_permission = Table(
    "td_role_permission",
    Base.metadata,
    Column("role", String, primary_key=True),
    Column("permission", String, primary_key=True),
    Column("studio_id", Integer, ForeignKey("td_studios.id"), primary_key=True),
)

# Add a new association table for Model-Model relationships
model_relation = Table(
    "td_model_relation",
    Base.metadata,
    Column("model_id", Integer, ForeignKey("td_models.id"), primary_key=True),
    Column("related_model_id", Integer, ForeignKey("td_models.id"), primary_key=True),
    Column("relation_type", String, nullable=True),  # Optional field to describe the relation type
    Column("created_at", DateTime, default=datetime.now),
)

# Base database models only
class Printer(Base):
    __tablename__ = "td_printers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    model = Column(String, nullable=True)  # Printer model e.g. Creality Ender 3 V2
    status = Column(String, default="idle")  # idle, printing, waiting, paused, error
    total_print_time = Column(Float, default=0.0)
    total_downtime = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.now)
    studio_id = Column(Integer, ForeignKey("td_studios.id"), nullable=True)
    
    # Define relationships after all classes
    printings = relationship("Printing", back_populates="printer")
    queue_items = relationship("PrintQueue", back_populates="printer")
    parameters = relationship("PrinterParameter", back_populates="printer", cascade="all, delete-orphan")
    studio = relationship("Studio", back_populates="printers")
    gcode_files = relationship("GCodeFile", back_populates="printer")

class Model(Base):
    __tablename__ = "td_models"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    printing_time = Column(Float)
    studio_id = Column(Integer, ForeignKey("td_studios.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # Define relationships
    printings = relationship("Printing", back_populates="model")
    queue_items = relationship("PrintQueue", back_populates="model")
    studio = relationship("Studio", back_populates="models")
    files = relationship("ModelFile", back_populates="model", cascade="all, delete-orphan")
    gcode_files = relationship("GCodeFile", back_populates="model", cascade="all, delete-orphan")
    
    # Replace parent/child relationship with many-to-many
    related_to = relationship(
        "Model", 
        secondary=model_relation,
        primaryjoin=id==model_relation.c.model_id,
        secondaryjoin=id==model_relation.c.related_model_id,
        backref="related_from"
    )

class ModelFile(Base):
    __tablename__ = "td_model_files"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)  # Size in bytes
    file_type = Column(String, default=ModelFileType.STL)
    created_at = Column(DateTime, default=datetime.now)
    model_id = Column(Integer, ForeignKey("td_models.id"), nullable=False)
    
    # Define relationships
    model = relationship("Model", back_populates="files")

class GCodeFile(Base):
    __tablename__ = "td_gcode_files"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)  # Size in bytes
    created_at = Column(DateTime, default=datetime.now)
    model_id = Column(Integer, ForeignKey("td_models.id"), nullable=True)
    printer_id = Column(Integer, ForeignKey("td_printers.id"), nullable=True)
    studio_id = Column(Integer, ForeignKey("td_studios.id"), nullable=True)
    estimated_print_time = Column(Float, nullable=True)  # In minutes
    
    # Define relationships
    model = relationship("Model", back_populates="gcode_files")
    printer = relationship("Printer", back_populates="gcode_files")
    studio = relationship("Studio", back_populates="gcode_files")

class Printing(Base):
    __tablename__ = "td_printings"
    
    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime, server_default=func.now())
    printing_time = Column(Float)  # Stored in minutes
    calculated_time_stop = Column(DateTime)
    real_time_stop = Column(DateTime, nullable=True)
    downtime = Column(Float, default=0.0)  # Stored in minutes
    status = Column(String, default="printing")  # printing, paused, completed, cancelled, wait-confirm
    pause_time = Column(DateTime, nullable=True)
    stop_reason = Column(String, nullable=True)
    
    printer_id = Column(Integer, ForeignKey("td_printers.id"))
    model_id = Column(Integer, ForeignKey("td_models.id"))
    studio_id = Column(Integer, ForeignKey("td_studios.id"), nullable=True)
    
    printer = relationship("Printer", back_populates="printings")
    model = relationship("Model", back_populates="printings")
    studio = relationship("Studio", back_populates="printings")

    def __init__(self, **kwargs):
        # Ensure printing_time is stored in minutes
        if 'printing_time' in kwargs and kwargs['printing_time'] is not None:
            if kwargs['printing_time'] < 10:  # If value is in hours (unlikely to have printing < 10 min)
                kwargs['printing_time'] = kwargs['printing_time'] * 60
        super().__init__(**kwargs)

class PrintQueue(Base):
    __tablename__ = "print_queue"

    id = Column(Integer, primary_key=True, index=True)
    printer_id = Column(Integer, ForeignKey("td_printers.id"))
    model_id = Column(Integer, ForeignKey("td_models.id"))
    quantity = Column(Integer, default=1)
    priority = Column(Integer, default=0)
    status = Column(String, default="queued")
    created_at = Column(DateTime, default=datetime.now)
    start_time = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    studio_id = Column(Integer, ForeignKey("td_studios.id"), nullable=True)

    printer = relationship("Printer", back_populates="queue_items")
    model = relationship("Model", back_populates="queue_items")
    studio = relationship("Studio", back_populates="queue_items")

class PrinterParameter(Base):
    __tablename__ = "td_printer_parameters"
    
    id = Column(Integer, primary_key=True, index=True)
    printer_id = Column(Integer, ForeignKey("td_printers.id"))
    name = Column(String, nullable=False)
    value = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    
    printer = relationship("Printer", back_populates="parameters")

class User(Base):
    """
    User model for authentication and authorization
    """
    __tablename__ = "td_users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    language = Column(String, default="russian")
    default_view = Column(String, default="grid")
    avatar = Column(String, nullable=True)  # Store avatar file path
    # Remove the direct studio_id FK here since we're using many-to-many
    
    # Define relationships
    studios = relationship("Studio", secondary=user_studio, back_populates="users")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")

class Studio(Base):
    __tablename__ = "td_studios"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # Define relationships
    users = relationship("User", secondary=user_studio, back_populates="studios")
    printers = relationship("Printer", back_populates="studio")
    models = relationship("Model", back_populates="studio")
    printings = relationship("Printing", back_populates="studio")
    queue_items = relationship("PrintQueue", back_populates="studio")
    invitations = relationship("StudioInvitation", back_populates="studio")
    gcode_files = relationship("GCodeFile", back_populates="studio")

class Session(Base):
    __tablename__ = "td_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("td_users.id"))
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    
    # Define relationships
    user = relationship("User", back_populates="sessions")

class StudioInvitation(Base):
    __tablename__ = "td_studio_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    studio_id = Column(Integer, ForeignKey("td_studios.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("td_users.id"), nullable=False)
    role = Column(String, default=UserRole.MEMBER)
    token = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    status = Column(String, default=InvitationStatus.PENDING)
    created_at = Column(DateTime, default=datetime.now)
    expires_at = Column(DateTime, nullable=False)
    
    # Define relationships
    studio = relationship("Studio", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[created_by]) 