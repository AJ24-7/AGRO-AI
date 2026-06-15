"""Crop recommendation using scikit-learn model + notification."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..ml.crop_model import predict_crop

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
    return {"recommended_crop": crop, "confidence": confidence}
