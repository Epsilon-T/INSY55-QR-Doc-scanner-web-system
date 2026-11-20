from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.mysql import insert
from sqlalchemy.orm import Session

from ..database import get_db
from ..helpers import STUDENT_COLUMNS, student_dict, today_local
from ..models import Log, Student
from ..security import require_roles

router = APIRouter(prefix="/api", tags=["scan"])


class ScanRequest(BaseModel):
    code: str


def record_scan(db: Session, entered: bool) -> None:
    """Adds 1 to today's row in the logs table, creating the row on the first scan of the day."""
    stmt = insert(Log).values(
        date=today_local(),
        studentEntered=1 if entered else 0,
        studentDenied=0 if entered else 1,
    )
    stmt = stmt.on_duplicate_key_update(
        studentEntered=Log.studentEntered + stmt.inserted.studentEntered,
        studentDenied=Log.studentDenied + stmt.inserted.studentDenied,
    )
    db.execute(stmt)
    db.commit()


@router.post("/scan")
def scan(data: ScanRequest, db: Session = Depends(get_db), _staff=Depends(require_roles("Security"))):
    row = db.execute(select(*STUDENT_COLUMNS).where(Student.hashedID == data.code.strip())).first()

    if row is None:
        record_scan(db, entered=False)
        return {"status": "denied", "reason": "This QR code is not recognized.", "student": None}

    if not row.hasImage:
        record_scan(db, entered=False)
        return {"status": "denied", "reason": "No COR is on file for this student.", "student": student_dict(row)}

    if not row.hasPhoto:
        record_scan(db, entered=False)
        return {
            "status": "denied",
            "reason": "No face photo is on file for this student.",
            "student": student_dict(row),
        }

    record_scan(db, entered=True)
    return {"status": "entered", "student": student_dict(row)}
