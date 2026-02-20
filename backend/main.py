from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext

from database import engine, SessionLocal, Base
from models import Admin, Setting
from routers import auth, trainees, attendance, reports, settings

app = FastAPI(title="Face Attendance System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(trainees.router)
app.include_router(attendance.router)
app.include_router(reports.router)
app.include_router(settings.router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    seed_defaults()


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

        db.commit()
    finally:
        db.close()


@app.get("/")
async def root():
    return {"message": "Face Attendance System API"}
