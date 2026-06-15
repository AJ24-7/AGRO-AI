"""Leaf disease detection + history + notification."""
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db
from ..deps import get_current_user
from ..ml.disease_model import detect_disease

router = APIRouter(prefix="/api/disease", tags=["Disease Detection"])


@router.post("/detect")
async def detect(file: UploadFile = File(...),
                 db: Session = Depends(get_db), user=Depends(get_current_user)):
    image_bytes = await file.read()
    result = detect_disease(image_bytes)

    rec = models.DiseaseDetection(
        user_id=user.id,
        disease_name=result["disease"],
        confidence=result["confidence"],
        treatment=result["treatment"])
    db.add(rec)
    db.add(models.Notification(
        user_id=user.id, type="disease",
        title="Disease Detection Result",
        message=f"Detected: {result['disease']} ({result['confidence']}%)"))
    db.commit()
    return result


@router.get("/history")
def history(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.DiseaseDetection).filter_by(user_id=user.id)\
             .order_by(models.DiseaseDetection.created_at.desc()).all()
