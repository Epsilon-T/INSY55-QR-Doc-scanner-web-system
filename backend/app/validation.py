"""Rules for text sent to the API. The website checks the same rules, but a browser check can be
bypassed, so the server always checks again. Every function returns the cleaned value or raises
a 400 error with a message the website can show."""
import re

from fastapi import HTTPException

from .helpers import YEAR_LEVELS

NAME_PATTERN = re.compile(r"^[^\W\d_](?:[^\W\d_]|[ .'’\-,])*$")
STUDENT_ID_PATTERN = re.compile(r"^[A-Za-z0-9-]{5,20}$")
COURSE_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 &.-]{1,29}$")
SECTION_PATTERN = re.compile(r"^[A-Za-z0-9-]{1,10}$")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
MIN_PASSWORD = 8


def bad(message: str) -> None:
    raise HTTPException(status_code=400, detail=message)


def tidy(text: str) -> str:
    """Trims the ends and turns runs of spaces into a single space."""
    return " ".join(text.split())


def clean_student_id(value: str) -> str:
    text = value.strip()
    if not text:
        bad("Enter the student number.")
    if not STUDENT_ID_PATTERN.match(text):
        bad("The student number must be 5 to 20 letters, numbers or hyphens, with no spaces.")
    return text


def clean_name(value: str) -> str:
    text = tidy(value)
    if not text:
        bad("Enter the full name.")
    if len(text) < 2:
        bad("The name is too short.")
    if len(text) > 100:
        bad("The name must be 100 characters or fewer.")
    if not NAME_PATTERN.match(text):
        bad("The name can only use letters, spaces, periods, commas, hyphens and apostrophes.")
    return text


def clean_course(value: str) -> str:
    text = tidy(value).upper()
    if not text:
        bad("Enter the course name.")
    if not COURSE_PATTERN.match(text):
        bad("The course must be 2 to 30 letters, numbers, spaces, & . or -")
    return text


def clean_section(value: str) -> str:
    text = value.strip()
    if not text:
        bad("Choose a section.")
    if not SECTION_PATTERN.match(text):
        bad("The section must be 1 to 10 letters, numbers or hyphens.")
    return text


def clean_year(value: str, keep: str | None = None) -> str:
    """Must be one of the four year levels. When editing, the value the student already has is also accepted."""
    text = value.strip()
    if text not in YEAR_LEVELS and text != keep:
        bad("Choose a valid year level.")
    return text


def clean_email(value: str) -> str:
    text = value.strip().lower()
    if not text:
        bad("Enter the email address.")
    if len(text) > 150:
        bad("The email must be 150 characters or fewer.")
    if not EMAIL_PATTERN.match(text):
        bad("Enter a valid email address, like name@school.edu.")
    return text


def check_password(password: str) -> None:
    if len(password) < MIN_PASSWORD:
        bad(f"The password must be at least {MIN_PASSWORD} characters.")
    if len(password) > 100:
        bad("The password must be 100 characters or fewer.")
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        bad("Include at least one letter and one number in the password.")
