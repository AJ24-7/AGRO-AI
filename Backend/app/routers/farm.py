"""Farm CRUD."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/farms", tags=["Farms"])


@router.get("", response_model=List[schemas.FarmOut])
def list_farms(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.Farm).filter(models.Farm.user_id == user.id).all()


@router.post("", response_model=schemas.FarmOut)
def add_farm(payload: schemas.FarmCreate,
             db: Session = Depends(get_db), user=Depends(get_current_user)):
    farm = models.Farm(user_id=user.id, **payload.model_dump())
    db.add(farm); db.commit(); db.refresh(farm)
    return farm


@router.put("/{farm_id}", response_model=schemas.FarmOut)
def edit_farm(farm_id: int, payload: schemas.FarmCreate,
              db: Session = Depends(get_db), user=Depends(get_current_user)):
    farm = db.query(models.Farm).filter_by(id=farm_id, user_id=user.id).first()
    if not farm: raise HTTPException(404, "Farm not found")
    for k, v in payload.model_dump().items(): setattr(farm, k, v)
    db.commit(); db.refresh(farm)
    return farm


@router.delete("/{farm_id}")
def delete_farm(farm_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    farm = db.query(models.Farm).filter_by(id=farm_id, user_id=user.id).first()
    if not farm: raise HTTPException(404, "Farm not found")
    db.delete(farm); db.commit()
    return {"message": "Farm deleted"}
