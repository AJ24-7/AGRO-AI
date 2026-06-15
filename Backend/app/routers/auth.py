"""Registration, Login, Logout, JWT auth."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from .. import models, schemas, security
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=schemas.UserOut)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")
    user = models.User(
        name=payload.name,
        email=payload.email,
        password=security.hash_password(payload.password),
        phone=payload.phone,
    )
    db.add(user); db.commit(); db.refresh(user)
    # Create an empty farmer profile linked to the user
    db.add(models.Farmer(user_id=user.id, name=user.name)); db.commit()
    return user


@router.post("/login", response_model=schemas.Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2 form uses "username" field -> we treat it as email
    user = db.query(models.User).filter(models.User.email == form.username).first()
    if not user or not security.verify_password(form.password, user.password):
        raise HTTPException(401, "Invalid email or password")
    token = security.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/logout")
def logout(current=Depends(get_current_user)):
    # JWT is stateless; logout handled client-side by deleting the token.
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=schemas.UserOut)
def me(current=Depends(get_current_user)):
    return current
