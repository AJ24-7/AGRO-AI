"""Pydantic request/response schemas."""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ---------- Auth ----------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: Optional[str]
    class Config: from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Farmer ----------
class FarmerSchema(BaseModel):
    name: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    total_land_area: Optional[float] = 0
    class Config: from_attributes = True


# ---------- Farm ----------
class FarmCreate(BaseModel):
    farm_name: str
    farm_area: Optional[float] = None
    location: Optional[str] = None


class FarmOut(FarmCreate):
    id: int
    class Config: from_attributes = True


# ---------- Plot ----------
class PlotCreate(BaseModel):
    farm_id: int
    plot_name: str
    plot_area: Optional[float] = None
    soil_type: Optional[str] = None


class PlotOut(PlotCreate):
    id: int
    class Config: from_attributes = True


# ---------- Crop ----------
class CropInput(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    ph: float


class CropOut(BaseModel):
    recommended_crop: str
    confidence: float


# ---------- Tractor ----------
class TractorCreate(BaseModel):
    registration_number: str
    brand: str
    model: str
    purchase_year: int


class TractorOut(TractorCreate):
    id: int
    class Config: from_attributes = True


# ---------- Notification ----------
class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime
    class Config: from_attributes = True


# ---------- Chatbot ----------
class ChatInput(BaseModel):
    message: str
