"""Farmer profile create/update/view."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/farmer", tags=["Farmer"])


@router.get("", response_model=schemas.FarmerSchema)
def get_profile(db: Session = Depends(get_db), user=Depends(get_current_user)):
    farmer = db.query(models.Farmer).filter(models.Farmer.user_id == user.id).first()
    if not farmer:
        farmer = models.Farmer(user_id=user.id, name=user.name)
        db.add(farmer); db.commit(); db.refresh(farmer)
    return farmer


@router.put("", response_model=schemas.FarmerSchema)
def update_profile(payload: schemas.FarmerSchema,
                   db: Session = Depends(get_db), user=Depends(get_current_user)):
    farmer = db.query(models.Farmer).filter(models.Farmer.user_id == user.id).first()
    if not farmer:
        farmer = models.Farmer(user_id=user.id)
        db.add(farmer)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(farmer, k, v)
    db.commit(); db.refresh(farmer)
    return farmer
