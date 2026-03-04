from datetime import date

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from database import SessionLocal
from models import Attendance, Setting, Trainee
from services.notification_service import SMTP_USER, alert_admin_absent

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
            _check_and_alert_absent,
            CronTrigger(day_of_week="mon-fri", hour=run_hour, minute=run_minute),
            id="absent_alert",
            replace_existing=True,
        )
    finally:
        db.close()


def _check_and_alert_absent() -> None:
    db = SessionLocal()
    try:
        all_trainees = db.query(Trainee).all()
        today = date.today()
        checked_in_ids = {
            row.trainee_id
            for row in db.query(Attendance.trainee_id).filter(Attendance.date == today).all()
        }
        absent_names = [t.unique_name for t in all_trainees if t.id not in checked_in_ids]
        if absent_names and SMTP_USER:
            alert_admin_absent(SMTP_USER, absent_names)
    finally:
        db.close()
