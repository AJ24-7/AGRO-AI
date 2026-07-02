"""Crop recommendation using scikit-learn model + notification."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..ml.crop_model import predict_crop
from ..ml.crop_context import build_crop_insight

router = APIRouter(prefix="/api/crop", tags=["Crop Recommendation"])


@router.post("/recommend", response_model=schemas.CropOut)
def recommend(payload: schemas.CropInput,
              db: Session = Depends(get_db), user=Depends(get_current_user)):
    crop, confidence = predict_crop(
        payload.nitrogen, payload.phosphorus, payload.potassium, payload.ph
    )
    # Save record
    rec = models.CropRecommendation(
        user_id=user.id, **payload.model_dump(),
        recommended_crop=crop, confidence=confidence)
    db.add(rec)
    # Generate a notification (Feature 10)
    db.add(models.Notification(
        user_id=user.id, type="crop",
        title="Crop Recommendation Ready",
        message=f"Recommended crop: {crop} ({confidence}% confidence)"))
    db.commit()

    latitude = payload.latitude
    longitude = payload.longitude
    location_source = "current"

    if latitude is None or longitude is None:
        location_source = "saved_farm"
        latest_farm = (db.query(models.Farm)
                       .filter(models.Farm.user_id == user.id,
                               models.Farm.latitude.isnot(None),
                               models.Farm.longitude.isnot(None))
                       .order_by(models.Farm.id.desc())
                       .first())
        if latest_farm is not None:
            latitude = latest_farm.latitude
            longitude = latest_farm.longitude
        else:
            location_source = "none"

    insight = build_crop_insight(crop, latitude=latitude, longitude=longitude, news_limit=3)
    return {
        "recommended_crop": crop,
        "confidence": confidence,
        "crop_image_url": insight["crop_image_url"],
        "weather": insight["weather"],
        "news": insight["news"],
        "location": insight.get("location"),
        "location_source": location_source,
    }


@router.get("/enrich", response_model=schemas.CropInsight)
def enrich_crop(crop_name: str = Query(..., min_length=2, max_length=60),
                latitude: Optional[float] = Query(default=None),
                longitude: Optional[float] = Query(default=None),
                _user=Depends(get_current_user)):
    return build_crop_insight(crop_name, latitude=latitude, longitude=longitude, news_limit=5)


@router.get("/dashboard-feed", response_model=schemas.CropDashboardFeedOut)
def dashboard_feed(db: Session = Depends(get_db), user=Depends(get_current_user)):
    top_crops = (db.query(models.CropRecommendation.recommended_crop)
                 .filter(models.CropRecommendation.user_id == user.id)
                 .order_by(models.CropRecommendation.id.desc())
                 .limit(12)
                 .all())

    seen = set()
    ordered_unique_crops = []
    for row in top_crops:
        crop_name = (row[0] or "").strip()
        if not crop_name or crop_name in seen:
            continue
        seen.add(crop_name)
        ordered_unique_crops.append(crop_name)
        if len(ordered_unique_crops) == 4:
            break

    if not ordered_unique_crops:
        ordered_unique_crops = ["rice", "wheat", "maize", "cotton"]

    latest_farm = (db.query(models.Farm)
                   .filter(models.Farm.user_id == user.id,
                           models.Farm.latitude.isnot(None),
                           models.Farm.longitude.isnot(None))
                   .order_by(models.Farm.id.desc())
                   .first())
    latitude = latest_farm.latitude if latest_farm is not None else None
    longitude = latest_farm.longitude if latest_farm is not None else None

    crops = [
        build_crop_insight(crop_name, latitude=latitude, longitude=longitude, news_limit=3)
        for crop_name in ordered_unique_crops
    ]
    return {"crops": crops}


@router.get("/recommend-by-location")
def recommend_by_location(
    latitude: float = Query(..., description="User latitude"),
    longitude: float = Query(..., description="User longitude"),
    month: Optional[int] = Query(default=None, ge=1, le=12, description="Current month (1-12)"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """
    Recommend crops based on user's location, current month, and weather.
    Returns top 3-5 recommended crops for the region.
    """
    current_month = month or datetime.now().month
    season_map = {
        1: "winter", 2: "winter", 3: "spring",
        4: "spring", 5: "spring", 6: "summer",
        7: "summer", 8: "summer", 9: "monsoon",
        10: "monsoon", 11: "autumn", 12: "autumn"
    }
    current_season = season_map.get(current_month, "summer")
    
    # Regional crop recommendations based on latitude (simplified regional mapping)
    # India's geography:
    # Northern India (>25°N): Wheat, Maize, Barley
    # Central India (18-25°N): Cotton, Soybean, Maize, Wheat
    # Southern India (<18°N): Rice, Sugarcane, Coconut
    # Coastal regions: Coconut, Spices
    
    recommended_crops = []
    
    if latitude > 25:
        # Northern India
        if current_season in ["winter", "spring"]:
            recommended_crops = ["wheat", "barley", "mustard", "linseed", "chickpea"]
        else:
            recommended_crops = ["maize", "bajra", "moong", "groundnut", "cotton"]
    elif latitude > 18:
        # Central India
        if current_season in ["winter"]:
            recommended_crops = ["wheat", "chickpea", "soybean", "maize"]
        elif current_season in ["monsoon", "autumn"]:
            recommended_crops = ["cotton", "soybean", "maize", "groundnut"]
        else:
            recommended_crops = ["maize", "groundnut", "soybean", "cotton"]
    else:
        # Southern India
        if current_season in ["monsoon"]:
            recommended_crops = ["rice", "sugarcane", "coconut", "pepper"]
        else:
            recommended_crops = ["rice", "coconut", "spices", "sugarcane"]
    
    # Remove duplicates while preserving order
    seen = set()
    unique_crops = []
    for crop in recommended_crops:
        if crop not in seen:
            seen.add(crop)
            unique_crops.append(crop)
    
    # Build insights for top recommendations
    top_recommendations = []
    for crop_name in unique_crops[:5]:
        try:
            insight = build_crop_insight(crop_name, latitude=latitude, longitude=longitude, news_limit=2)
            top_recommendations.append({
                "crop": crop_name,
                "season": current_season,
                "month": current_month,
                "location": {"latitude": latitude, "longitude": longitude},
                "weather": insight.get("weather"),
                "crop_image_url": insight.get("crop_image_url"),
                "reason": f"{crop_name.capitalize()} is well-suited for {current_season} in this region. Optimal planting starts this month."
            })
        except Exception as e:
            print(f"Error building insight for {crop_name}: {e}")
            top_recommendations.append({
                "crop": crop_name,
                "season": current_season,
                "month": current_month,
                "location": {"latitude": latitude, "longitude": longitude},
                "reason": f"{crop_name.capitalize()} is recommended for {current_season} in this region."
            })
    
    return {
        "recommendations": top_recommendations,
        "current_season": current_season,
        "current_month": current_month,
        "location": {"latitude": latitude, "longitude": longitude}
    }
