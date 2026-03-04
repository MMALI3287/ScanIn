import logging
import os
from contextlib import asynccontextmanager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from core.limiter import limiter
from database import engine, Base
from routers import auth, trainees, attendance as attendance_router, reports, settings
from routers import analytics, websocket as websocket_router
from core.startup import seed_defaults
from core.scheduler import scheduler, schedule_absent_alert

_IS_PRODUCTION = os.getenv("ENVIRONMENT") == "production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_defaults()
    schedule_absent_alert()
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="Face Attendance System",
    lifespan=lifespan,
    # Hide interactive docs in production — they expose every endpoint to attackers
    docs_url=None if _IS_PRODUCTION else "/docs",
    redoc_url=None if _IS_PRODUCTION else "/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# allow_credentials=True is incompatible with allow_origins=["*"] per the CORS spec.
# JWT is sent via Authorization header (not cookies), so credentials flag is not needed.
_cors_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(trainees.router)
app.include_router(attendance_router.router)
app.include_router(reports.router)
app.include_router(settings.router)
app.include_router(analytics.router)
app.include_router(websocket_router.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "Face Attendance System API"}
