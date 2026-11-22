from collections import Counter
from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..helpers import YEAR_LEVELS, normalize_year, today_local
from ..models import Scan
from ..security import require_roles

router = APIRouter(prefix="/api/stats", tags=["stats"])

PERIOD_DAYS = {"today": 1, "7d": 7, "30d": 30}


@router.get("/entries")
def entry_stats(
    period: str = Query("today", pattern="^(today|7d|30d)$"),
    db: Session = Depends(get_db),
    _staff=Depends(require_roles("Admin", "Security")),
):
    """How many different students entered in the period, by course and by year level."""
    days = PERIOD_DAYS[period]
    start = datetime.combine(today_local() - timedelta(days=days - 1), time.min)

    rows = db.execute(
        select(Scan.studentID, Scan.course, Scan.year)
        .where(Scan.status == "entered", Scan.studentID.is_not(None), Scan.scannedAt >= start)
        .order_by(Scan.scannedAt)
    ).all()

    # Each student counts once. If a student scanned several times, the latest scan decides.
    latest = {r.studentID: ((r.course or "UNKNOWN"), normalize_year(r.year)) for r in rows}

    by_course: Counter = Counter()
    by_year: Counter = Counter()
    matrix: dict[str, Counter] = {}
    for course, year in latest.values():
        by_course[course] += 1
        by_year[year] += 1
        matrix.setdefault(course, Counter())[year] += 1

    year_columns = YEAR_LEVELS + (["Other"] if by_year["Other"] else [])
    return {
        "period": period,
        "total": len(latest),
        "yearColumns": year_columns,
        "byCourse": [
            {"label": c, "count": n} for c, n in sorted(by_course.items(), key=lambda x: (-x[1], x[0]))
        ],
        "byYear": [{"label": y, "count": by_year[y]} for y in year_columns if by_year[y]],
        "matrix": [
            {"course": c, "total": sum(years.values()), "years": dict(years)}
            for c, years in sorted(matrix.items(), key=lambda x: (-sum(x[1].values()), x[0]))
        ],
    }
