from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db
from models import User, DoctorProfile, PatientProfile, RiskAssessment, LabResult, Diagnosis, Notification
from auth import get_current_user, require_role

router = APIRouter(prefix="/doctors", tags=["Doctors"])


class DiagnosisRequest(BaseModel):
    patient_id: int
    risk_assessment_id: Optional[int] = None
    lab_result_id: Optional[int] = None
    status: str  # positive, negative, inconclusive
    stage: Optional[str] = None
    clinical_notes: str
    care_plan: Optional[str] = None


class DoctorProfileUpdate(BaseModel):
    specialization: Optional[str] = None
    hospital: Optional[str] = None
    location: Optional[str] = None
    availability: Optional[str] = None


@router.get("/nearby")
def get_nearby_doctors(risk_level: Optional[str] = None, db: Session = Depends(get_db)):
    """Get recommended doctors, optionally filtered by risk level."""
    query = db.query(DoctorProfile).join(User)
    if risk_level == "High":
        query = query.filter(DoctorProfile.specialization.in_(["Oncology", "Surgical Oncology", "Breast Surgery"]))
    doctors = query.filter(DoctorProfile.availability == "available").all()
    return [{
        "id": d.id,
        "user_id": d.user_id,
        "name": d.user.name,
        "specialization": d.specialization,
        "hospital": d.hospital,
        "location": d.location,
        "rating": d.rating,
        "experience_years": d.experience_years,
        "availability": d.availability,
    } for d in doctors]


@router.get("/dashboard")
def doctor_dashboard(current_user: User = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    doctor_profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()

    # Get patients with high-risk assessments
    high_risk = db.query(RiskAssessment).filter(RiskAssessment.risk_level == "High").order_by(RiskAssessment.created_at.desc()).limit(10).all()
    
    pending_labs = db.query(LabResult).filter(LabResult.status == "completed").count()
    
    total_diagnoses = db.query(Diagnosis).filter(Diagnosis.doctor_id == current_user.id).count()
    pending_reviews = db.query(LabResult).filter(LabResult.status == "completed").count()

    from models import Appointment
    today_appts = db.query(Appointment).filter(
        Appointment.doctor_id == current_user.id,
        Appointment.status == "scheduled"
    ).count()

    return {
        "doctor": {
            "name": current_user.name,
            "specialization": doctor_profile.specialization if doctor_profile else "General",
            "hospital": doctor_profile.hospital if doctor_profile else "",
        },
        "high_risk_patients": [{
            "assessment_id": a.id,
            "patient_id": a.patient_id,
            "patient_name": a.patient.user.name if a.patient else "Unknown",
            "risk_level": a.risk_level,
            "probability": a.probability,
            "date": a.created_at.isoformat(),
        } for a in high_risk],
        "pending_lab_reviews": pending_reviews,
        "total_diagnoses": total_diagnoses,
        "today_appointments": today_appts,
    }


@router.get("/patients")
def get_all_patients(current_user: User = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    patients = db.query(PatientProfile).join(User).all()
    result = []
    for p in patients:
        latest = db.query(RiskAssessment).filter(RiskAssessment.patient_id == p.id).order_by(RiskAssessment.created_at.desc()).first()
        result.append({
            "id": p.id,
            "user_id": p.user_id,
            "name": p.user.name,
            "age": p.age,
            "latest_risk": latest.risk_level if latest else None,
            "latest_probability": latest.probability if latest else None,
        })
    return result


@router.get("/patients/{patient_id}")
def get_patient_detail(patient_id: int, current_user: User = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    profile = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient not found")

    assessments = db.query(RiskAssessment).filter(RiskAssessment.patient_id == patient_id).order_by(RiskAssessment.created_at.desc()).all()
    labs = db.query(LabResult).filter(LabResult.patient_id == patient_id).order_by(LabResult.created_at.desc()).all()
    diagnoses = db.query(Diagnosis).filter(Diagnosis.patient_id == patient_id).order_by(Diagnosis.created_at.desc()).all()

    return {
        "patient": {
            "id": profile.id,
            "name": profile.user.name,
            "age": profile.age,
            "gender": profile.gender,
            "blood_type": profile.blood_type,
            "medical_history": profile.medical_history,
            "family_history": profile.family_history,
            "allergies": profile.allergies,
        },
        "risk_assessments": [{
            "id": a.id, "risk_level": a.risk_level, "probability": a.probability,
            "symptoms": a.symptoms, "factors": a.factors, "date": a.created_at.isoformat(),
        } for a in assessments],
        "lab_results": [{
            "id": l.id, "test_type": l.test_type, "status": l.status,
            "result_summary": l.result_summary, "date": l.created_at.isoformat(),
        } for l in labs],
        "diagnoses": [{
            "id": d.id, "status": d.status, "stage": d.stage,
            "notes": d.clinical_notes, "date": d.created_at.isoformat(),
        } for d in diagnoses],
    }


@router.post("/diagnose")
def create_diagnosis(req: DiagnosisRequest, current_user: User = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    patient = db.query(PatientProfile).filter(PatientProfile.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    diagnosis = Diagnosis(
        patient_id=req.patient_id,
        doctor_id=current_user.id,
        risk_assessment_id=req.risk_assessment_id,
        lab_result_id=req.lab_result_id,
        status=req.status,
        stage=req.stage,
        clinical_notes=req.clinical_notes,
        care_plan=req.care_plan,
    )
    db.add(diagnosis)

    # Notify patient
    status_text = "Positive" if req.status == "positive" else "Negative" if req.status == "negative" else "Inconclusive"
    notif = Notification(
        patient_id=req.patient_id,
        type="diagnosis",
        title=f"Diagnosis Result: {status_text}",
        message=f"Dr. {current_user.name} has completed your diagnosis. Result: {status_text}. {req.clinical_notes[:200] if req.clinical_notes else ''}",
        priority="urgent" if req.status == "positive" else "normal",
    )
    db.add(notif)

    if req.care_plan:
        care_notif = Notification(
            patient_id=req.patient_id,
            type="care_plan",
            title="Personalized Care Plan Available",
            message=req.care_plan,
            priority="high",
        )
        db.add(care_notif)

    db.commit()
    db.refresh(diagnosis)
    return {"message": "Diagnosis created", "diagnosis_id": diagnosis.id, "status": req.status}


@router.put("/profile")
def update_doctor_profile(data: DoctorProfileUpdate, current_user: User = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    return {"message": "Profile updated"}
