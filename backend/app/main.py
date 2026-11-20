from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .routers import auth, logs, scan, staff, students

app = FastAPI(title="School University Academy QR System")
app.include_router(auth.router)
app.include_router(students.router)
app.include_router(staff.router)
app.include_router(scan.router)
app.include_router(logs.router)


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    """Open /api/health to check that the server can reach MySQL."""
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status_code=503, detail="Cannot reach the database. Check your .env settings.")
    return {"status": "ok"}


# ---------- Serve the built website ----------
# After `npm run build`, the frontend is plain files in frontend/dist. FastAPI serves them, so the
# whole system runs as one program on one port. This part must stay below the API routes above.
# backend/app/main.py -> parents[2] is the folder that holds both "backend" and "frontend"
DIST = Path(settings.frontend_dist) if settings.frontend_dist else Path(__file__).resolve().parents[2] / "frontend" / "dist"
DIST = DIST.resolve()

if (DIST / "index.html").is_file():
    if (DIST / "assets").is_dir():
        # Vite puts its JS and CSS here with a new file name for every build, so they cache well
        app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def website(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found.")
        file = (DIST / path).resolve()
        if path and file.is_file() and file.is_relative_to(DIST):
            return FileResponse(file)
        # Any other address (/login, /students, ...) is a page inside the React app
        return FileResponse(DIST / "index.html", headers={"Cache-Control": "no-cache"})
