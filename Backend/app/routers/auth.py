"""Registration, Login, Logout, JWT auth."""
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models, schemas, security
from ..database import get_db
from ..deps import get_current_user

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=schemas.UserOut)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    normalized_name = payload.name.strip()
    normalized_email = payload.email.strip().lower()
    raw_password = payload.password
    normalized_phone = payload.phone.strip() if payload.phone else None

    if not raw_password.strip():
        raise HTTPException(400, "Password cannot be empty")

    if db.query(models.User).filter(func.lower(models.User.email) == normalized_email).first():
        raise HTTPException(400, "Email already registered")
    user = models.User(
        name=normalized_name,
        email=normalized_email,
        password=security.hash_password(raw_password),
        phone=normalized_phone,
    )
    db.add(user); db.commit(); db.refresh(user)
    # Create an empty farmer profile linked to the user
    db.add(models.Farmer(user_id=user.id, name=user.name)); db.commit()
    return user


@router.post("/login", response_model=schemas.Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2 form uses "username" field -> we treat it as email
    normalized_email = form.username.strip().lower()
    raw_password = form.password
    user = db.query(models.User).filter(func.lower(models.User.email) == normalized_email).first()
    if not user:
        raise HTTPException(401, "Invalid email or password")

    # Use exact password as entered; trimmed fallback supports older clients that trimmed.
    password_candidates = [raw_password]
    trimmed_password = raw_password.strip()
    if trimmed_password != raw_password:
        password_candidates.append(trimmed_password)

    authenticated = False
    upgraded_hash = None
    for candidate in password_candidates:
        verified, maybe_upgraded = security.verify_and_update_password(candidate, user.password)
        log.warning("LOGIN DEBUG | email=%s | candidate_len=%d | hash_prefix=%s | verified=%s",
                    normalized_email, len(candidate), user.password[:20], verified)
        if verified:
            authenticated = True
            upgraded_hash = maybe_upgraded
            break

    if not authenticated:
        log.warning("LOGIN FAILED | email=%s | hash_scheme=%s", normalized_email, user.password.split("$")[1] if "$" in user.password else "unknown")
        raise HTTPException(401, "Invalid email or password")

    if upgraded_hash:
        user.password = upgraded_hash
        db.commit()

    token = security.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/logout")
def logout(current=Depends(get_current_user)):
    # JWT is stateless; logout handled client-side by deleting the token.
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=schemas.UserOut)
def me(current=Depends(get_current_user)):
    return current
