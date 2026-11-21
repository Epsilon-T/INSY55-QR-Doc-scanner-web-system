import hashlib
import hmac
import re
from datetime import date, datetime
from urllib.parse import quote
from zoneinfo import ZoneInfo

from .config import settings
from .models import Student
from .security import create_image_token


def hashed_id(student_id: str) -> str:
    """The value stored in the student's QR code: a keyed hash of the student number."""
    return hmac.new(settings.qr_secret_key.encode(), student_id.encode(), hashlib.sha256).hexdigest()


def now_local() -> datetime:
    """The current school time, without timezone info, ready to store in MySQL."""
    return datetime.now(ZoneInfo(settings.app_timezone)).replace(tzinfo=None)


def today_local() -> date:
    return now_local().date()


YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"]


def normalize_year(value: str | None) -> str:
    """Turns "2nd year", " 2nd Year " or "2" into "2nd Year". Anything else becomes "Other"."""
    text = (value or "").strip().lower()
    for level in YEAR_LEVELS:
        if level.lower() == text:
            return level
    match = re.match(r"^([1-4])", text)
    return YEAR_LEVELS[int(match.group(1)) - 1] if match else "Other"


def detect_image_type(data: bytes) -> str | None:
    """Looks at the first bytes of a file to see what kind of image it really is."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def image_url(student_id: str, kind: str = "image") -> str:
    """kind is "image" for the COR or "photo" for the face photo."""
    return f"/api/students/{quote(student_id, safe='')}/{kind}?t={create_image_token(student_id)}"


# Columns used when listing students. The image itself is not loaded, only whether one exists.
STUDENT_COLUMNS = (
    Student.studentID,
    Student.name,
    Student.course,
    Student.section,
    Student.year,
    Student.hashedID,
    Student.image.is_not(None).label("hasImage"),
    Student.photo.is_not(None).label("hasPhoto"),
)


def student_dict(row, include_hash: bool = False) -> dict:
    data = {
        "studentID": row.studentID,
        "name": row.name,
        "course": row.course,
        "section": row.section,
        "year": row.year,
        "imageUrl": image_url(row.studentID) if row.hasImage else None,
        "photoUrl": image_url(row.studentID, "photo") if row.hasPhoto else None,
    }
    if include_hash:
        data["hashedID"] = row.hashedID
    return data
