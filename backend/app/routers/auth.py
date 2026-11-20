from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Staff
from ..security import create_access_token, get_current_staff, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


def user_info(staff: Staff) -> dict:
    return {
        "staffID": staff.staffID,
        "staffName": staff.staffName,
        "schoolEmail": staff.schoolEmail,
        "staffRole": staff.staffRole,
    }


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    staff = db.scalar(select(Staff).where(Staff.schoolEmail == data.email.strip()))
    if staff is None or not verify_password(data.password, staff.password):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return {"token": create_access_token(staff), "user": user_info(staff)}


@router.get("/me")
def me(staff: Staff = Depends(get_current_staff)):
    """Handy for testing that a token works."""
    return user_info(staff)
