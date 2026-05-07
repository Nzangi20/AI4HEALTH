from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Notification, PatientProfile
from auth import get_current_user, require_role

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "patient":
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        if not profile:
            return []
        notifs = db.query(Notification).filter(Notification.patient_id == profile.id).order_by(Notification.created_at.desc()).limit(50).all()
    else:
        notifs = db.query(Notification).order_by(Notification.created_at.desc()).limit(50).all()

    return [{
        "id": n.id,
        "type": n.type,
        "title": n.title,
        "message": n.message,
        "is_read": n.is_read,
        "priority": n.priority,
        "created_at": n.created_at.isoformat(),
    } for n in notifs]


@router.put("/{notif_id}/read")
def mark_read(notif_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.put("/mark-all-read")
def mark_all_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "patient":
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        if profile:
            db.query(Notification).filter(Notification.patient_id == profile.id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.get("/unread-count")
def unread_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "patient":
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        if not profile:
            return {"count": 0}
        count = db.query(Notification).filter(Notification.patient_id == profile.id, Notification.is_read == False).count()
    else:
        count = db.query(Notification).filter(Notification.is_read == False).count()
    return {"count": count}
