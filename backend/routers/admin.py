from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import require_role
from database import get_db
from models import (
    User,
    PatientProfile,
    DoctorProfile,
    RiskAssessment,
    LabResult,
    Diagnosis,
    Appointment,
    TelemedicineSession,
    Notification,
)

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


@router.get("/dashboard")
def admin_dashboard(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    users_total = db.query(User).count()
    users_by_role = {
        "patient": db.query(User).filter(User.role == "patient").count(),
        "doctor": db.query(User).filter(User.role == "doctor").count(),
        "lab_tech": db.query(User).filter(User.role == "lab_tech").count(),
        "admin": db.query(User).filter(User.role == "admin").count(),
    }

    appointments_by_status = {
        "scheduled": db.query(Appointment).filter(Appointment.status == "scheduled").count(),
        "completed": db.query(Appointment).filter(Appointment.status == "completed").count(),
        "cancelled": db.query(Appointment).filter(Appointment.status == "cancelled").count(),
        "rescheduled": db.query(Appointment).filter(Appointment.status == "rescheduled").count(),
    }

    telemedicine_by_status = {
        "scheduled": db.query(TelemedicineSession).filter(TelemedicineSession.status == "scheduled").count(),
        "active": db.query(TelemedicineSession).filter(TelemedicineSession.status == "active").count(),
        "completed": db.query(TelemedicineSession).filter(TelemedicineSession.status == "completed").count(),
    }

    recent_users = db.query(User).order_by(User.created_at.desc()).limit(10).all()
    recent_appointments = db.query(Appointment).order_by(Appointment.created_at.desc()).limit(10).all()
    recent_sessions = db.query(TelemedicineSession).order_by(TelemedicineSession.created_at.desc()).limit(10).all()

    return {
        "summary": {
            "users_total": users_total,
            "users_by_role": users_by_role,
            "patient_profiles": db.query(PatientProfile).count(),
            "doctor_profiles": db.query(DoctorProfile).count(),
            "risk_assessments": db.query(RiskAssessment).count(),
            "lab_results": db.query(LabResult).count(),
            "diagnoses": db.query(Diagnosis).count(),
            "notifications_total": db.query(Notification).count(),
            "notifications_unread": db.query(Notification).filter(Notification.is_read == False).count(),  # noqa: E712
            "appointments_by_status": appointments_by_status,
            "telemedicine_by_status": telemedicine_by_status,
        },
        "recent_users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in recent_users
        ],
        "recent_appointments": [
            {
                "id": a.id,
                "patient_name": a.patient.user.name if a.patient and a.patient.user else "Unknown",
                "doctor_name": a.doctor.name if a.doctor else "Unassigned",
                "type": a.appointment_type,
                "status": a.status,
                "scheduled_at": a.scheduled_at.isoformat() if a.scheduled_at else None,
            }
            for a in recent_appointments
        ],
        "recent_telemedicine": [
            {
                "id": s.id,
                "patient_name": s.patient.user.name if s.patient and s.patient.user else "Unknown",
                "doctor_name": s.doctor.name if s.doctor else "Unassigned",
                "status": s.status,
                "scheduled_at": s.scheduled_at.isoformat() if s.scheduled_at else None,
                "room_id": s.room_id,
            }
            for s in recent_sessions
        ],
    }


@router.get("/users")
def list_users(current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "phone": u.phone,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "patient_profile_id": u.patient_profile.id if u.patient_profile else None,
            "doctor_profile_id": u.doctor_profile.id if u.doctor_profile else None,
            "doctor_specialization": u.doctor_profile.specialization if u.doctor_profile else None,
            "doctor_hospital": u.doctor_profile.hospital if u.doctor_profile else None,
        }
        for u in users
    ]


@router.put("/users/{user_id}/role")
def change_user_role(user_id: int, role: str, current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    if role not in ("patient", "doctor", "lab_tech", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id and role != "admin":
        raise HTTPException(status_code=400, detail="Cannot demote your current admin account")

    user.role = role
    db.commit()
    return {"message": "Role updated", "user_id": user.id, "role": user.role}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(require_role("admin")), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    db.delete(user)
    db.commit()
    return {"message": "User deleted", "user_id": user_id}
