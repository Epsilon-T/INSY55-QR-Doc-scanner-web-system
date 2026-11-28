from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..helpers import STUDENT_COLUMNS, detect_image_type, hashed_id, student_dict
from ..models import Student
from ..validation import clean_course, clean_name, clean_section, clean_student_id, clean_year
from ..security import require_roles, verify_image_token

router = APIRouter(prefix="/api/students", tags=["students"])

MAX_IMAGE_BYTES = 5 * 1024 * 1024


async def read_image(upload: UploadFile | None, label: str) -> bytes | None:
    """Returns the uploaded image as bytes, or None when no file was sent."""
    if upload is None or not upload.filename:
        return None
    data = await upload.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail=f"The {label} must be 5 MB or smaller.")
    if detect_image_type(data) is None:
        raise HTTPException(status_code=400, detail=f"The {label} must be a JPG, PNG, GIF or WebP image.")
    return data


@router.get("")
def list_students(db: Session = Depends(get_db), staff=Depends(require_roles("Admin", "Security"))):
    """Admins and Security Staff can look students up. Only Admins get the QR value (hashedID)."""
    rows = db.execute(
        select(*STUDENT_COLUMNS).order_by(Student.course, Student.year, Student.section, Student.name)
    ).all()
    return [student_dict(r, include_hash=staff.staffRole == "Admin") for r in rows]


@router.post("")
async def add_student(
    studentID: Annotated[str, Form()],
    name: Annotated[str, Form()],
    course: Annotated[str, Form()],
    section: Annotated[str, Form()],
    year: Annotated[str, Form()],
    image: Annotated[UploadFile | None, File()] = None,
    photo: Annotated[UploadFile | None, File()] = None,
    db: Session = Depends(get_db),
    _staff=Depends(require_roles("Admin")),
):
    student_id = clean_student_id(studentID)
    name = clean_name(name)
    course = clean_course(course)
    section = clean_section(section)
    year = clean_year(year)
    if db.get(Student, student_id) is not None:
        raise HTTPException(status_code=409, detail="A student with this number already exists.")
    cor_data = await read_image(image, "COR image")
    photo_data = await read_image(photo, "photo")
    db.add(
        Student(
            studentID=student_id,
            name=name,
            course=course,
            section=section,
            year=year,
            hashedID=hashed_id(student_id),
            image=cor_data,
            photo=photo_data,
        )
    )
    db.commit()
    return {"ok": True}


@router.put("/{student_id}")
async def update_student(
    student_id: str,
    name: Annotated[str, Form()],
    course: Annotated[str, Form()],
    section: Annotated[str, Form()],
    year: Annotated[str, Form()],
    image: Annotated[UploadFile | None, File()] = None,
    photo: Annotated[UploadFile | None, File()] = None,
    db: Session = Depends(get_db),
    _staff=Depends(require_roles("Admin")),
):
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found.")
    student.name = clean_name(name)
    student.course = clean_course(course)
    student.section = clean_section(section)
    student.year = clean_year(year, keep=student.year)
    cor_data = await read_image(image, "COR image")
    photo_data = await read_image(photo, "photo")
    if cor_data is not None:  # no new file means keep the current one
        student.image = cor_data
    if photo_data is not None:
        student.photo = photo_data
    db.commit()
    return {"ok": True}


@router.delete("/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db), _staff=Depends(require_roles("Admin"))):
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found.")
    db.delete(student)
    db.commit()
    return {"ok": True}


def serve_image(db: Session, student_id: str, token: str, column, missing: str) -> Response:
    """Serves one stored image. The link's signed token is the login for this one student."""
    if not verify_image_token(token, student_id):
        raise HTTPException(status_code=403, detail="This image link is invalid or has expired.")
    data = db.scalar(select(column).where(Student.studentID == student_id))
    if not data:
        raise HTTPException(status_code=404, detail=missing)
    return Response(
        content=data,
        media_type=detect_image_type(data) or "application/octet-stream",
        headers={"Cache-Control": "private, max-age=300"},
    )


@router.get("/{student_id}/image")
def get_cor(student_id: str, t: str, db: Session = Depends(get_db)):
    return serve_image(db, student_id, t, Student.image, "No COR image on file.")


@router.get("/{student_id}/photo")
def get_photo(student_id: str, t: str, db: Session = Depends(get_db)):
    return serve_image(db, student_id, t, Student.photo, "No photo on file.")
