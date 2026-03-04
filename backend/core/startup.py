from passlib.context import CryptContext

from database import SessionLocal
from models import Admin, Setting


def seed_defaults() -> None:
    db = SessionLocal()
    try:
        if not db.query(Admin).first():
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            admin = Admin(username="admin", password_hash=pwd_context.hash("admin123"))
            db.add(admin)

        defaults = {
            "work_start_time": "09:00",
            "similarity_threshold": "0.75",
            "grace_period_minutes": "10",
            "liveness_check_enabled": "true",
        }
        for key, value in defaults.items():
            if not db.query(Setting).filter(Setting.key == key).first():
                db.add(Setting(key=key, value=value))

        db.commit()
    finally:
        db.close()
