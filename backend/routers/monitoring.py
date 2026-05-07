from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from database import get_db
from models import User, VitalRecord, TreatmentProgress, PatientProfile
from auth import get_current_user, require_role
import random

router = APIRouter(prefix="/monitoring", tags=["Continuous Monitoring"])


class VitalInput(BaseModel):
    heart_rate: int = 75
    blood_pressure_systolic: int = 120
    blood_pressure_diastolic: int = 80
    temperature: float = 98.6
    weight: float = 65.0
    oxygen_saturation: float = 98.0
    pain_level: int = 0
    notes: Optional[str] = None


class TreatmentInput(BaseModel):
    treatment_type: str
    cycle_number: int
    total_cycles: int
    progress_pct: float
    status: str = "in_progress"
    side_effects: Optional[str] = None
    notes: Optional[str] = None
    next_session: Optional[str] = None


@router.post("/vitals")
def record_vitals(data: VitalInput, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "patient":
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        patient_id = profile.id if profile else None
    else:
        raise HTTPException(status_code=400, detail="Only patients can record their vitals")

    vital = VitalRecord(
        patient_id=patient_id,
        heart_rate=data.heart_rate,
        blood_pressure_systolic=data.blood_pressure_systolic,
        blood_pressure_diastolic=data.blood_pressure_diastolic,
        temperature=data.temperature,
        weight=data.weight,
        oxygen_saturation=data.oxygen_saturation,
        pain_level=data.pain_level,
        notes=data.notes,
    )
    db.add(vital)
    db.commit()
    return {"message": "Vitals recorded", "id": vital.id}


@router.get("/vitals")
def get_vitals(patient_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "patient":
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        pid = profile.id if profile else None
    else:
        pid = patient_id

    if not pid:
        return []

    vitals = db.query(VitalRecord).filter(VitalRecord.patient_id == pid).order_by(VitalRecord.recorded_at.desc()).limit(30).all()
    return [{
        "id": v.id,
        "heart_rate": v.heart_rate,
        "bp_systolic": v.blood_pressure_systolic,
        "bp_diastolic": v.blood_pressure_diastolic,
        "temperature": v.temperature,
        "weight": v.weight,
        "oxygen": v.oxygen_saturation,
        "pain_level": v.pain_level,
        "notes": v.notes,
        "recorded_at": v.recorded_at.isoformat(),
    } for v in vitals]


@router.post("/treatment-progress")
def update_treatment(data: TreatmentInput, patient_id: int, current_user: User = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    tp = TreatmentProgress(
        patient_id=patient_id,
        treatment_type=data.treatment_type,
        cycle_number=data.cycle_number,
        total_cycles=data.total_cycles,
        progress_pct=data.progress_pct,
        status=data.status,
        side_effects=data.side_effects,
        notes=data.notes,
        next_session=datetime.fromisoformat(data.next_session) if data.next_session else None,
    )
    db.add(tp)
    db.commit()
    return {"message": "Treatment progress updated", "id": tp.id}


@router.get("/treatment-progress")
def get_treatment_progress(patient_id: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "patient":
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        pid = profile.id if profile else None
    else:
        pid = patient_id

    if not pid:
        return []

    treatments = db.query(TreatmentProgress).filter(TreatmentProgress.patient_id == pid).order_by(TreatmentProgress.recorded_at.desc()).all()
    return [{
        "id": t.id,
        "type": t.treatment_type,
        "cycle": t.cycle_number,
        "total_cycles": t.total_cycles,
        "progress": t.progress_pct,
        "status": t.status,
        "side_effects": t.side_effects,
        "notes": t.notes,
        "next_session": t.next_session.isoformat() if t.next_session else None,
        "date": t.recorded_at.isoformat(),
    } for t in treatments]


@router.post("/generate-demo-vitals")
def generate_demo_vitals(patient_id: int, days: int = 14, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate simulated vital records for demo purposes."""
    patient = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    base_date = datetime.utcnow() - timedelta(days=days)
    for i in range(days):
        vital = VitalRecord(
            patient_id=patient_id,
            heart_rate=random.randint(65, 90),
            blood_pressure_systolic=random.randint(110, 135),
            blood_pressure_diastolic=random.randint(70, 90),
            temperature=round(random.uniform(97.5, 99.2), 1),
            weight=round(random.uniform(60, 70), 1),
            oxygen_saturation=round(random.uniform(95, 100), 1),
            pain_level=random.randint(0, 4),
            recorded_at=base_date + timedelta(days=i, hours=random.randint(8, 20)),
        )
        db.add(vital)
    db.commit()
    return {"message": f"Generated {days} days of demo vitals for patient {patient_id}"}
