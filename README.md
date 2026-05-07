# BreastGuard AI 🎗️

An End-to-End Intelligent Breast Cancer Detection & Care Management System. BreastGuard AI bridges patients, doctors, and lab technicians with AI-powered risk assessment, telemedicine, and unified health records.

## 🚀 Key Features

- **🤖 AI Risk Engine** — Machine learning model predicting breast cancer risk from symptoms, family history, and patient data
- **👥 Multi-Role Dashboards** — Dedicated portals for Patients, Doctors, Lab Technicians, and Admins
- **🩺 Telemedicine** — Online consultation sessions between patients and doctors
- **📅 Smart Scheduler** — Appointment booking, tracking, and reminders
- **🔬 Lab Integration** — Lab technicians upload mammogram, biopsy, and blood test results
- **📊 Unified Patient Records** — Centralized medical history, vitals, lab results, and treatment progress
- **🔔 Notifications** — Real-time alerts for diagnoses, lab results, and appointments
- **💬 Knowledge Hub** — AI chatbot assistant and doctor collaboration forum
- **📱 Low-Cost Access Layer** — Designed for accessibility in resource-limited settings

## 💻 Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Backend    | Python, FastAPI, SQLAlchemy, Scikit-Learn    |
| Frontend   | React 19, Vite, Recharts                    |
| Database   | SQLite (dev) / PostgreSQL (production)       |
| Auth       | JWT with Role-Based Access Control           |

## 🛠️ Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
The API will be available at `http://localhost:8000`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:5173`

## 🔐 Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable          | Description                            | Default                          |
|-------------------|----------------------------------------|----------------------------------|
| `DATABASE_URL`    | Database connection string             | `sqlite:///./breastguard.db`     |
| `SECRET_KEY`      | JWT signing secret                     | *(change in production)*         |
| `ADMIN_EMAIL`     | Admin login email                      | `admin@breastguard.local`        |
| `ADMIN_PASSWORD`  | Admin login password                   | *(change in production)*         |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins           | `*`                              |

## ⚠️ Disclaimer

This system is designed to support clinical decisions. It does **not** replace professional medical diagnosis or treatment by qualified healthcare providers.
