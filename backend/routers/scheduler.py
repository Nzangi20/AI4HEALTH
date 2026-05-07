from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from database import get_db
from models import User, Appointment, PatientProfile, Notification
from auth import get_current_user, require_role

router = APIRouter(prefix="/scheduler", tags=["Smart Scheduler"])


class AppointmentCreate(BaseModel):
    patient_id: Optional[int] = None
    doctor_id: Optional[int] = None
    appointment_type: str  # screening, chemotherapy, surgery, follow_up, consultation
    scheduled_at: str  # ISO datetime
    duration_minutes: int = 30
    location: Optional[str] = "Main Hospital, Oncology Wing"
    notes: Optional[str] = None


class AppointmentReschedule(BaseModel):
    new_datetime: str
    reason: Optional[str] = None


def auto_cancel_missed_appointments(db: Session) -> int:
    """Cancel scheduled appointments that are already in the past."""
    now = datetime.utcnow()
    stale = db.query(Appointment).filter(
        Appointment.status.in_(["scheduled", "rescheduled"]),
        Appointment.scheduled_at < now
    ).all()

    if not stale:
        return 0

    for appt in stale:
        appt.status = "cancelled"
        db.add(Notification(
            patient_id=appt.patient_id,
            type="appointment",
            title="Missed Appointment Automatically Cancelled",
            message=(
                f"Your {appt.appointment_type.replace('_', ' ')} appointment scheduled for "
                f"{appt.scheduled_at.strftime('%B %d, %Y at %I:%M %p')} was not completed and has been cancelled."
            ),
            priority="normal",
        ))

    db.commit()
    return len(stale)


@router.post("/appointments")
def create_appointment(req: AppointmentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    auto_cancel_missed_appointments(db)
    patient_id = req.patient_id
    if current_user.role == "patient":
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        patient_id = profile.id if profile else None

    if not patient_id:
        raise HTTPException(status_code=400, detail="Patient ID required")

    scheduled = datetime.fromisoformat(req.scheduled_at)
    
    appt = Appointment(
        patient_id=patient_id,
        doctor_id=req.doctor_id or current_user.id,
        appointment_type=req.appointment_type,
        scheduled_at=scheduled,
        duration_minutes=req.duration_minutes,
        location=req.location,
        notes=req.notes,
        status="scheduled",
    )
    db.add(appt)

    # Create reminder notification
    notif = Notification(
        patient_id=patient_id,
        type="appointment",
        title=f"Appointment Scheduled: {req.appointment_type.replace('_', ' ').title()}",
        message=f"Your {req.appointment_type.replace('_', ' ')} appointment is scheduled for {scheduled.strftime('%B %d, %Y at %I:%M %p')} at {req.location}.",
        priority="normal",
    )
    db.add(notif)
    db.commit()
    db.refresh(appt)

    return {"message": "Appointment scheduled", "appointment_id": appt.id}


@router.get("/appointments")
def get_appointments(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    auto_cancel_missed_appointments(db)
    if current_user.role == "patient":
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        if not profile:
            return []
        appts = db.query(Appointment).filter(Appointment.patient_id == profile.id).order_by(Appointment.scheduled_at.desc()).all()
    elif current_user.role == "doctor":
        appts = db.query(Appointment).filter(Appointment.doctor_id == current_user.id).order_by(Appointment.scheduled_at.desc()).all()
    else:
        appts = db.query(Appointment).order_by(Appointment.scheduled_at.desc()).all()

    return [{
        "id": a.id,
        "patient_id": a.patient_id,
        "patient_name": a.patient.user.name if a.patient else "Unknown",
        "doctor_id": a.doctor_id,
        "doctor_name": a.doctor.name if a.doctor else "Unassigned",
        "type": a.appointment_type,
        "scheduled_at": a.scheduled_at.isoformat(),
        "duration_minutes": a.duration_minutes,
        "status": a.status,
        "location": a.location,
        "notes": a.notes,
    } for a in appts]


@router.put("/appointments/{appt_id}/reschedule")
def reschedule(appt_id: int, req: AppointmentReschedule, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    auto_cancel_missed_appointments(db)
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    old_time = appt.scheduled_at
    appt.scheduled_at = datetime.fromisoformat(req.new_datetime)
    appt.status = "rescheduled"
    
    notif = Notification(
        patient_id=appt.patient_id,
        type="reminder",
        title="Appointment Rescheduled",
        message=f"Your {appt.appointment_type.replace('_', ' ')} appointment has been rescheduled from {old_time.strftime('%B %d')} to {appt.scheduled_at.strftime('%B %d, %Y at %I:%M %p')}. Reason: {req.reason or 'N/A'}",
        priority="normal",
    )
    db.add(notif)
    db.commit()
    return {"message": "Appointment rescheduled"}


@router.put("/appointments/{appt_id}/cancel")
def cancel_appointment(appt_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    auto_cancel_missed_appointments(db)
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = "cancelled"
    db.commit()
    return {"message": "Appointment cancelled"}


@router.put("/appointments/{appt_id}/complete")
def complete_appointment(appt_id: int, current_user: User = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    auto_cancel_missed_appointments(db)
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = "completed"
    db.commit()
    return {"message": "Appointment completed"}


@router.post("/auto-schedule")
def auto_schedule_treatment(patient_id: int, treatment_type: str = "chemotherapy", sessions: int = 6,
                            current_user: User = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    """Auto-schedule a series of treatment sessions."""
    auto_cancel_missed_appointments(db)
    patient = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    appointments = []
    base_date = datetime.utcnow() + timedelta(days=7)
    interval = 14 if treatment_type == "chemotherapy" else 7  # days between sessions

    for i in range(sessions):
        scheduled = base_date + timedelta(days=i * interval)
        appt = Appointment(
            patient_id=patient_id,
            doctor_id=current_user.id,
            appointment_type=treatment_type,
            scheduled_at=scheduled,
            duration_minutes=60 if treatment_type in ["chemotherapy", "surgery"] else 30,
            location="Main Hospital, Oncology Wing",
            notes=f"Session {i + 1} of {sessions}",
            status="scheduled",
        )
        db.add(appt)
        appointments.append({"session": i + 1, "date": scheduled.isoformat()})

    notif = Notification(
        patient_id=patient_id,
        type="appointment",
        title=f"{treatment_type.title()} Schedule Created",
        message=f"{sessions} {treatment_type} sessions have been scheduled starting {base_date.strftime('%B %d, %Y')}. Check your calendar for details.",
        priority="high",
    )
    db.add(notif)
    db.commit()

    return {"message": f"{sessions} sessions scheduled", "appointments": appointments}
