from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db
from models import User, PatientProfile, RiskAssessment, Notification
from auth import get_current_user, require_role
from ai_engine import predict_risk

router = APIRouter(prefix="/patients", tags=["Patients"])


class PatientProfileUpdate(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    medical_history: Optional[str] = None
    family_history: Optional[str] = None
    lifestyle: Optional[str] = None
    emergency_contact: Optional[str] = None


class RiskAssessmentRequest(BaseModel):
    age: int
    bmi: float = 25.0
    symptoms: List[str] = []
    family_history: bool = False
    hormonal_therapy: bool = False
    menopause: bool = False
    alcohol_use: int = 0
    smoking: bool = False
    physical_activity: int = 2
    previous_biopsy: bool = False
    breast_density: int = 2
    medical_history: Optional[str] = None
    lifestyle: Optional[str] = None


@router.get("/profile")
def get_profile(current_user: User = Depends(require_role("patient")), db: Session = Depends(get_db)):
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "name": current_user.name,
        "email": current_user.email,
        "age": profile.age,
        "gender": profile.gender,
        "blood_type": profile.blood_type,
        "allergies": profile.allergies,
        "medical_history": profile.medical_history,
        "family_history": profile.family_history,
        "lifestyle": profile.lifestyle,
        "emergency_contact": profile.emergency_contact,
    }


@router.put("/profile")
def update_profile(data: PatientProfileUpdate, current_user: User = Depends(require_role("patient")), db: Session = Depends(get_db)):
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return {"message": "Profile updated", "profile_id": profile.id}


@router.post("/risk-assessment")
def submit_risk_assessment(req: RiskAssessmentRequest, current_user: User = Depends(require_role("patient")), db: Session = Depends(get_db)):
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    # Update profile with assessment data
    profile.age = req.age
    if req.medical_history:
        profile.medical_history = req.medical_history
    if req.lifestyle:
        profile.lifestyle = req.lifestyle
    profile.family_history = "Yes" if req.family_history else "No"

    # Run AI prediction
    result = predict_risk(req.dict())

    # Save assessment
    assessment = RiskAssessment(
        patient_id=profile.id,
        risk_level=result["risk_level"],
        probability=result["probability"],
        symptoms=req.symptoms,
        factors=result["contributing_factors"],
        recommendations="; ".join(result["recommendations"]),
    )
    db.add(assessment)

    # Create notification
    notif = Notification(
        patient_id=profile.id,
        type="risk_assessment",
        title=f"Risk Assessment Complete - {result['risk_level']} Risk",
        message=f"Your breast cancer risk assessment indicates {result['risk_level']} risk ({result['probability']}% confidence). {result['recommendations'][0]}",
        priority="high" if result["risk_level"] == "High" else "normal",
    )
    db.add(notif)
    db.commit()
    db.refresh(assessment)

    return {
        "assessment_id": assessment.id,
        **result
    }


@router.get("/risk-assessments")
def get_risk_assessments(current_user: User = Depends(require_role("patient")), db: Session = Depends(get_db)):
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        return []
    assessments = db.query(RiskAssessment).filter(RiskAssessment.patient_id == profile.id).order_by(RiskAssessment.created_at.desc()).all()
    return [{
        "id": a.id,
        "risk_level": a.risk_level,
        "probability": a.probability,
        "symptoms": a.symptoms,
        "factors": a.factors,
        "recommendations": a.recommendations,
        "created_at": a.created_at.isoformat(),
    } for a in assessments]


@router.get("/dashboard")
def patient_dashboard(current_user: User = Depends(require_role("patient")), db: Session = Depends(get_db)):
    profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    latest_assessment = db.query(RiskAssessment).filter(
        RiskAssessment.patient_id == profile.id
    ).order_by(RiskAssessment.created_at.desc()).first()

    unread_notifs = db.query(Notification).filter(
        Notification.patient_id == profile.id,
        Notification.is_read == False
    ).count()

    from models import Appointment, VitalRecord, TreatmentProgress
    upcoming_appts = db.query(Appointment).filter(
        Appointment.patient_id == profile.id,
        Appointment.status == "scheduled"
    ).count()

    return {
        "patient": {
            "name": current_user.name,
            "age": profile.age,
            "profile_complete": bool(profile.age and profile.blood_type),
        },
        "latest_risk": {
            "level": latest_assessment.risk_level if latest_assessment else None,
            "probability": latest_assessment.probability if latest_assessment else None,
            "date": latest_assessment.created_at.isoformat() if latest_assessment else None,
        } if latest_assessment else None,
        "unread_notifications": unread_notifs,
        "upcoming_appointments": upcoming_appts,
    }
