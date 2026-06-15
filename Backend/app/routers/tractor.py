"""Tractor CRUD."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/tractors", tags=["Tractors"])


@router.get("", response_model=List[schemas.TractorOut])
def list_tractors(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.Tractor).filter_by(user_id=user.id).all()


@router.post("", response_model=schemas.TractorOut)
def add_tractor(payload: schemas.TractorCreate,
                db: Session = Depends(get_db), user=Depends(get_current_user)):
    t = models.Tractor(user_id=user.id, **payload.model_dump())
    db.add(t); db.commit(); db.refresh(t)
    return t


@router.put("/{tid}", response_model=schemas.TractorOut)
def edit_tractor(tid: int, payload: schemas.TractorCreate,
                 db: Session = Depends(get_db), user=Depends(get_current_user)):
    t = db.query(models.Tractor).filter_by(id=tid, user_id=user.id).first()
    if not t: raise HTTPException(404, "Tractor not found")
    for k, v in payload.model_dump().items(): setattr(t, k, v)
    db.commit(); db.refresh(t)
    return t


@router.delete("/{tid}")
def delete_tractor(tid: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    t = db.query(models.Tractor).filter_by(id=tid, user_id=user.id).first()
    if not t: raise HTTPException(404, "Tractor not found")
    db.delete(t); db.commit()
    return {"message": "Tractor deleted"}
