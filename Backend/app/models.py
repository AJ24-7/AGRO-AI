"""SQLAlchemy ORM models mirroring the SQL schema."""
from sqlalchemy import (Column, Integer, String, Float, Text,
                        Boolean, DateTime, ForeignKey)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    phone = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Farmer(Base):
    __tablename__ = "farmers"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    name = Column(String(120))
    village = Column(String(120))
    district = Column(String(120))
    state = Column(String(120))
    total_land_area = Column(Float, default=0)


class Farm(Base):
    __tablename__ = "farms"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    farm_name = Column(String(150), nullable=False)
    farm_area = Column(Float)
    location = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    plots = relationship("Plot", backref="farm", cascade="all, delete")


class Plot(Base):
    __tablename__ = "plots"
    id = Column(Integer, primary_key=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"))
    plot_name = Column(String(150), nullable=False)
    plot_area = Column(Float)
    soil_type = Column(String(80))


class SoilReport(Base):
    __tablename__ = "soil_reports"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    nitrogen = Column(Float)
    phosphorus = Column(Float)
    potassium = Column(Float)
    ph = Column(Float)
    raw_text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CropRecommendation(Base):
    __tablename__ = "crop_recommendations"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    nitrogen = Column(Float); phosphorus = Column(Float)
    potassium = Column(Float); ph = Column(Float)
    recommended_crop = Column(String(80))
    confidence = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DiseaseDetection(Base):
    __tablename__ = "disease_detections"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    disease_name = Column(String(120))
    confidence = Column(Float)
    treatment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Tractor(Base):
    __tablename__ = "tractors"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    registration_number = Column(String(50))
    brand = Column(String(80))
    model = Column(String(80))
    purchase_year = Column(Integer)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(150))
    message = Column(Text)
    type = Column(String(50))
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
