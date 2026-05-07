from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # patient, doctor, lab_tech
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False)
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False)


class PatientProfile(Base):
    __tablename__ = "patient_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    age = Column(Integer)
    gender = Column(String(10), default="female")
    blood_type = Column(String(5))
    allergies = Column(Text)
    medical_history = Column(Text)
    family_history = Column(Text)
    lifestyle = Column(Text)
    emergency_contact = Column(String(100))

    user = relationship("User", back_populates="patient_profile")
    risk_assessments = relationship("RiskAssessment", back_populates="patient")
    notifications = relationship("Notification", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")
    vitals = relationship("VitalRecord", back_populates="patient")
    treatments = relationship("TreatmentProgress", back_populates="patient")


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    specialization = Column(String(100))
    license_number = Column(String(50))
    hospital = Column(String(200))
    location = Column(String(200))
    availability = Column(String(50), default="available")  # available, busy, offline
    rating = Column(Float, default=4.5)
    experience_years = Column(Integer, default=5)

    user = relationship("User", back_populates="doctor_profile")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id"))
    risk_level = Column(String(10))  # Low, Medium, High
    probability = Column(Float)
    symptoms = Column(JSON)
    factors = Column(JSON)  # Contributing factors for explainability
    recommendations = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("PatientProfile", back_populates="risk_assessments")


class LabResult(Base):
    __tablename__ = "lab_results"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id"))
    technician_id = Column(Integer, ForeignKey("users.id"))
    test_type = Column(String(100))  # mammogram, biopsy, blood_test, ultrasound
    result_data = Column(JSON)
    result_summary = Column(Text)
    status = Column(String(20), default="pending")  # pending, completed, reviewed
    file_path = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("PatientProfile", foreign_keys=[patient_id])
    technician = relationship("User", foreign_keys=[technician_id])


class Diagnosis(Base):
    __tablename__ = "diagnoses"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id"))
    doctor_id = Column(Integer, ForeignKey("users.id"))
    risk_assessment_id = Column(Integer, ForeignKey("risk_assessments.id"), nullable=True)
    lab_result_id = Column(Integer, ForeignKey("lab_results.id"), nullable=True)
    status = Column(String(20))  # positive, negative, inconclusive, pending
    stage = Column(String(20), nullable=True)  # Stage 0-IV if positive
    clinical_notes = Column(Text)
    care_plan = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("PatientProfile", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])
    risk_assessment = relationship("RiskAssessment", foreign_keys=[risk_assessment_id])
    lab_result = relationship("LabResult", foreign_keys=[lab_result_id])


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id"))
    type = Column(String(30))  # diagnosis, appointment, reminder, care_plan, general
    title = Column(String(200))
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    priority = Column(String(10), default="normal")  # low, normal, high, urgent
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("PatientProfile", back_populates="notifications")


class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id"))
    doctor_id = Column(Integer, ForeignKey("users.id"))
    appointment_type = Column(String(50))  # screening, chemotherapy, surgery, follow_up, consultation
    scheduled_at = Column(DateTime)
    duration_minutes = Column(Integer, default=30)
    status = Column(String(20), default="scheduled")  # scheduled, completed, cancelled, missed, rescheduled
    location = Column(String(200))
    notes = Column(Text)
    reminder_sent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("PatientProfile", back_populates="appointments")
    doctor = relationship("User", foreign_keys=[doctor_id])


class VitalRecord(Base):
    __tablename__ = "vital_records"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id"))
    heart_rate = Column(Integer)
    blood_pressure_systolic = Column(Integer)
    blood_pressure_diastolic = Column(Integer)
    temperature = Column(Float)
    weight = Column(Float)
    oxygen_saturation = Column(Float)
    pain_level = Column(Integer)  # 0-10
    notes = Column(Text)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("PatientProfile", back_populates="vitals")


class TreatmentProgress(Base):
    __tablename__ = "treatment_progress"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id"))
    treatment_type = Column(String(50))  # chemotherapy, radiation, surgery, hormonal_therapy
    cycle_number = Column(Integer)
    total_cycles = Column(Integer)
    progress_pct = Column(Float)
    status = Column(String(20))  # in_progress, completed, paused, cancelled
    side_effects = Column(Text)
    notes = Column(Text)
    next_session = Column(DateTime, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("PatientProfile", back_populates="treatments")


class KnowledgeCase(Base):
    __tablename__ = "knowledge_cases"
    id = Column(Integer, primary_key=True, index=True)
    age_group = Column(String(20))
    risk_level = Column(String(10))
    symptoms = Column(JSON)
    diagnosis_outcome = Column(String(20))
    treatment_type = Column(String(50))
    treatment_outcome = Column(String(50))
    hospital = Column(String(200))
    region = Column(String(100))
    anonymized_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class TelemedicineSession(Base):
    __tablename__ = "telemedicine_sessions"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id"))
    doctor_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), default="scheduled")  # scheduled, active, completed, cancelled
    scheduled_at = Column(DateTime)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    consultation_notes = Column(Text)
    prescription = Column(Text)
    room_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("PatientProfile", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])


class DoctorMessage(Base):
    __tablename__ = "doctor_messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    topic = Column(String(200))
    message = Column(Text, nullable=False)
    attachment_path = Column(String(500), nullable=True)
    attachment_name = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User", foreign_keys=[sender_id])


class KnowledgeAssistantMessage(Base):
    __tablename__ = "knowledge_assistant_messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    sources = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
