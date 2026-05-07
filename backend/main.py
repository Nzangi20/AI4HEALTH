from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from auth import router as auth_router
from routers import patients, doctors, lab, scheduler, monitoring, knowledge, records, telemedicine, notifications, access, admin
from ai_engine import train_model

app = FastAPI(
    title="BreastGuard AI",
    description="End-to-End Intelligent Breast Cancer Detection & Care System",
    version="1.0.0",
)

import os

# CORS - allow frontend origins
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(lab.router)
app.include_router(scheduler.router)
app.include_router(monitoring.router)
app.include_router(knowledge.router)
app.include_router(records.router)
app.include_router(telemedicine.router)
app.include_router(notifications.router)
app.include_router(access.router)
app.include_router(admin.router)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    print("[BreastGuard AI] Database tables created.")
    train_model()
    print("[BreastGuard AI] System ready.")


@app.get("/")
def root():
    return {
        "system": "BreastGuard AI",
        "version": "1.0.0",
        "description": "End-to-End Intelligent Breast Cancer Detection & Care System",
        "modules": [
            "Patient Module",
            "AI Risk Engine",
            "Nearby Doctor",
            "Lab Technician",
            "Doctor Diagnosis",
            "Notification System",
            "Smart Scheduler",
            "Continuous Monitoring",
            "Global Knowledge Hub",
            "Unified Patient Records",
            "Telemedicine",
            "Smart Appointments",
            "Low-Cost Access Layer"
        ],
        "disclaimer": "This system is designed to support clinical decisions. It does not replace professional medical diagnosis or treatment by qualified healthcare providers."
    }


@app.get("/health")
def health():
    return {"status": "healthy", "service": "BreastGuard AI API"}
