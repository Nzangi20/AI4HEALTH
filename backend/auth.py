from datetime import datetime, timedelta
from typing import Optional
import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
import hashlib
import secrets
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import User, PatientProfile, DoctorProfile

router = APIRouter(prefix="/auth", tags=["Authentication"])

SECRET_KEY = os.getenv("SECRET_KEY", "breastguard-ai-secret-key-change-in-production-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@breastguard.local")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@12345")
ADMIN_NAME = os.getenv("ADMIN_NAME", "System Admin")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# --- Schemas ---
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str
    phone: Optional[str] = None
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    hospital: Optional[str] = None
    location: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    phone: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str


# --- Utils ---
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${hashed}"


def verify_password(plain: str, stored: str) -> bool:
    try:
        salt, hashed = stored.split("$", 1)
        return hashlib.sha256((salt + plain).encode()).hexdigest() == hashed
    except Exception:
        return False


def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def require_role(*roles):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(roles)}"
            )
        return current_user
    return role_checker


# --- Routes ---
@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if req.role not in ("patient", "doctor", "lab_tech"):
        raise HTTPException(status_code=400, detail="Invalid role")

    user = User(
        name=req.name,
        email=req.email,
        password_hash=hash_password(req.password),
        role=req.role,
        phone=req.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if req.role == "patient":
        profile = PatientProfile(user_id=user.id)
        db.add(profile)
    elif req.role == "doctor":
        profile = DoctorProfile(
            user_id=user.id,
            specialization=req.specialization or "Oncology",
            license_number=req.license_number or "",
            hospital=req.hospital or "",
            location=req.location or "",
        )
        db.add(profile)
    db.commit()

    token = create_token({"user_id": user.id, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={"id": user.id, "name": user.name, "email": user.email, "role": user.role}
    )


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Admin is login-only and uses explicit configured credentials.
    if form_data.username == ADMIN_EMAIL and form_data.password == ADMIN_PASSWORD:
        admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not admin:
            admin = User(
                name=ADMIN_NAME,
                email=ADMIN_EMAIL,
                password_hash=hash_password(ADMIN_PASSWORD),
                role="admin",
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
        elif admin.role != "admin":
            raise HTTPException(status_code=403, detail="Configured admin email belongs to a non-admin user")

        token = create_token({"user_id": admin.id, "role": admin.role})
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user={"id": admin.id, "name": admin.name, "email": admin.email, "role": admin.role}
        )

    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token({"user_id": user.id, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={"id": user.id, "name": user.name, "email": user.email, "role": user.role}
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        phone=current_user.phone,
    )


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(req.new_password or "") < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user found with this email")

    user.password_hash = hash_password(req.new_password)
    db.commit()
    return {"message": "Password reset successful. You can now sign in with your new password."}
