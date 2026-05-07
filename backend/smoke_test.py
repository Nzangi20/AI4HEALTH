import time
from datetime import UTC, datetime, timedelta

import requests


BASE_URL = "http://127.0.0.1:8000"


def assert_ok(resp, label):
    if resp.status_code >= 400:
        raise RuntimeError(f"{label} failed ({resp.status_code}): {resp.text}")
    return resp.json() if resp.text else {}


def register_user(payload):
    resp = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=20)
    if resp.status_code == 400 and "already registered" in resp.text.lower():
        login = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": payload["email"], "password": payload["password"]},
            timeout=20,
        )
        data = assert_ok(login, f"login {payload['role']}")
        return data["access_token"], data["user"]

    data = assert_ok(resp, f"register {payload['role']}")
    return data["access_token"], data["user"]


def headers(token):
    return {"Authorization": f"Bearer {token}"}


def main():
    ts = int(time.time())
    patient_email = f"smoke_patient_{ts}@mail.test"
    doctor_email = f"smoke_doctor_{ts}@mail.test"
    lab_email = f"smoke_lab_{ts}@mail.test"
    admin_email = "admin@breastguard.local"

    patient_token, patient_user = register_user(
        {"name": "Smoke Patient", "email": patient_email, "password": "Pass12345!", "role": "patient"}
    )
    doctor_token, doctor_user = register_user(
        {
            "name": "Smoke Doctor",
            "email": doctor_email,
            "password": "Pass12345!",
            "role": "doctor",
            "specialization": "Oncology",
            "license_number": "SMK-001",
            "hospital": "City General",
            "location": "Nairobi",
        }
    )
    lab_token, lab_user = register_user(
        {"name": "Smoke Lab", "email": lab_email, "password": "Pass12345!", "role": "lab_tech"}
    )
    admin_login = assert_ok(
        requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": admin_email, "password": "Admin@12345"},
            timeout=20,
        ),
        "login admin",
    )
    admin_token, admin_user = admin_login["access_token"], admin_login["user"]

    patient_profile = assert_ok(
        requests.get(f"{BASE_URL}/patients/profile", headers=headers(patient_token), timeout=20),
        "patient profile",
    )
    patient_id = patient_profile["id"]

    # Patient tabs
    assert_ok(
        requests.put(
            f"{BASE_URL}/patients/profile",
            headers=headers(patient_token),
            json={"age": 42, "gender": "female", "blood_type": "O+", "medical_history": "none"},
            timeout=20,
        ),
        "update patient profile",
    )
    assert_ok(
        requests.post(
            f"{BASE_URL}/patients/risk-assessment",
            headers=headers(patient_token),
            json={"age": 42, "symptoms": ["lump"], "family_history": True},
            timeout=20,
        ),
        "risk assessment",
    )
    assert_ok(requests.get(f"{BASE_URL}/patients/dashboard", headers=headers(patient_token), timeout=20), "patient dashboard")
    assert_ok(requests.get(f"{BASE_URL}/patients/risk-assessments", headers=headers(patient_token), timeout=20), "risk list")
    assert_ok(
        requests.post(
            f"{BASE_URL}/monitoring/vitals",
            headers=headers(patient_token),
            json={"heart_rate": 78, "blood_pressure_systolic": 118, "blood_pressure_diastolic": 77},
            timeout=20,
        ),
        "record vitals",
    )
    assert_ok(requests.get(f"{BASE_URL}/monitoring/vitals", headers=headers(patient_token), timeout=20), "get vitals")
    assert_ok(requests.get(f"{BASE_URL}/monitoring/treatment-progress", headers=headers(patient_token), timeout=20), "patient treatment progress")

    appt_time = (datetime.now(UTC) + timedelta(days=2)).replace(microsecond=0).isoformat()
    assert_ok(
        requests.post(
            f"{BASE_URL}/scheduler/appointments",
            headers=headers(patient_token),
            json={"appointment_type": "consultation", "scheduled_at": appt_time, "duration_minutes": 30},
            timeout=20,
        ),
        "create appointment",
    )
    appts = assert_ok(requests.get(f"{BASE_URL}/scheduler/appointments", headers=headers(patient_token), timeout=20), "patient appointments")

    tele_time = (datetime.now(UTC) + timedelta(days=1)).replace(microsecond=0).isoformat()
    tele_participants = assert_ok(
        requests.get(f"{BASE_URL}/telemedicine/participants", headers=headers(patient_token), timeout=20),
        "telemedicine participants (patient)",
    )
    doctor_choice = doctor_user["id"]
    tele = assert_ok(
        requests.post(
            f"{BASE_URL}/telemedicine/sessions",
            headers=headers(patient_token),
            json={"scheduled_at": tele_time, "doctor_id": doctor_choice},
            timeout=20,
        ),
        "create telemedicine",
    )
    tele_id = tele["session_id"]
    assert_ok(requests.get(f"{BASE_URL}/telemedicine/sessions", headers=headers(patient_token), timeout=20), "patient tele list")

    # Lab tabs
    assert_ok(requests.get(f"{BASE_URL}/lab/dashboard", headers=headers(lab_token), timeout=20), "lab dashboard")
    assert_ok(requests.get(f"{BASE_URL}/lab/patients", headers=headers(lab_token), timeout=20), "lab patients")
    lab_result = assert_ok(
        requests.post(
            f"{BASE_URL}/lab/results",
            headers=headers(lab_token),
            json={"patient_id": patient_id, "test_type": "mammogram", "result_data": {"birads": 2}, "result_summary": "Benign findings"},
            timeout=20,
        ),
        "create lab result",
    )
    assert_ok(requests.get(f"{BASE_URL}/lab/results", headers=headers(lab_token), timeout=20), "lab results list")

    # Doctor tabs
    assert_ok(requests.get(f"{BASE_URL}/doctors/dashboard", headers=headers(doctor_token), timeout=20), "doctor dashboard")
    patients = assert_ok(requests.get(f"{BASE_URL}/doctors/patients", headers=headers(doctor_token), timeout=20), "doctor patients")
    assert any(p["id"] == patient_id for p in patients), "patient missing in doctor list"
    assert_ok(requests.get(f"{BASE_URL}/doctors/patients/{patient_id}", headers=headers(doctor_token), timeout=20), "doctor patient detail")
    assert_ok(
        requests.post(
            f"{BASE_URL}/doctors/diagnose",
            headers=headers(doctor_token),
            json={
                "patient_id": patient_id,
                "status": "negative",
                "clinical_notes": "No suspicious findings",
                "care_plan": "Continue routine screening",
            },
            timeout=20,
        ),
        "doctor diagnosis",
    )
    assert_ok(requests.get(f"{BASE_URL}/knowledge/stats", headers=headers(doctor_token), timeout=20), "knowledge stats")
    assert_ok(requests.get(f"{BASE_URL}/knowledge/cases", headers=headers(doctor_token), timeout=20), "knowledge cases")
    assert_ok(requests.post(f"{BASE_URL}/knowledge/assistant/train", headers=headers(doctor_token), timeout=20), "assistant train")
    assert_ok(
        requests.post(
            f"{BASE_URL}/knowledge/assistant/chat",
            headers=headers(doctor_token),
            json={"message": "What are common warning signs of breast cancer?"},
            timeout=20,
        ),
        "assistant chat",
    )
    assert_ok(requests.get(f"{BASE_URL}/knowledge/assistant/history", headers=headers(doctor_token), timeout=20), "assistant history")
    assert_ok(
        requests.post(
            f"{BASE_URL}/knowledge/chat",
            headers=headers(doctor_token),
            json={"topic": "General Discussion", "message": "Smoke test collaboration message"},
            timeout=20,
        ),
        "chat message",
    )
    assert_ok(requests.get(f"{BASE_URL}/knowledge/chat", headers=headers(doctor_token), timeout=20), "chat list")
    assert_ok(requests.get(f"{BASE_URL}/knowledge/chat/topics", headers=headers(doctor_token), timeout=20), "chat topics")
    assert_ok(
        requests.get(f"{BASE_URL}/knowledge/chat/doctors-online", headers=headers(doctor_token), timeout=20),
        "chat doctors online",
    )

    # Shared tabs
    assert_ok(requests.get(f"{BASE_URL}/notifications/", headers=headers(patient_token), timeout=20), "patient notifications")
    unread = assert_ok(requests.get(f"{BASE_URL}/notifications/unread-count", headers=headers(patient_token), timeout=20), "unread count")
    if unread.get("unread_count", 0) > 0:
        assert_ok(requests.put(f"{BASE_URL}/notifications/mark-all-read", headers=headers(patient_token), timeout=20), "mark all read")

    assert_ok(requests.get(f"{BASE_URL}/records/{patient_id}", headers=headers(patient_token), timeout=20), "records full")
    assert_ok(requests.get(f"{BASE_URL}/records/summary/{patient_id}", headers=headers(patient_token), timeout=20), "records summary")
    assert_ok(requests.get(f"{BASE_URL}/access/accessibility-info", headers=headers(patient_token), timeout=20), "accessibility info")

    if appts:
        first_appt_id = appts[0]["id"]
        assert_ok(requests.put(f"{BASE_URL}/scheduler/appointments/{first_appt_id}/cancel", headers=headers(patient_token), timeout=20), "cancel appointment")

    assert_ok(requests.put(f"{BASE_URL}/telemedicine/sessions/{tele_id}/join", headers=headers(doctor_token), timeout=20), "join tele session")
    assert_ok(
        requests.put(
            f"{BASE_URL}/telemedicine/sessions/{tele_id}/end",
            headers=headers(doctor_token),
            json={"consultation_notes": "Patient stable", "prescription": "Routine follow-up"},
            timeout=20,
        ),
        "end tele session",
    )
    users = assert_ok(requests.get(f"{BASE_URL}/admin/users", headers=headers(admin_token), timeout=20), "admin users list")
    assert users, "admin users list is empty"
    assert_ok(requests.get(f"{BASE_URL}/admin/dashboard", headers=headers(admin_token), timeout=20), "admin dashboard")

    print("Smoke test passed for patient, doctor, and lab flows.")
    print(f"Users: patient={patient_user['email']} doctor={doctor_user['email']} lab={lab_user['email']} admin={admin_user['email']}")
    print(f"Created lab result id={lab_result['result_id']}")


if __name__ == "__main__":
    main()
