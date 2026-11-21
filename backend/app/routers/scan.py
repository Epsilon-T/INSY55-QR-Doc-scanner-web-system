from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.mysql import insert
from sqlalchemy.orm import Session

from ..database import get_db
from ..helpers import STUDENT_COLUMNS, normalize_year, now_local, student_dict
from ..models import Log, Scan, Student
from ..security import require_roles

router = APIRouter(prefix="/api", tags=["scan"])


class ScanRequest(BaseModel):
    code: str


def record_scan(db: Session, entered: bool, staff, row=None) -> None:
    """Saves the scan in two places: the daily totals (logs) and the detailed history (scans)."""
    now = now_local()

    stmt = insert(Log).values(
        date=now.date(),
        studentEntered=1 if entered else 0,
        studentDenied=0 if entered else 1,
    )
    stmt = stmt.on_duplicate_key_update(
        studentEntered=Log.studentEntered + stmt.inserted.studentEntered,
        studentDenied=Log.studentDenied + stmt.inserted.studentDenied,
    )
    db.execute(stmt)

    db.add(
        Scan(
            scannedAt=now,
            status="entered" if entered else "denied",
            studentID=row.studentID if row else None,
            course=row.course.strip().upper() if row else None,
            year=normalize_year(row.year) if row else None,
            staffID=staff.staffID,
        )
    )
    db.commit()


@router.post("/scan")
def scan(data: ScanRequest, db: Session = Depends(get_db), staff=Depends(require_roles("Security"))):
    row = db.execute(select(*STUDENT_COLUMNS).where(Student.hashedID == data.code.strip())).first()

    if row is None:
        record_scan(db, False, staff)
        return {"status": "denied", "reason": "This QR code is not recognized.", "student": None}

    if not row.hasImage:
        record_scan(db, False, staff, row)
        return {"status": "denied", "reason": "No COR is on file for this student.", "student": student_dict(row)}

    if not row.hasPhoto:
        record_scan(db, False, staff, row)
        return {
            "status": "denied",
            "reason": "No face photo is on file for this student.",
            "student": student_dict(row),
        }

    record_scan(db, True, staff, row)
    return {"status": "entered", "student": student_dict(row)}
