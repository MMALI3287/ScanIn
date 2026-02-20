import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from dotenv import load_dotenv

from database import get_db
from models import Admin
from schemas import LoginRequest, APIResponse

load_dotenv()

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET", "fallback_secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))


@router.post("/login", response_model=APIResponse)
async def login(body: LoginRequest, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.username == body.username).first()
    if not admin or not pwd_context.verify(body.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    token = jwt.encode({"sub": admin.username, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return APIResponse(success=True, data={"token": token}, message="Login successful")
