"""Pydantic request/response schemas."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any, Dict
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
class FarmLocationPoint(BaseModel):
    lat: float
    lng: float


class FarmCropSuggestion(BaseModel):
    crop: str
    reason: str


class FarmLocationInsight(BaseModel):
    latitude: float
    longitude: float
    boundary_points: Optional[List[FarmLocationPoint]] = None
    calculated_area: Optional[float] = None
    country: Optional[str] = None
    state: Optional[str] = None
    location_label: Optional[str] = None
    weather_summary: Optional[str] = None
    weather_code: Optional[int] = None
    temperature_c: Optional[float] = None
    precipitation_mm: Optional[float] = None
    wind_speed_kph: Optional[float] = None
    recommended_crops: List[FarmCropSuggestion] = Field(default_factory=list)


class FarmCreate(BaseModel):
    farm_name: str
    farm_area: Optional[float] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    boundary_points: Optional[List[FarmLocationPoint]] = None


class FarmOut(FarmCreate):
    id: int
    calculated_area: Optional[float] = None
    country: Optional[str] = None
    state: Optional[str] = None
    location_label: Optional[str] = None
    weather_summary: Optional[str] = None
    weather_code: Optional[int] = None
    temperature_c: Optional[float] = None
    precipitation_mm: Optional[float] = None
    wind_speed_kph: Optional[float] = None
    recommended_crops: List[FarmCropSuggestion] = Field(default_factory=list)
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
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CropWeather(BaseModel):
    temperature_c: Optional[float] = None
    wind_speed_kph: Optional[float] = None
    precipitation_mm: Optional[float] = None
    weather_code: Optional[int] = None
    weather_summary: Optional[str] = None


class CropNewsItem(BaseModel):
    title: str
    link: str
    published_at: Optional[str] = None


class CropLocation(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    location_label: Optional[str] = None


class CropInsight(BaseModel):
    crop_name: str
    crop_image_url: str
    weather: Optional[CropWeather] = None
    news: List[CropNewsItem] = Field(default_factory=list)
    location: Optional[CropLocation] = None


class CropOut(BaseModel):
    recommended_crop: str
    confidence: float
    crop_image_url: Optional[str] = None
    weather: Optional[CropWeather] = None
    news: List[CropNewsItem] = Field(default_factory=list)
    location: Optional[CropLocation] = None
    location_source: str = "unknown"


class CropDashboardFeedOut(BaseModel):
    crops: List[CropInsight] = Field(default_factory=list)


# ---------- Tractor ----------
class TractorCreate(BaseModel):
    registration_number: str
    brand: str
    model: str
    purchase_year: int


class TractorOut(TractorCreate):
    id: int
    class Config: from_attributes = True


# ---------- Equipment ----------
class EquipmentMerchantOffer(BaseModel):
    merchant: str
    source_url: str
    product_url: str
    price_inr: Optional[float] = None
    price_text: str
    currency: str = "INR"
    is_live: bool = True
    fetched_at: datetime


class EquipmentCard(BaseModel):
    equipment_id: str
    equipment_name: str
    category: str
    image_url: str
    usage_methods: List[str] = Field(default_factory=list)
    requirements: List[str] = Field(default_factory=list)
    offers: List[EquipmentMerchantOffer] = Field(default_factory=list)
    lowest_live_price_inr: Optional[float] = None


class EquipmentLivePriceResponse(BaseModel):
    generated_at: datetime
    cache_age_seconds: int
    source_count: int
    items: List[EquipmentCard] = Field(default_factory=list)


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
    session_id: Optional[str] = "default"


class ChatKnowledgeLink(BaseModel):
    title: str
    url: str


class ChatWebResult(BaseModel):
    title: str
    url: str
    snippet: str
    source: str = "web"


class ChatFarmContext(BaseModel):
    total_farms: int = 0
    latest_farm_name: Optional[str] = None
    latest_location: Optional[str] = None
    weather_summary: Optional[str] = None
    recommended_crops: List[str] = Field(default_factory=list)


class ChatCropContext(BaseModel):
    latest_crop: Optional[str] = None
    latest_confidence: Optional[float] = None
    top_crops: List[str] = Field(default_factory=list)


class ChatReply(BaseModel):
    reply: str
    intent: str
    analysis: str
    provider: str = "ollama"
    action_items: List[str] = Field(default_factory=list)
    farm_context: ChatFarmContext
    crop_context: ChatCropContext
    knowledge_links: List[ChatKnowledgeLink] = Field(default_factory=list)
    web_results: List[ChatWebResult] = Field(default_factory=list)


class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    intent: Optional[str] = None
    session_id: Optional[str] = None
    meta_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    class Config: from_attributes = True
