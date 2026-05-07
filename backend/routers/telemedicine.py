from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import get_db
from models import User, TelemedicineSession, PatientProfile, Notification
from auth import get_current_user, require_role
import uuid

router = APIRouter(prefix="/telemedicine", tags=["Telemedicine"])


class SessionCreate(BaseModel):
    patient_id: Optional[int] = None
    doctor_id: Optional[int] = None
    scheduled_at: str


class SessionNotesUpdate(BaseModel):
    consultation_notes: Optional[str] = None
    prescription: Optional[str] = None


def meeting_url_from_room(room_id: str) -> str:
    return f"https://meet.jit.si/BreastGuard-{room_id}"


def ensure_session_access(session: TelemedicineSession, current_user: User):
    if current_user.role == "admin":
        return
    if current_user.role == "doctor" and session.doctor_id == current_user.id:
        return
    if current_user.role == "patient" and session.patient and session.patient.user_id == current_user.id:
        return
    raise HTTPException(status_code=403, detail="You do not have access to this session")


@router.get("/participants")
def get_participants(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "patient":
        doctors = db.query(User).filter(User.role == "doctor").all()
        return {
            "doctors": [
                {
                    "user_id": d.id,
                    "name": d.name,
                    "specialization": d.doctor_profile.specialization if d.doctor_profile else "General",
                    "hospital": d.doctor_profile.hospital if d.doctor_profile else "",
                }
                for d in doctors
            ]
        }

    if current_user.role == "doctor":
        patients = db.query(PatientProfile).all()
        return {
            "patients": [
                {
                    "patient_id": p.id,
                    "user_id": p.user_id,
                    "name": p.user.name if p.user else "Unknown",
                    "age": p.age,
                }
                for p in patients
            ]
        }

    if current_user.role == "admin":
        doctors = db.query(User).filter(User.role == "doctor").all()
        patients = db.query(PatientProfile).all()
        return {
            "doctors": [
                {
                    "user_id": d.id,
                    "name": d.name,
                    "specialization": d.doctor_profile.specialization if d.doctor_profile else "General",
                    "hospital": d.doctor_profile.hospital if d.doctor_profile else "",
                }
                for d in doctors
            ],
            "patients": [
                {
                    "patient_id": p.id,
                    "user_id": p.user_id,
                    "name": p.user.name if p.user else "Unknown",
                    "age": p.age,
                }
                for p in patients
            ],
        }

    raise HTTPException(status_code=403, detail="Role not allowed to schedule telemedicine sessions")


@router.post("/sessions")
def create_session(req: SessionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient_id = req.patient_id
    doctor_id = req.doctor_id

    if current_user.role == "patient":
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        patient_id = profile.id if profile else None
        if not req.doctor_id:
            raise HTTPException(status_code=400, detail="Please select a doctor for this session")
        doctor = db.query(User).filter(User.id == req.doctor_id, User.role == "doctor").first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        doctor_id = doctor.id
    elif current_user.role == "doctor":
        doctor_id = current_user.id
        if not req.patient_id:
            raise HTTPException(status_code=400, detail="Please select a patient for this session")
        patient = db.query(PatientProfile).filter(PatientProfile.id == req.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        patient_id = patient.id
    elif current_user.role == "admin":
        if not req.patient_id or not req.doctor_id:
            raise HTTPException(status_code=400, detail="Admin must select both patient and doctor")
        patient = db.query(PatientProfile).filter(PatientProfile.id == req.patient_id).first()
        doctor = db.query(User).filter(User.id == req.doctor_id, User.role == "doctor").first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        patient_id = patient.id
        doctor_id = doctor.id
    else:
        raise HTTPException(status_code=403, detail="Role not allowed to create telemedicine sessions")

    if not patient_id or not doctor_id:
        raise HTTPException(status_code=400, detail="A patient and doctor are required for telemedicine")

    session = TelemedicineSession(
        patient_id=patient_id,
        doctor_id=doctor_id,
        scheduled_at=datetime.fromisoformat(req.scheduled_at),
        room_id=uuid.uuid4().hex[:20],
        status="scheduled",
    )
    db.add(session)

    if patient_id:
        notif = Notification(
            patient_id=patient_id,
            type="telemedicine",
            title="Telemedicine Session Scheduled",
            message=f"A video consultation has been scheduled for {req.scheduled_at}. You will receive a link before the session starts.",
            priority="normal",
        )
        db.add(notif)

    db.commit()
    db.refresh(session)
    return {
        "message": "Session created",
        "session_id": session.id,
        "room_id": session.room_id,
        "meeting_url": meeting_url_from_room(session.room_id),
    }


@router.get("/sessions")
def get_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "patient":
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        sessions = db.query(TelemedicineSession).filter(TelemedicineSession.patient_id == profile.id).order_by(TelemedicineSession.scheduled_at.desc()).all() if profile else []
    elif current_user.role == "doctor":
        sessions = db.query(TelemedicineSession).filter(TelemedicineSession.doctor_id == current_user.id).order_by(TelemedicineSession.scheduled_at.desc()).all()
    else:
        sessions = db.query(TelemedicineSession).order_by(TelemedicineSession.scheduled_at.desc()).all()

    return [{
        "id": s.id,
        "patient_id": s.patient_id,
        "patient_name": s.patient.user.name if s.patient else "Unknown",
        "doctor_id": s.doctor_id,
        "doctor_name": s.doctor.name if s.doctor else "Unassigned",
        "status": s.status,
        "scheduled_at": s.scheduled_at.isoformat(),
        "room_id": s.room_id,
        "meeting_url": meeting_url_from_room(s.room_id),
        "notes": s.consultation_notes,
        "prescription": s.prescription,
    } for s in sessions]


@router.put("/sessions/{session_id}/start")
def start_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(TelemedicineSession).filter(TelemedicineSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    ensure_session_access(session, current_user)
    session.status = "active"
    session.started_at = datetime.utcnow()
    db.commit()
    return {"message": "Session started", "room_id": session.room_id, "meeting_url": meeting_url_from_room(session.room_id)}


@router.put("/sessions/{session_id}/join")
def join_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(TelemedicineSession).filter(TelemedicineSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    ensure_session_access(session, current_user)

    if session.status == "scheduled":
        session.status = "active"
        session.started_at = session.started_at or datetime.utcnow()
        db.commit()

    return {
        "session_id": session.id,
        "status": session.status,
        "room_id": session.room_id,
        "meeting_url": meeting_url_from_room(session.room_id),
    }


@router.put("/sessions/{session_id}/end")
def end_session(session_id: int, notes: SessionNotesUpdate = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(TelemedicineSession).filter(TelemedicineSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    ensure_session_access(session, current_user)
    session.status = "completed"
    session.ended_at = datetime.utcnow()
    if notes:
        session.consultation_notes = notes.consultation_notes
        session.prescription = notes.prescription
    db.commit()
    return {"message": "Session ended"}
