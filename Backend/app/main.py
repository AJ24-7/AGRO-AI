"""FastAPI application entry point - registers all routers."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from .database import Base, engine
from .routers import (auth, farmer, farm, plot, soil, crop,
                      disease, fertilizer, tractor, notification,
                      analytics, chatbot, equipment)


def _ensure_farm_schema():
    farm_columns = {
        "latitude": "FLOAT",
        "longitude": "FLOAT",
        "boundary_points": "JSON",
        "calculated_area": "FLOAT",
        "country": "VARCHAR(120)",
        "state": "VARCHAR(120)",
        "location_label": "VARCHAR(255)",
        "weather_summary": "VARCHAR(255)",
        "weather_code": "INTEGER",
        "temperature_c": "FLOAT",
        "precipitation_mm": "FLOAT",
        "wind_speed_kph": "FLOAT",
        "recommended_crops": "JSON",
    }
    inspector = inspect(engine)
    if "farms" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("farms")}
    missing_columns = {
        name: definition
        for name, definition in farm_columns.items()
        if name not in existing_columns
    }
    if not missing_columns:
        return

    with engine.begin() as connection:
        for name, definition in missing_columns.items():
            connection.execute(text(f"ALTER TABLE farms ADD COLUMN {name} {definition}"))


def _ensure_chat_schema():
    inspector = inspect(engine)
    if "chat_messages" in inspector.get_table_names():
        return

    with engine.begin() as connection:
        connection.execute(text("""
            CREATE TABLE chat_messages (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                session_id VARCHAR(120) DEFAULT 'default',
                role VARCHAR(20) NOT NULL,
                content TEXT NOT NULL,
                intent VARCHAR(50),
                meta_json JSON,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        connection.execute(text("CREATE INDEX idx_chat_user ON chat_messages(user_id)"))
        connection.execute(text("CREATE INDEX idx_chat_session ON chat_messages(session_id)"))


# Auto-create tables (for dev; use Alembic in production)
Base.metadata.create_all(bind=engine)
_ensure_farm_schema()
_ensure_chat_schema()

app = FastAPI(title="AgroPilot AI API", version="1.0.0")

# CORS – allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(farmer.router)
app.include_router(farm.router)
app.include_router(plot.router)
app.include_router(soil.router)
app.include_router(crop.router)
app.include_router(disease.router)
app.include_router(fertilizer.router)
app.include_router(tractor.router)
app.include_router(equipment.router)
app.include_router(notification.router)
app.include_router(analytics.router)
app.include_router(chatbot.router)


@app.get("/")
def root():
    return {"message": "AgroPilot AI API is running 🌱"}
