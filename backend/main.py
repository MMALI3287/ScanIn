import os
from contextlib import asynccontextmanager
from datetime import date, timedelta

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from passlib.context import CryptContext
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from database import engine, SessionLocal, Base
from models import Admin, Setting, Trainee, Attendance
from routers import auth, trainees, attendance as attendance_router, reports, settings
from services.notification_service import alert_admin_absent, SMTP_USER
from ws_manager import manager

scheduler = AsyncIOScheduler()

def schedule_absent_alert() -> None:
    db = SessionLocal()
    try:
        setting = db.query(Setting).filter(Setting.key == "work_start_time").first()
        work_start = setting.value if setting else "09:00"
        h, m = map(int, work_start.split(":"))
        total_minutes = h * 60 + m + 30
        run_hour = total_minutes // 60
        run_minute = total_minutes % 60

        scheduler.remove_all_jobs()
        scheduler.add_job(
            check_and_alert_absent,
            CronTrigger(day_of_week="mon-fri", hour=run_hour, minute=run_minute),
            id="absent_alert",
            replace_existing=True,
        )
    finally:
        db.close()


def check_and_alert_absent() -> None:
    db = SessionLocal()
    try:
        all_trainees = db.query(Trainee).all()
        today = date.today()
        checked_in_ids = {
            row.trainee_id
            for row in db.query(Attendance.trainee_id).filter(Attendance.date == today).all()
        }
        absent_names = [
            t.unique_name for t in all_trainees if t.id not in checked_in_ids
        ]
        if absent_names and SMTP_USER:
            alert_admin_absent(SMTP_USER, absent_names)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_defaults()
    schedule_absent_alert()
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="Face Attendance System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(attendance_router.router)
app.include_router(auth.router)
app.include_router(trainees.router)
app.include_router(reports.router)
app.include_router(settings.router)

CAPTURES_DIR = os.path.join(os.path.dirname(__file__), "captures")
os.makedirs(CAPTURES_DIR, exist_ok=True)
app.mount("/captures", StaticFiles(directory=CAPTURES_DIR), name="captures")


def seed_defaults():
    db = SessionLocal()
    try:
        if not db.query(Admin).first():
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            admin = Admin(username="admin", password_hash=pwd_context.hash("admin123"))
            db.add(admin)

        if not db.query(Setting).filter(Setting.key == "work_start_time").first():
            db.add(Setting(key="work_start_time", value="09:00"))

        if not db.query(Setting).filter(Setting.key == "similarity_threshold").first():
            db.add(Setting(key="similarity_threshold", value="0.75"))

        if not db.query(Setting).filter(Setting.key == "grace_period_minutes").first():
            db.add(Setting(key="grace_period_minutes", value="10"))

        db.commit()
    finally:
        db.close()


@app.get("/")
async def root():
    return {"message": "Face Attendance System API"}


@app.websocket("/ws/attendance")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/api/v1/analytics/weekly")
async def weekly_analytics():
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
            absent = total_trainees - present - late
            if absent < 0:
                absent = 0
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
