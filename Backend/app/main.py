"""FastAPI application entry point - registers all routers."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import (auth, farmer, farm, plot, soil, crop,
                      disease, fertilizer, tractor, notification,
                      analytics, chatbot)

# Auto-create tables (for dev; use Alembic in production)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AgroPilot AI API", version="1.0.0")

# CORS – allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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
app.include_router(notification.router)
app.include_router(analytics.router)
app.include_router(chatbot.router)


@app.get("/")
def root():
    return {"message": "AgroPilot AI API is running 🌱"}
