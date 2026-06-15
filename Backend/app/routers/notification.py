"""List and mark notifications as read."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=List[schemas.NotificationOut])
def list_notifications(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.Notification).filter_by(user_id=user.id)\
             .order_by(models.Notification.created_at.desc()).all()


@router.put("/{nid}/read")
def mark_read(nid: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    n = db.query(models.Notification).filter_by(id=nid, user_id=user.id).first()
    if n:
        n.is_read = True; db.commit()
    return {"message": "marked read"}
