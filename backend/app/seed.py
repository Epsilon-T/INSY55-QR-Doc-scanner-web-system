"""Creates the first staff accounts. Run once from the backend folder:  python -m app.seed"""
from sqlalchemy import select

from .database import SessionLocal
from .models import Staff

ACCOUNTS = [
    {"staffName": "Admin User", "schoolEmail": "admin@sua.edu", "staffRole": "Admin", "password": "admin123"},
    {"staffName": "Security Guard", "schoolEmail": "security@sua.edu", "staffRole": "Security", "password": "guard123"},
]


def main() -> None:
    with SessionLocal() as db:
        for account in ACCOUNTS:
            exists = db.scalar(select(Staff).where(Staff.schoolEmail == account["schoolEmail"]))
            if exists:
                print(f"Skipped {account['schoolEmail']} (already exists)")
                continue
            db.add(Staff(**account))
            print(f"Added {account['schoolEmail']}")
        db.commit()


if __name__ == "__main__":
    main()
