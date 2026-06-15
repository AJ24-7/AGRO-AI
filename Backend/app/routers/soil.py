"""Upload a soil report image and extract N, P, K, pH via Tesseract OCR."""
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db
from ..deps import get_current_user
from ..ml.ocr import extract_soil_values

router = APIRouter(prefix="/api/soil", tags=["Soil OCR"])


@router.post("/analyze")
async def analyze_soil(file: UploadFile = File(...),
                       db: Session = Depends(get_db),
                       user=Depends(get_current_user)):
    image_bytes = await file.read()
    values, raw_text = extract_soil_values(image_bytes)

    report = models.SoilReport(
        user_id=user.id,
        nitrogen=values["nitrogen"],
        phosphorus=values["phosphorus"],
        potassium=values["potassium"],
        ph=values["ph"],
        raw_text=raw_text,
    )
    db.add(report); db.commit(); db.refresh(report)
    return {"values": values, "raw_text": raw_text, "report_id": report.id}


@router.get("/history")
def soil_history(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.SoilReport).filter_by(user_id=user.id)\
             .order_by(models.SoilReport.created_at.desc()).all()
