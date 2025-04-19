from models.models import Model, Printer, PrinterParameter
from models.models import Studio, User, StudioPermission, Printing
from models.models import *

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float, Table, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from .database import Base

class Model(Base):
    __tablename__ = "td_models"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    printing_time = Column(Float, nullable=False)  # in minutes
    studio_id = Column(Integer, ForeignKey("td_studios.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Fix the relationship by specifying the foreign key
    printings = relationship("Printing", back_populates="model")
    studio = relationship("Studio", back_populates="models")

class Printing(Base):
    __tablename__ = "td_printings"
    
    id = Column(Integer, primary_key=True, index=True)
    printer_id = Column(Integer, ForeignKey("td_printers.id"), nullable=False)
    model_id = Column(Integer, ForeignKey("td_models.id"), nullable=False)  # Make sure this exists
    status = Column(String, nullable=False, default="waiting")
    progress = Column(Float, default=0)
    start_time = Column(DateTime(timezone=True))
    pause_time = Column(DateTime(timezone=True))
    real_time_stop = Column(DateTime(timezone=True))
    calculated_time_stop = Column(DateTime(timezone=True))
    printing_time = Column(Float)  # Actual printing time in minutes
    studio_id = Column(Integer, ForeignKey("td_studios.id"), nullable=False)

    # Fix the relationships by specifying back_populates
    printer = relationship("Printer", back_populates="printings")
    model = relationship("Model", back_populates="printings")
    studio = relationship("Studio", back_populates="printings")