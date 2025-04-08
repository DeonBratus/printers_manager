from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

# Base database models only
class Printer(Base):
    __tablename__ = "td_printers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    status = Column(String, default="idle")
    total_print_time = Column(Float, default=0.0)
    total_downtime = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.now)
    
    # Define relationships after all classes
    printings = relationship("Printing", back_populates="printer")
    queue_items = relationship("PrintQueue", back_populates="printer")

class Model(Base):
    __tablename__ = "td_models"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    printing_time = Column(Float)
    
    # Define relationships
    printings = relationship("Printing", back_populates="model")
    queue_items = relationship("PrintQueue", back_populates="model")

class Printing(Base):
    __tablename__ = "td_printings"
    
    id = Column(Integer, primary_key=True, index=True)
    start_time = Column(DateTime, server_default=func.now())
    printing_time = Column(Float)
    calculated_time_stop = Column(DateTime)
    real_time_stop = Column(DateTime, nullable=True)
    downtime = Column(Float, default=0.0)
    status = Column(String, default="printing")
    pause_time = Column(DateTime, nullable=True)
    
    printer_id = Column(Integer, ForeignKey("td_printers.id"))
    model_id = Column(Integer, ForeignKey("td_models.id"))
    
    printer = relationship("Printer", back_populates="printings")
    model = relationship("Model", back_populates="printings")

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

    printer = relationship("Printer", back_populates="queue_items")
    model = relationship("Model", back_populates="queue_items")