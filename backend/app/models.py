from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Integer, String
from sqlalchemy.dialects.mysql import MEDIUMBLOB
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Staff(Base):
    __tablename__ = "staff"

    staffID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    staffName: Mapped[str] = mapped_column(String(100))
    schoolEmail: Mapped[str] = mapped_column(String(150), unique=True)
    staffRole: Mapped[str] = mapped_column(Enum("Admin", "Security"))
    password: Mapped[str] = mapped_column(String(255))


class Student(Base):
    __tablename__ = "students"

    studentID: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    course: Mapped[str] = mapped_column(String(100))
    section: Mapped[str] = mapped_column(String(20))
    year: Mapped[str] = mapped_column(String(20))
    hashedID: Mapped[str] = mapped_column(String(255), unique=True)  # the value inside the QR code
    image: Mapped[bytes | None] = mapped_column(MEDIUMBLOB, nullable=True)  # COR image
    photo: Mapped[bytes | None] = mapped_column(MEDIUMBLOB, nullable=True)  # face photo


class Log(Base):
    __tablename__ = "logs"

    logID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    studentEntered: Mapped[int] = mapped_column(Integer, default=0)
    studentDenied: Mapped[int] = mapped_column(Integer, default=0)
    date: Mapped[date] = mapped_column(Date, unique=True)


class Scan(Base):
    """One row per scan: who scanned, which student, when, and the result.

    course and year are copied from the student at scan time, so the history stays correct
    even if the student is later edited or deleted. There are no foreign keys on purpose.
    """

    __tablename__ = "scans"

    scanID: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scannedAt: Mapped[datetime] = mapped_column(DateTime, index=True)
    status: Mapped[str] = mapped_column(Enum("entered", "denied"))
    studentID: Mapped[str | None] = mapped_column(String(20), nullable=True)  # empty for unknown QR codes
    course: Mapped[str | None] = mapped_column(String(100), nullable=True)
    year: Mapped[str | None] = mapped_column(String(20), nullable=True)
    staffID: Mapped[int | None] = mapped_column(Integer, nullable=True)  # the guard who scanned
