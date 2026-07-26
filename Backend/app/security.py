"""Password hashing and JWT helpers."""
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from passlib.exc import UnknownHashError
from .config import settings

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except (UnknownHashError, ValueError, TypeError):
        return False


def verify_and_update_password(plain: str, hashed: str) -> tuple[bool, str | None]:
    """Verify a password and return a migrated hash when passlib recommends it."""
    try:
        return pwd_context.verify_and_update(plain, hashed)
    except (UnknownHashError, ValueError, TypeError):
        return False, None


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
