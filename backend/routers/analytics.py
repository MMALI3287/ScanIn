from datetime import date, timedelta

from fastapi import APIRouter

from database import SessionLocal
from models import Attendance, Trainee

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/weekly")
def weekly_analytics():
    """Return attendance stats for the last 7 days for dashboard charts."""
    db = SessionLocal()
    try:
        today = date.today()
        days = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            records = db.query(Attendance).filter(Attendance.date == d).all()
            total_trainees = db.query(Trainee).count()
            present = sum(1 for r in records if r.status == "present")
            late = sum(1 for r in records if r.status == "late")
            absent = max(total_trainees - present - late, 0)
            days.append({
                "date": d.isoformat(),
                "label": d.strftime("%a"),
                "present": present,
                "late": late,
                "absent": absent,
                "total": total_trainees,
            })
        return {"success": True, "data": days}
    finally:
        db.close()
