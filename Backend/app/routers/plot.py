"""Plot CRUD (plots belong to a farm)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/plots", tags=["Plots"])


def _owns_farm(db, user, farm_id):
    return db.query(models.Farm).filter_by(id=farm_id, user_id=user.id).first()


@router.get("", response_model=List[schemas.PlotOut])
def list_plots(db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Return all plots across user's farms
    farm_ids = [f.id for f in db.query(models.Farm).filter_by(user_id=user.id).all()]
    return db.query(models.Plot).filter(models.Plot.farm_id.in_(farm_ids)).all()


@router.post("", response_model=schemas.PlotOut)
def add_plot(payload: schemas.PlotCreate,
             db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not _owns_farm(db, user, payload.farm_id):
        raise HTTPException(403, "Not your farm")
    plot = models.Plot(**payload.model_dump())
    db.add(plot); db.commit(); db.refresh(plot)
    return plot


@router.put("/{plot_id}", response_model=schemas.PlotOut)
def edit_plot(plot_id: int, payload: schemas.PlotCreate,
              db: Session = Depends(get_db), user=Depends(get_current_user)):
    plot = db.query(models.Plot).filter_by(id=plot_id).first()
    if not plot or not _owns_farm(db, user, plot.farm_id):
        raise HTTPException(404, "Plot not found")
    for k, v in payload.model_dump().items(): setattr(plot, k, v)
    db.commit(); db.refresh(plot)
    return plot


@router.delete("/{plot_id}")
def delete_plot(plot_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    plot = db.query(models.Plot).filter_by(id=plot_id).first()
    if not plot or not _owns_farm(db, user, plot.farm_id):
        raise HTTPException(404, "Plot not found")
    db.delete(plot); db.commit()
    return {"message": "Plot deleted"}
