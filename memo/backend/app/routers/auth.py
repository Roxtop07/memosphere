from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional

from ..database import get_session
from ..models import User
from ..utils import verify_password, get_password_hash, create_access_token, verify_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    org_id: str
    name: Optional[str] = None

@router.post("/register")
async def register(req: RegisterRequest, session: Session = Depends(get_session)):
    # Check existing
    statement = select(User).where(User.email == req.email)
    existing = session.exec(statement).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user = User(
        email=req.email,
        password_hash=get_password_hash(req.password),
        org_id=req.org_id,
        name=req.name
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    token = create_access_token(user.email, user.org_id)
    
    return {
        "token": token,
        "user": {"email": user.email, "name": user.name, "org_id": user.org_id},
        "org_id": user.org_id
    }

@router.post("/login")
async def login(req: LoginRequest, session: Session = Depends(get_session)):
    statement = select(User).where(User.email == req.email)
    user = session.exec(statement).first()
    
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(user.email, user.org_id)
    
    return {
        "token": token,
        "user": {"email": user.email, "name": user.name, "org_id": user.org_id},
        "org_id": user.org_id
    }

@router.post("/refresh")
async def refresh_token(payload: dict = Depends(verify_token)):
    token = create_access_token(payload["email"], payload["org_id"])
    return {"token": token}
