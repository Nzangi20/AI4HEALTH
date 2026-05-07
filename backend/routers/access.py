from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/access", tags=["Low-Cost Access Layer"])


class SMSRequest(BaseModel):
    phone_number: str
    message: str


class USSDRequest(BaseModel):
    phone_number: str
    session_id: str
    service_code: str
    text: str  # User input like "1*2*3"


@router.post("/sms/send")
def simulate_sms(req: SMSRequest):
    """Simulate sending an SMS notification."""
    return {
        "status": "sent",
        "channel": "SMS",
        "to": req.phone_number,
        "message": req.message,
        "note": "This is a simulated SMS. In production, integrate with Twilio/Africa's Talking."
    }


@router.post("/ussd")
def simulate_ussd(req: USSDRequest):
    """Simulate USSD interaction for low-resource environments."""
    text_parts = req.text.split("*") if req.text else []
    depth = len(text_parts)

    if depth == 0:
        response = (
            "CON Welcome to BreastGuard AI\n"
            "1. Check Risk Status\n"
            "2. Upcoming Appointments\n"
            "3. Contact Doctor\n"
            "4. Emergency Helpline"
        )
    elif depth == 1:
        choice = text_parts[0]
        if choice == "1":
            response = (
                "END Your latest risk assessment:\n"
                "Risk Level: Medium\n"
                "Score: 65%\n"
                "Next screening: April 15, 2026\n"
                "Call 0800-BREAST for questions."
            )
        elif choice == "2":
            response = (
                "END Upcoming Appointments:\n"
                "1. Follow-up - Apr 10, 9AM\n"
                "2. Chemotherapy - Apr 24, 10AM\n"
                "Reply 1 to confirm or call clinic."
            )
        elif choice == "3":
            response = (
                "CON Select contact method:\n"
                "1. Request callback\n"
                "2. Send message to doctor\n"
                "3. Schedule telemedicine"
            )
        elif choice == "4":
            response = (
                "END Emergency Helpline:\n"
                "National Cancer Helpline: 0800-723-253\n"
                "Ambulance: 999\n"
                "Your assigned doctor: Dr. Smith - 0712-345-678"
            )
        else:
            response = "END Invalid option. Please dial again."
    elif depth == 2 and text_parts[0] == "3":
        response = (
            "END Your request has been submitted.\n"
            "A healthcare worker will contact you within 24 hours.\n"
            "For emergencies, call 999."
        )
    else:
        response = "END Thank you for using BreastGuard AI."

    return {
        "session_id": req.session_id,
        "phone_number": req.phone_number,
        "response": response,
        "note": "Simulated USSD. In production, integrate with Africa's Talking USSD gateway."
    }


@router.get("/accessibility-info")
def accessibility_info():
    """Information about low-cost access options."""
    return {
        "sms_shortcode": "*384*BREAST#",
        "ussd_code": "*384#",
        "toll_free": "0800-723-253",
        "whatsapp": "+254-700-BREAST",
        "languages": ["English", "Swahili", "French", "Arabic"],
        "features": [
            "SMS risk status check",
            "USSD appointment management",
            "Voice-based symptom reporting",
            "Toll-free helpline",
            "WhatsApp chatbot support"
        ],
        "note": "All low-cost features are simulated for demonstration. Production deployment requires telecom partnerships."
    }
