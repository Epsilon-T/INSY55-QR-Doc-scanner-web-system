from datetime import date

from sqlalchemy import Date, Enum, Integer, String
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
