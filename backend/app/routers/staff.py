import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Staff
from ..security import require_roles
from .auth import user_info

router = APIRouter(prefix="/api/staff", tags=["staff"])

ROLES = ("Admin", "Security")
MIN_PASSWORD = 6
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class NewStaff(BaseModel):
    staffName: str
    schoolEmail: str
    staffRole: str
    password: str


class StaffUpdate(BaseModel):
    staffName: str
    schoolEmail: str
    staffRole: str
    password: str | None = None  # empty or missing keeps the current password


def check_details(name: str, email: str, role: str) -> tuple[str, str]:
    name = name.strip()
    email = email.strip().lower()
    if not name or not email:
        raise HTTPException(status_code=400, detail="Please fill in all the fields.")
    if not EMAIL_PATTERN.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if role not in ROLES:
        raise HTTPException(status_code=400, detail="Choose a valid role.")
    return name, email


def check_password(password: str) -> None:
    if len(password) < MIN_PASSWORD:
        raise HTTPException(status_code=400, detail=f"The password must be at least {MIN_PASSWORD} characters.")


@router.get("")
def list_staff(db: Session = Depends(get_db), _staff=Depends(require_roles("Admin"))):
    """All staff accounts. Passwords are never sent back."""
    rows = db.scalars(select(Staff).order_by(Staff.staffRole, Staff.staffName)).all()
    return [user_info(s) for s in rows]


@router.post("", status_code=201)
def add_staff(data: NewStaff, db: Session = Depends(get_db), _staff=Depends(require_roles("Admin"))):
    name, email = check_details(data.staffName, data.schoolEmail, data.staffRole)
    if not data.password:
        raise HTTPException(status_code=400, detail="Please fill in all the fields.")
    check_password(data.password)
    if db.scalar(select(Staff).where(Staff.schoolEmail == email)) is not None:
        raise HTTPException(status_code=409, detail="A staff account with this email already exists.")

    staff = Staff(staffName=name, schoolEmail=email, staffRole=data.staffRole, password=data.password)
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return user_info(staff)


@router.put("/{staff_id}")
def update_staff(
    staff_id: int,
    data: StaffUpdate,
    db: Session = Depends(get_db),
    _staff=Depends(require_roles("Admin")),
):
    staff = db.get(Staff, staff_id)
    if staff is None:
        raise HTTPException(status_code=404, detail="Staff account not found.")

    name, email = check_details(data.staffName, data.schoolEmail, data.staffRole)
    taken = db.scalar(select(Staff).where(Staff.schoolEmail == email, Staff.staffID != staff_id))
    if taken is not None:
        raise HTTPException(status_code=409, detail="A staff account with this email already exists.")

    # Never allow the last Admin to be turned into a different role
    if staff.staffRole == "Admin" and data.staffRole != "Admin":
        admins = db.scalar(select(func.count()).select_from(Staff).where(Staff.staffRole == "Admin"))
        if admins <= 1:
            raise HTTPException(status_code=400, detail="At least one Admin account must remain.")

    if data.password:
        check_password(data.password)
        staff.password = data.password

    staff.staffName = name
    staff.schoolEmail = email
    staff.staffRole = data.staffRole
    db.commit()
    return user_info(staff)


@router.delete("/{staff_id}")
def delete_staff(staff_id: int, db: Session = Depends(get_db), current=Depends(require_roles("Admin"))):
    staff = db.get(Staff, staff_id)
    if staff is None:
        raise HTTPException(status_code=404, detail="Staff account not found.")
    # An Admin cannot delete themselves. This also guarantees at least one Admin always remains,
    # because whoever is deleting is an Admin who stays.
    if staff.staffID == current.staffID:
        raise HTTPException(status_code=400, detail="You can't delete your own account.")
    db.delete(staff)
    db.commit()
    return {"ok": True}
