import os
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import KnowledgeCase, DoctorMessage, User, DoctorProfile, RiskAssessment, LabResult, Diagnosis, Appointment, TelemedicineSession, Notification, KnowledgeAssistantMessage
from auth import get_current_user, require_role
from chatbot_engine import train_chatbot, chat as medical_chat

router = APIRouter(prefix="/knowledge", tags=["Global Knowledge Hub"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "chat")
os.makedirs(UPLOAD_DIR, exist_ok=True)
_assistant_cache = {"trained_at": None, "facts": {}, "sample_notes": [], "corpus": [], "mode": "medical_chatbot"}


class KnowledgeCaseCreate(BaseModel):
    age_group: str
    risk_level: str
    symptoms: list = []
    diagnosis_outcome: str
    treatment_type: str
    treatment_outcome: str
    hospital: str = "Anonymous Hospital"
    region: str = "Unknown"
    anonymized_notes: Optional[str] = None


class ChatMessageCreate(BaseModel):
    topic: str
    message: str


class AssistantChatRequest(BaseModel):
    message: str


def train_assistant_model(db: Session):
    risk_total = db.query(RiskAssessment).count()
    lab_total = db.query(LabResult).count()
    diagnosis_total = db.query(Diagnosis).count()
    appointment_total = db.query(Appointment).count()
    tele_total = db.query(TelemedicineSession).count()
    notif_total = db.query(Notification).count()

    high_risk = db.query(RiskAssessment).filter(RiskAssessment.risk_level == "High").count()
    completed_labs = db.query(LabResult).filter(LabResult.status == "completed").count()
    positive_diag = db.query(Diagnosis).filter(Diagnosis.status == "positive").count()
    active_tele = db.query(TelemedicineSession).filter(TelemedicineSession.status == "active").count()

    notes = db.query(KnowledgeCase.anonymized_notes).order_by(KnowledgeCase.created_at.desc()).limit(8).all()
    sample_notes = [n[0] for n in notes if n and n[0]]
    corpus = []

    for c in db.query(KnowledgeCase).order_by(KnowledgeCase.created_at.desc()).limit(300).all():
        text = f"Knowledge case: risk {c.risk_level}, outcome {c.diagnosis_outcome}, treatment {c.treatment_type}, region {c.region}. Notes: {c.anonymized_notes or ''}"
        corpus.append({"text": text, "source": "knowledge_cases"})

    for d in db.query(Diagnosis).order_by(Diagnosis.created_at.desc()).limit(300).all():
        text = f"Diagnosis record: status {d.status}, stage {d.stage or 'n/a'}. Clinical notes: {d.clinical_notes or ''}. Care plan: {d.care_plan or ''}"
        corpus.append({"text": text, "source": "diagnoses"})

    for l in db.query(LabResult).order_by(LabResult.created_at.desc()).limit(300).all():
        text = f"Lab result: test {l.test_type}, status {l.status}, summary: {l.result_summary or ''}"
        corpus.append({"text": text, "source": "lab_results"})

    for a in db.query(Appointment).order_by(Appointment.created_at.desc()).limit(300).all():
        text = f"Appointment: type {a.appointment_type}, status {a.status}, location {a.location or ''}, notes {a.notes or ''}"
        corpus.append({"text": text, "source": "appointments"})

    for t in db.query(TelemedicineSession).order_by(TelemedicineSession.created_at.desc()).limit(200).all():
        text = f"Telemedicine session: status {t.status}, notes {t.consultation_notes or ''}, prescription {t.prescription or ''}"
        corpus.append({"text": text, "source": "telemedicine_sessions"})

    for n in db.query(Notification).order_by(Notification.created_at.desc()).limit(300).all():
        text = f"Notification: type {n.type}, title {n.title or ''}, message {n.message or ''}, priority {n.priority}"
        corpus.append({"text": text, "source": "notifications"})

    _assistant_cache["facts"] = {
        "risk_assessments": risk_total,
        "high_risk_assessments": high_risk,
        "lab_results": lab_total,
        "completed_lab_results": completed_labs,
        "diagnoses": diagnosis_total,
        "positive_diagnoses": positive_diag,
        "appointments": appointment_total,
        "telemedicine_sessions": tele_total,
        "active_telemedicine_sessions": active_tele,
        "notifications": notif_total,
        "knowledge_cases": db.query(KnowledgeCase).count(),
    }
    _assistant_cache["sample_notes"] = sample_notes
    _assistant_cache["corpus"] = corpus
    ml = train_chatbot()
    from datetime import datetime
    _assistant_cache["trained_at"] = datetime.utcnow().isoformat()
    _assistant_cache["ml_chunks"] = ml.get("chunks", 0)
    return _assistant_cache


def _tokenize(text: str):
    return [t for t in re.split(r"[^a-zA-Z0-9]+", text.lower()) if len(t) > 2]


def _retrieve_context(message: str, top_k: int = 3):
    msg_tokens = set(_tokenize(message))
    scored = []
    for c in _assistant_cache.get("corpus", []):
        tokens = set(_tokenize(c["text"]))
        if not tokens:
            continue
        overlap = len(msg_tokens.intersection(tokens))
        if overlap > 0:
            scored.append((overlap, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [x[1] for x in scored[:top_k]]


def answer_with_facts(message: str, role: str = "user", recent_context: str = ""):
    msg = message.lower()
    facts = _assistant_cache.get("facts", {})
    if not facts:
        return {
            "answer": "I am not trained yet. Please run training first.",
            "sources": ["knowledge_cases", "risk_assessments", "lab_results", "diagnoses", "appointments", "telemedicine_sessions"],
        }

    if any(x in msg for x in ["hello", "hi", "hey", "good morning", "good evening"]):
        return {
            "answer": f"Hello! I am your BreastGuard AI assistant. I can chat generally and also help with platform data, workflows, and clinical-support summaries for your {role} role.",
            "sources": ["assistant_policy"],
        }

    if "who are you" in msg or "what can you do" in msg:
        return {
            "answer": "I am a conversational healthcare-platform assistant. I can discuss your workflows, summarize system data, explain features, and answer open questions. For medical decisions, always confirm with a qualified clinician.",
            "sources": ["assistant_policy"],
        }

    if "risk" in msg:
        return {
            "answer": f"Current dataset has {facts['risk_assessments']} risk assessments, with {facts['high_risk_assessments']} high-risk cases requiring close follow-up.",
            "sources": ["risk_assessments"],
        }
    if "lab" in msg:
        return {
            "answer": f"We have {facts['lab_results']} lab results in total, and {facts['completed_lab_results']} are completed.",
            "sources": ["lab_results"],
        }
    if "diagnos" in msg:
        return {
            "answer": f"There are {facts['diagnoses']} diagnoses recorded, including {facts['positive_diagnoses']} positive diagnoses.",
            "sources": ["diagnoses"],
        }
    if "appoint" in msg:
        return {
            "answer": f"Appointments tracked: {facts['appointments']}. Telemedicine sessions tracked: {facts['telemedicine_sessions']}.",
            "sources": ["appointments", "telemedicine_sessions"],
        }
    if "telemedicine" in msg or "video" in msg:
        return {
            "answer": f"Telemedicine sessions total: {facts['telemedicine_sessions']}, currently active: {facts['active_telemedicine_sessions']}.",
            "sources": ["telemedicine_sessions"],
        }
    if "notification" in msg:
        return {
            "answer": f"Total notifications generated by workflows: {facts['notifications']}.",
            "sources": ["notifications"],
        }
    if "case" in msg or "knowledge" in msg:
        return {
            "answer": f"Knowledge base currently contains {facts['knowledge_cases']} anonymized cases for learning and collaboration.",
            "sources": ["knowledge_cases"],
        }

    retrieved = _retrieve_context(message)
    if retrieved:
        context_lines = " ".join([c["text"][:180] for c in retrieved])
        context_hint = f" Based on available records: {context_lines}"
        if recent_context:
            context_hint += f" Also considering your recent chat context: {recent_context[:180]}."
        return {
            "answer": (
                "Great question. "
                + context_hint
                + " If you want, I can refine this into actionable next steps for patient care, operations, or admin monitoring."
            ),
            "sources": list({c["source"] for c in retrieved}),
        }

    if recent_context:
        return {
            "answer": (
                f"From our recent conversation, I understand context around: {recent_context[:220]}. "
                "Could you clarify the exact outcome you want so I can give a precise answer?"
            ),
            "sources": ["assistant_history"],
        }

    return {
        "answer": "I can chat with you on any topic related to this platform, healthcare workflows, and general guidance. Tell me what you want to discuss and I will help step-by-step.",
        "sources": ["assistant_policy"],
    }


# ========== KNOWLEDGE CASES ==========

@router.get("/cases")
def get_knowledge_cases(region: Optional[str] = None, risk_level: Optional[str] = None,
                        current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(KnowledgeCase)
    if region:
        query = query.filter(KnowledgeCase.region == region)
    if risk_level:
        query = query.filter(KnowledgeCase.risk_level == risk_level)
    cases = query.order_by(KnowledgeCase.created_at.desc()).limit(100).all()
    return [{
        "id": c.id,
        "age_group": c.age_group,
        "risk_level": c.risk_level,
        "symptoms": c.symptoms,
        "diagnosis_outcome": c.diagnosis_outcome,
        "treatment_type": c.treatment_type,
        "treatment_outcome": c.treatment_outcome,
        "hospital": c.hospital,
        "region": c.region,
        "notes": c.anonymized_notes,
        "date": c.created_at.isoformat(),
    } for c in cases]


@router.post("/cases")
def submit_case(req: KnowledgeCaseCreate, current_user=Depends(require_role("doctor")), db: Session = Depends(get_db)):
    case = KnowledgeCase(**req.dict())
    db.add(case)
    db.commit()
    db.refresh(case)
    return {"message": "Case submitted to knowledge hub", "id": case.id}


@router.get("/stats")
def knowledge_stats(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    total = db.query(KnowledgeCase).count()
    by_outcome = {}
    for outcome in ["positive", "negative", "inconclusive"]:
        by_outcome[outcome] = db.query(KnowledgeCase).filter(KnowledgeCase.diagnosis_outcome == outcome).count()
    by_risk = {}
    for risk in ["Low", "Medium", "High"]:
        by_risk[risk] = db.query(KnowledgeCase).filter(KnowledgeCase.risk_level == risk).count()
    by_treatment = {}
    for t in ["chemotherapy", "surgery", "radiation", "hormonal_therapy"]:
        by_treatment[t] = db.query(KnowledgeCase).filter(KnowledgeCase.treatment_type == t).count()

    return {
        "total_cases": total,
        "by_outcome": by_outcome,
        "by_risk_level": by_risk,
        "by_treatment": by_treatment,
    }


@router.post("/seed")
def seed_knowledge_data(count: int = 50, current_user=Depends(require_role("doctor")), db: Session = Depends(get_db)):
    """Seed demo knowledge data."""
    import random
    age_groups = ["20-30", "30-40", "40-50", "50-60", "60-70", "70+"]
    risk_levels = ["Low", "Medium", "High"]
    outcomes = ["positive", "negative", "negative", "negative", "inconclusive"]
    treatments = ["chemotherapy", "surgery", "radiation", "hormonal_therapy", "observation"]
    treatment_outcomes = ["remission", "ongoing", "completed", "improved"]
    hospitals = ["City General Hospital", "Regional Cancer Center", "University Medical Center",
                 "St. Mary's Hospital", "National Oncology Institute"]
    regions = ["East Africa", "West Africa", "South Asia", "Southeast Asia", "Latin America", "Europe"]
    symptom_pool = ["lump", "pain", "discharge", "skin changes", "fatigue", "swelling"]

    for _ in range(count):
        case = KnowledgeCase(
            age_group=random.choice(age_groups),
            risk_level=random.choice(risk_levels),
            symptoms=random.sample(symptom_pool, random.randint(1, 3)),
            diagnosis_outcome=random.choice(outcomes),
            treatment_type=random.choice(treatments),
            treatment_outcome=random.choice(treatment_outcomes),
            hospital=random.choice(hospitals),
            region=random.choice(regions),
            anonymized_notes=f"Anonymized case data for research purposes.",
        )
        db.add(case)
    db.commit()
    return {"message": f"Seeded {count} knowledge cases"}


@router.post("/assistant/train")
def train_assistant(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    trained = train_assistant_model(db)
    return {
        "message": "Knowledge assistant trained from available system data",
        "trained_at": trained["trained_at"],
        "facts": trained["facts"],
    }


@router.post("/assistant/chat")
def assistant_chat(req: AssistantChatRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not _assistant_cache.get("trained_at"):
        train_assistant_model(db)
    history_rows = db.query(KnowledgeAssistantMessage).filter(KnowledgeAssistantMessage.user_id == current_user.id).order_by(KnowledgeAssistantMessage.created_at.desc()).limit(3).all()
    response = medical_chat(req.message, recent_messages=[{"question": h.question, "answer": h.answer} for h in history_rows])

    row = KnowledgeAssistantMessage(
        user_id=current_user.id,
        question=req.message,
        answer=response["answer"],
        sources=response["sources"],
    )
    db.add(row)
    db.commit()

    return {
        "answer": response["answer"],
        "sources": response["sources"],
        "trained_at": _assistant_cache.get("trained_at"),
        "disclaimer": "Assistant responses are for education and support and do not replace professional medical diagnosis or treatment advice.",
    }


@router.get("/assistant/history")
def assistant_history(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(KnowledgeAssistantMessage).filter(KnowledgeAssistantMessage.user_id == current_user.id).order_by(KnowledgeAssistantMessage.created_at.desc()).limit(20).all()
    return [
        {
            "id": r.id,
            "question": r.question,
            "answer": r.answer,
            "sources": r.sources or [],
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


# ========== DOCTOR CHAT / COLLABORATION ==========

@router.get("/chat")
def get_chat_messages(topic: Optional[str] = None,
                      current_user=Depends(require_role("doctor")), db: Session = Depends(get_db)):
    """Get chat messages for cross-hospital doctor collaboration."""
    query = db.query(DoctorMessage)
    if topic:
        query = query.filter(DoctorMessage.topic == topic)
    messages = query.order_by(DoctorMessage.created_at.desc()).limit(100).all()
    return [{
        "id": m.id,
        "sender_id": m.sender_id,
        "sender_name": m.sender.name if m.sender else "Unknown",
        "sender_hospital": m.sender.doctor_profile.hospital if m.sender and m.sender.doctor_profile else "",
        "sender_specialization": m.sender.doctor_profile.specialization if m.sender and m.sender.doctor_profile else "",
        "topic": m.topic,
        "message": m.message,
        "attachment_name": m.attachment_name,
        "attachment_path": f"/knowledge/chat/attachments/{m.id}" if m.attachment_path else None,
        "created_at": m.created_at.isoformat(),
    } for m in messages]


@router.post("/chat")
def send_chat_message(req: ChatMessageCreate,
                      current_user=Depends(require_role("doctor")), db: Session = Depends(get_db)):
    """Send a text message to the doctor collaboration chat."""
    msg = DoctorMessage(
        sender_id=current_user.id,
        topic=req.topic,
        message=req.message,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {
        "message": "Message sent",
        "id": msg.id,
        "sender_name": current_user.name,
        "sender_hospital": current_user.doctor_profile.hospital if current_user.doctor_profile else "",
    }


@router.post("/chat/with-attachment")
async def send_chat_with_attachment(
    topic: str = Form(...),
    message: str = Form(...),
    file: UploadFile = File(...),
    current_user=Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    """Send a chat message with an attached file."""
    import uuid
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    safe_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    msg = DoctorMessage(
        sender_id=current_user.id,
        topic=topic,
        message=message,
        attachment_path=file_path,
        attachment_name=file.filename,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"message": "Message with attachment sent", "id": msg.id}


@router.get("/chat/attachments/{message_id}")
def download_chat_attachment(message_id: int,
                             current_user=Depends(require_role("doctor")), db: Session = Depends(get_db)):
    """Download a chat attachment."""
    from fastapi.responses import FileResponse
    msg = db.query(DoctorMessage).filter(DoctorMessage.id == message_id).first()
    if not msg or not msg.attachment_path:
        raise HTTPException(status_code=404, detail="Attachment not found")
    if not os.path.exists(msg.attachment_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(msg.attachment_path, filename=msg.attachment_name or "attachment")


@router.get("/chat/topics")
def get_chat_topics(current_user=Depends(require_role("doctor")), db: Session = Depends(get_db)):
    """Get list of unique chat topics."""
    topics = db.query(DoctorMessage.topic).distinct().all()
    return [t[0] for t in topics if t[0]]


@router.get("/chat/doctors-online")
def get_collaborating_doctors(current_user=Depends(require_role("doctor")), db: Session = Depends(get_db)):
    """Get list of doctors who have participated in the chat."""
    doctors = db.query(User).join(DoctorProfile).filter(User.role == "doctor").all()
    return [{
        "id": d.id,
        "name": d.name,
        "hospital": d.doctor_profile.hospital if d.doctor_profile else "",
        "specialization": d.doctor_profile.specialization if d.doctor_profile else "",
    } for d in doctors]
