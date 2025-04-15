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
    model = Column(String, nullable=True)  # Printer model e.g. Creality Ender 3 V2
    status = Column(String, default="idle")  # idle, printing, waiting, paused, error
    total_print_time = Column(Float, default=0.0)
    total_downtime = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.now)
    
    # Define relationships after all classes
    printings = relationship("Printing", back_populates="printer")
    queue_items = relationship("PrintQueue", back_populates="printer")
    parameters = relationship("PrinterParameter", back_populates="printer", cascade="all, delete-orphan")

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
    printing_time = Column(Float)  # Stored in minutes
    calculated_time_stop = Column(DateTime)
    real_time_stop = Column(DateTime, nullable=True)
    downtime = Column(Float, default=0.0)  # Stored in minutes
    status = Column(String, default="printing")  # printing, paused, completed, cancelled, pending_completion
    pause_time = Column(DateTime, nullable=True)
    stop_reason = Column(String, nullable=True)
    
    printer_id = Column(Integer, ForeignKey("td_printers.id"))
    model_id = Column(Integer, ForeignKey("td_models.id"))
    
    printer = relationship("Printer", back_populates="printings")
    model = relationship("Model", back_populates="printings")

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

    printer = relationship("Printer", back_populates="queue_items")
    model = relationship("Model", back_populates="queue_items")

# Add this new model at the end of the file
class PrinterParameter(Base):
    __tablename__ = "td_printer_parameters"
    
    id = Column(Integer, primary_key=True, index=True)
    printer_id = Column(Integer, ForeignKey("td_printers.id"))
    name = Column(String, nullable=False)
    value = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    
    printer = relationship("Printer", back_populates="parameters")