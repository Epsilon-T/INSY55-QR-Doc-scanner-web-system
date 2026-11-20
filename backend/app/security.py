import hmac
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import Staff

ALGORITHM = "HS256"
bearer = HTTPBearer(auto_error=False)


def verify_password(plain: str, stored: str) -> bool:
    # Passwords are stored as plain text in this project. If that ever changes, this is the
    # only place that needs to change (plus the code that saves passwords).
    return hmac.compare_digest(plain.encode(), stored.encode())


def _expires() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)


def create_access_token(staff: Staff) -> str:
    payload = {"sub": str(staff.staffID), "role": staff.staffRole, "exp": _expires()}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)


def get_current_staff(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Staff:
    """Reads the login token and returns the staff member it belongs to."""
    unauthorized = HTTPException(status_code=401, detail="Please log in again.")
    if credentials is None:
        raise unauthorized
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret_key, algorithms=[ALGORITHM])
        staff = db.get(Staff, int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized
    if staff is None:
        raise unauthorized
    return staff


def require_roles(*roles: str):
    """Use as a route dependency, e.g. Depends(require_roles("Admin"))."""

    def checker(staff: Staff = Depends(get_current_staff)) -> Staff:
        if staff.staffRole not in roles:
            raise HTTPException(status_code=403, detail="You do not have access to this.")
        return staff

    return checker


# A browser <img> tag cannot send a login header, so each COR image link carries its own
# signed token. It only works for that one student's image and expires like a login does.
def create_image_token(student_id: str) -> str:
    return jwt.encode({"img": student_id, "exp": _expires()}, settings.jwt_secret_key, algorithm=ALGORITHM)


def verify_image_token(token: str, student_id: str) -> bool:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return False
    return payload.get("img") == student_id
