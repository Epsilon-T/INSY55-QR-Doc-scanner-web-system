from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..helpers import today_local
from ..models import Log
from ..security import require_roles

router = APIRouter(prefix="/api", tags=["logs"])


@router.get("/logs")
def daily_logs(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    _staff=Depends(require_roles("Admin", "Security")),
):
    """One entry per day, oldest first, ending today. Days with no scans show zeros."""
    today = today_local()
    start = today - timedelta(days=days - 1)
    rows = db.execute(
        select(Log.date, Log.studentEntered, Log.studentDenied).where(Log.date >= start, Log.date <= today)
    ).all()
    by_date = {r.date: r for r in rows}

    result = []
    for i in range(days):
        day = start + timedelta(days=i)
        row = by_date.get(day)
        result.append(
            {
                "date": day.isoformat(),
                "studentEntered": row.studentEntered if row else 0,
                "studentDenied": row.studentDenied if row else 0,
            }
        )
    return result
