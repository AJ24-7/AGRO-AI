"""Farm CRUD and location intelligence."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..ml.farm_location import build_farm_location_profile

router = APIRouter(prefix="/api/farms", tags=["Farms"])


def _prepare_farm_values(payload: schemas.FarmCreate):
    values = payload.model_dump(mode="json")
    latitude = values.get("latitude")
    longitude = values.get("longitude")
    boundary_points = values.get("boundary_points") or []

    if latitude is not None and longitude is not None:
        location_profile = build_farm_location_profile(latitude, longitude, boundary_points)
        values.update(location_profile)
        values["latitude"] = latitude
        values["longitude"] = longitude
        if location_profile.get("calculated_area") is not None:
            values["farm_area"] = location_profile["calculated_area"]
    return values


@router.get("", response_model=List[schemas.FarmOut])
def list_farms(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.Farm).filter(models.Farm.user_id == user.id).all()


@router.post("", response_model=schemas.FarmOut)
def add_farm(payload: schemas.FarmCreate,
             db: Session = Depends(get_db), user=Depends(get_current_user)):
    farm = models.Farm(user_id=user.id, **_prepare_farm_values(payload))
    db.add(farm); db.commit(); db.refresh(farm)
    return farm


@router.put("/{farm_id}", response_model=schemas.FarmOut)
def edit_farm(farm_id: int, payload: schemas.FarmCreate,
              db: Session = Depends(get_db), user=Depends(get_current_user)):
    farm = db.query(models.Farm).filter_by(id=farm_id, user_id=user.id).first()
    if not farm: raise HTTPException(404, "Farm not found")
    for k, v in _prepare_farm_values(payload).items(): setattr(farm, k, v)
    db.commit(); db.refresh(farm)
    return farm


@router.post("/location-insight", response_model=schemas.FarmLocationInsight)
def farm_location_insight(payload: schemas.FarmLocationInsight,
                          user=Depends(get_current_user)):
    return build_farm_location_profile(
        payload.latitude,
        payload.longitude,
        payload.boundary_points,
    )


@router.delete("/{farm_id}")
def delete_farm(farm_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    farm = db.query(models.Farm).filter_by(id=farm_id, user_id=user.id).first()
    if not farm: raise HTTPException(404, "Farm not found")
    db.delete(farm); db.commit()
    return {"message": "Farm deleted"}
