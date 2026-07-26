"""Application configuration loaded from environment variables.

This module will load `.env` and then `.env.local` (if present). Values in
`.env.local` override `.env`. We use `python-dotenv` to populate
`os.environ` before creating the Pydantic settings instance.
"""
from pathlib import Path
import os

from dotenv import load_dotenv
from pydantic_settings import BaseSettings


# Backend directory (one level up from this file)
BASE_DIR = Path(__file__).resolve().parents[1]

# Load default env first, then local overrides
env_path = BASE_DIR / ".env"
local_env_path = BASE_DIR / ".env.local"

if env_path.exists():
    load_dotenv(env_path)

if local_env_path.exists():
    # allow .env.local to override values from .env
    load_dotenv(local_env_path, override=True)


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/agropilot"
    SECRET_KEY: str = "supersecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    TESSERACT_CMD: str = "/usr/bin/tesseract" if os.name != "nt" else r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"
    CHATBOT_LLM_PROVIDER: str = "none"  # none | ollama
    CHATBOT_OLLAMA_BASE_URL: str = "http://localhost:11434"
    CHATBOT_OLLAMA_MODEL: str = "llama3.1:8b"
    CHATBOT_LLM_TIMEOUT_SECONDS: int = 60
    # Comma-separated list of allowed CORS origins.
    # Example: https://agropilot.onrender.com,https://www.agropilot.com
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000"

    class Config:
        # envs are already loaded into the environment above
        env_file = None


settings = Settings()
