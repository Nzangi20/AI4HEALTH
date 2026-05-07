from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, PatientProfile, RiskAssessment, LabResult, Diagnosis, Appointment, VitalRecord, TreatmentProgress
from auth import get_current_user

router = APIRouter(prefix="/records", tags=["Unified Patient Records"])


@router.get("/{patient_id}")
def get_unified_record(patient_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get FHIR-inspired unified patient record."""
    profile = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Access control
    if current_user.role == "patient":
        if profile.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    assessments = db.query(RiskAssessment).filter(RiskAssessment.patient_id == patient_id).order_by(RiskAssessment.created_at.desc()).all()
    labs = db.query(LabResult).filter(LabResult.patient_id == patient_id).order_by(LabResult.created_at.desc()).all()
    diagnoses = db.query(Diagnosis).filter(Diagnosis.patient_id == patient_id).order_by(Diagnosis.created_at.desc()).all()
    appointments = db.query(Appointment).filter(Appointment.patient_id == patient_id).order_by(Appointment.scheduled_at.desc()).all()
    vitals = db.query(VitalRecord).filter(VitalRecord.patient_id == patient_id).order_by(VitalRecord.recorded_at.desc()).limit(30).all()
    treatments = db.query(TreatmentProgress).filter(TreatmentProgress.patient_id == patient_id).order_by(TreatmentProgress.recorded_at.desc()).all()

    return {
        "resourceType": "PatientBundle",
        "meta": {"lastUpdated": profile.user.created_at.isoformat() if profile.user else None},
        "patient": {
            "resourceType": "Patient",
            "id": profile.id,
            "name": profile.user.name,
            "email": profile.user.email,
            "phone": profile.user.phone,
            "age": profile.age,
            "gender": profile.gender,
            "blood_type": profile.blood_type,
            "allergies": profile.allergies,
            "medical_history": profile.medical_history,
            "family_history": profile.family_history,
            "lifestyle": profile.lifestyle,
            "emergency_contact": profile.emergency_contact,
        },
        "risk_assessments": [{
            "resourceType": "RiskAssessment",
            "id": a.id,
            "risk_level": a.risk_level,
            "probability": a.probability,
            "symptoms": a.symptoms,
            "factors": a.factors,
            "recommendations": a.recommendations,
            "date": a.created_at.isoformat(),
        } for a in assessments],
        "lab_results": [{
            "resourceType": "DiagnosticReport",
            "id": l.id,
            "test_type": l.test_type,
            "result_data": l.result_data,
            "result_summary": l.result_summary,
            "status": l.status,
            "date": l.created_at.isoformat(),
        } for l in labs],
        "diagnoses": [{
            "resourceType": "Condition",
            "id": d.id,
            "status": d.status,
            "stage": d.stage,
            "clinical_notes": d.clinical_notes,
            "care_plan": d.care_plan,
            "date": d.created_at.isoformat(),
        } for d in diagnoses],
        "appointments": [{
            "resourceType": "Appointment",
            "id": a.id,
            "type": a.appointment_type,
            "scheduled_at": a.scheduled_at.isoformat(),
            "status": a.status,
            "location": a.location,
        } for a in appointments],
        "vitals": [{
            "resourceType": "Observation",
            "id": v.id,
            "heart_rate": v.heart_rate,
            "blood_pressure": f"{v.blood_pressure_systolic}/{v.blood_pressure_diastolic}",
            "temperature": v.temperature,
            "weight": v.weight,
            "oxygen": v.oxygen_saturation,
            "pain_level": v.pain_level,
            "date": v.recorded_at.isoformat(),
        } for v in vitals],
        "treatments": [{
            "resourceType": "Procedure",
            "id": t.id,
            "type": t.treatment_type,
            "cycle": f"{t.cycle_number}/{t.total_cycles}",
            "progress": t.progress_pct,
            "status": t.status,
            "date": t.recorded_at.isoformat(),
        } for t in treatments],
    }


@router.get("/summary/{patient_id}")
def get_record_summary(patient_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get a quick summary of a patient's record."""
    profile = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Patient not found")

    if current_user.role == "patient" and profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "patient_name": profile.user.name,
        "total_assessments": db.query(RiskAssessment).filter(RiskAssessment.patient_id == patient_id).count(),
        "total_lab_results": db.query(LabResult).filter(LabResult.patient_id == patient_id).count(),
        "total_diagnoses": db.query(Diagnosis).filter(Diagnosis.patient_id == patient_id).count(),
        "total_appointments": db.query(Appointment).filter(Appointment.patient_id == patient_id).count(),
        "total_vitals": db.query(VitalRecord).filter(VitalRecord.patient_id == patient_id).count(),
        "total_treatments": db.query(TreatmentProgress).filter(TreatmentProgress.patient_id == patient_id).count(),
    }
