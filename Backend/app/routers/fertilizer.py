"""Fertilizer recommendation based on soil values + crop."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from .. import models
from ..database import get_db
from ..deps import get_current_user
from ..ml.fertilizer_logic import recommend_fertilizer

router = APIRouter(prefix="/api/fertilizer", tags=["Fertilizer"])


class FertInput(BaseModel):
    nitrogen: float
    phosphorus: float
    potassium: float
    crop: str


@router.post("/recommend")
def recommend(payload: FertInput,
              db: Session = Depends(get_db), user=Depends(get_current_user)):
    result = recommend_fertilizer(
        payload.nitrogen, payload.phosphorus, payload.potassium, payload.crop)
    db.add(models.Notification(
        user_id=user.id, type="fertilizer",
        title="Fertilizer Recommendation",
        message=f"For {payload.crop}: " +
                ", ".join(f"{r['name']} {r['quantity']}" for r in result)))
    db.commit()
    return {"crop": payload.crop, "recommendations": result}
