"""Dashboard counts and chart data."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), user=Depends(get_current_user)):
    uid = user.id
    farm_ids = [f.id for f in db.query(models.Farm).filter_by(user_id=uid).all()]
    counts = {
        "total_farms": db.query(models.Farm).filter_by(user_id=uid).count(),
        "total_plots": db.query(models.Plot).filter(models.Plot.farm_id.in_(farm_ids)).count() if farm_ids else 0,
        "total_tractors": db.query(models.Tractor).filter_by(user_id=uid).count(),
        "soil_reports": db.query(models.SoilReport).filter_by(user_id=uid).count(),
        "disease_detections": db.query(models.DiseaseDetection).filter_by(user_id=uid).count(),
    }

    # Chart: disease distribution
    disease_data = (db.query(models.DiseaseDetection.disease_name,
                             func.count().label("count"))
                    .filter_by(user_id=uid)
                    .group_by(models.DiseaseDetection.disease_name).all())
    counts["disease_chart"] = [{"name": d[0], "count": d[1]} for d in disease_data]

    # Chart: crop recommendations
    crop_data = (db.query(models.CropRecommendation.recommended_crop,
                          func.count().label("count"))
                 .filter_by(user_id=uid)
                 .group_by(models.CropRecommendation.recommended_crop).all())
    counts["crop_chart"] = [{"name": c[0], "count": c[1]} for c in crop_data]
    return counts
