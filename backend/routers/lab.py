import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models import User, LabResult, PatientProfile, Notification
from auth import get_current_user, require_role

router = APIRouter(prefix="/lab", tags=["Lab Technician"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "lab")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class LabResultCreate(BaseModel):
    patient_id: int
    test_type: str  # mammogram, biopsy, blood_test, ultrasound, mri
    result_data: dict = {}
    result_summary: str
    status: str = "completed"


class LabResultUpdate(BaseModel):
    result_data: Optional[dict] = None
    result_summary: Optional[str] = None
    status: Optional[str] = None


@router.get("/dashboard")
def lab_dashboard(current_user: User = Depends(require_role("lab_tech")), db: Session = Depends(get_db)):
    total = db.query(LabResult).filter(LabResult.technician_id == current_user.id).count()
    pending = db.query(LabResult).filter(LabResult.technician_id == current_user.id, LabResult.status == "pending").count()
    completed = db.query(LabResult).filter(LabResult.technician_id == current_user.id, LabResult.status == "completed").count()

    recent = db.query(LabResult).filter(
        LabResult.technician_id == current_user.id
    ).order_by(LabResult.created_at.desc()).limit(10).all()

    return {
        "technician": {"name": current_user.name},
        "stats": {"total": total, "pending": pending, "completed": completed},
        "recent_results": [{
            "id": r.id,
            "patient_id": r.patient_id,
            "patient_name": r.patient.user.name if r.patient else "Unknown",
            "test_type": r.test_type,
            "status": r.status,
            "date": r.created_at.isoformat(),
        } for r in recent],
    }


@router.post("/results")
def upload_result(req: LabResultCreate, current_user: User = Depends(require_role("lab_tech")), db: Session = Depends(get_db)):
    patient = db.query(PatientProfile).filter(PatientProfile.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    result = LabResult(
        patient_id=req.patient_id,
        technician_id=current_user.id,
        test_type=req.test_type,
        result_data=req.result_data,
        result_summary=req.result_summary,
        status=req.status,
    )
    db.add(result)

    notif = Notification(
        patient_id=req.patient_id,
        type="lab_result",
        title=f"Lab Result Available: {req.test_type.replace('_', ' ').title()}",
        message=f"Your {req.test_type.replace('_', ' ')} results are now available. Please consult your doctor for interpretation.",
        priority="normal",
    )
    db.add(notif)

    db.commit()
    db.refresh(result)
    return {"message": "Lab result uploaded", "result_id": result.id}


@router.post("/results/upload-file")
async def upload_result_with_file(
    patient_id: int = Form(...),
    test_type: str = Form(...),
    result_summary: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("lab_tech")),
    db: Session = Depends(get_db),
):
    """Upload a lab result with an attached file (image, PDF, DICOM, etc.)."""
    patient = db.query(PatientProfile).filter(PatientProfile.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Save the file
    import uuid
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    safe_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    contents = await file.read()
    file_size_mb = len(contents) / (1024 * 1024)
    if file_size_mb > 50:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 50MB.")

    with open(file_path, "wb") as f:
        f.write(contents)

    result = LabResult(
        patient_id=patient_id,
        technician_id=current_user.id,
        test_type=test_type,
        result_data={"original_filename": file.filename, "file_size_mb": round(file_size_mb, 2)},
        result_summary=result_summary,
        file_path=file_path,
        status="completed",
    )
    db.add(result)

    notif = Notification(
        patient_id=patient_id,
        type="lab_result",
        title=f"Lab Result Available: {test_type.replace('_', ' ').title()}",
        message=f"Your {test_type.replace('_', ' ')} results with attached file are now available.",
        priority="normal",
    )
    db.add(notif)

    db.commit()
    db.refresh(result)
    return {
        "message": "Lab result with file uploaded successfully",
        "result_id": result.id,
        "file_name": file.filename,
        "file_size_mb": round(file_size_mb, 2),
    }


@router.get("/results/{result_id}/file")
def download_lab_file(result_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Download the file attached to a lab result."""
    result = db.query(LabResult).filter(LabResult.id == result_id).first()
    if not result or not result.file_path:
        raise HTTPException(status_code=404, detail="File not found")
    if not os.path.exists(result.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    original_name = result.result_data.get("original_filename", "lab_result") if result.result_data else "lab_result"
    return FileResponse(result.file_path, filename=original_name)


@router.get("/results")
def get_results(current_user: User = Depends(require_role("lab_tech")), db: Session = Depends(get_db)):
    results = db.query(LabResult).filter(
        LabResult.technician_id == current_user.id
    ).order_by(LabResult.created_at.desc()).all()
    return [{
        "id": r.id,
        "patient_id": r.patient_id,
        "patient_name": r.patient.user.name if r.patient else "Unknown",
        "test_type": r.test_type,
        "result_data": r.result_data,
        "result_summary": r.result_summary,
        "status": r.status,
        "has_file": bool(r.file_path),
        "file_name": r.result_data.get("original_filename") if r.result_data and isinstance(r.result_data, dict) else None,
        "date": r.created_at.isoformat(),
    } for r in results]


@router.get("/results/{result_id}")
def get_result_detail(result_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = db.query(LabResult).filter(LabResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return {
        "id": result.id,
        "patient_id": result.patient_id,
        "test_type": result.test_type,
        "result_data": result.result_data,
        "result_summary": result.result_summary,
        "status": result.status,
        "has_file": bool(result.file_path),
        "date": result.created_at.isoformat(),
    }


@router.put("/results/{result_id}")
def update_result(result_id: int, req: LabResultUpdate, current_user: User = Depends(require_role("lab_tech")), db: Session = Depends(get_db)):
    result = db.query(LabResult).filter(LabResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    for field, value in req.dict(exclude_unset=True).items():
        setattr(result, field, value)
    db.commit()
    return {"message": "Result updated"}


@router.get("/patients")
def get_patients_for_lab(current_user: User = Depends(require_role("lab_tech")), db: Session = Depends(get_db)):
    # Build the dropdown from all patient users so lab techs can upload
    # results for every patient account in the system.
    patient_users = db.query(User).filter(User.role == "patient").order_by(User.name.asc()).all()
    patients = []

    for user in patient_users:
        profile = db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()
        if not profile:
            profile = PatientProfile(user_id=user.id)
            db.add(profile)
            db.flush()

        patients.append({
            "id": profile.id,
            "user_id": user.id,
            "name": user.name,
            "age": profile.age,
            "gender": profile.gender,
        })

    db.commit()
    return patients
