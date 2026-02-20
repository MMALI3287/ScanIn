import json
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Trainee, FaceEmbedding, Attendance, Setting
from schemas import AttendanceFrameRequest, AttendanceOut, AttendancePatch, APIResponse
from dependencies import get_current_admin
from services.face_service import get_embedding_from_base64, find_best_match
from services.liveness_service import check_liveness

router = APIRouter(prefix="/api/v1/attendance", tags=["attendance"])


def get_work_start_time(db: Session) -> str:
    setting = db.query(Setting).filter(Setting.key == "work_start_time").first()
    return setting.value if setting else "09:00"


def compute_status(checkin_time: datetime, work_start: str) -> str:
    h, m = map(int, work_start.split(":"))
    threshold = checkin_time.replace(hour=h, minute=m, second=0, microsecond=0)
    grace = timedelta(minutes=10)
    if checkin_time <= threshold + grace:
        return "present"
    return "late"


async def identify_trainee(frame_b64: str, db: Session, threshold: float = 0.75) -> Trainee:
    is_live = await check_liveness(frame_b64)
    if not is_live:
        raise HTTPException(status_code=400, detail="Liveness check failed. Please show your real face.")

    new_embedding = await get_embedding_from_base64(frame_b64)

    all_embeddings = db.query(FaceEmbedding).all()
    stored = [{"trainee_id": fe.trainee_id, "embedding": fe.embedding} for fe in all_embeddings]

    similarity_setting = db.query(Setting).filter(Setting.key == "similarity_threshold").first()
    if similarity_setting:
        threshold = float(similarity_setting.value)

    match = find_best_match(new_embedding, stored, threshold)
    if not match:
        raise HTTPException(status_code=400, detail="Face not recognized. Try again.")

    trainee = db.query(Trainee).filter(Trainee.id == match["trainee_id"]).first()
    if not trainee:
        raise HTTPException(status_code=400, detail="Matched trainee not found in database.")

    return trainee


@router.post("/checkin", response_model=APIResponse)
async def checkin(body: AttendanceFrameRequest, db: Session = Depends(get_db)):
    trainee = await identify_trainee(body.frame, db)
    today = date.today()

    existing = db.query(Attendance).filter(
        Attendance.trainee_id == trainee.id,
        Attendance.date == today,
    ).first()

    if existing and existing.checkin_time:
        if existing.checkout_time:
            raise HTTPException(status_code=400, detail=f"{trainee.unique_name} already checked in and out today.")
        # Second scan = checkout
        existing.checkout_time = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return APIResponse(
            success=True,
            data={
                "trainee_name": trainee.unique_name,
                "time": existing.checkout_time.isoformat(),
                "status": existing.status,
                "action": "checkout",
            },
            message=f"Checkout recorded for {trainee.unique_name}",
        )

    now = datetime.utcnow()
    work_start = get_work_start_time(db)
    status = compute_status(now, work_start)

    record = Attendance(
        trainee_id=trainee.id,
        date=today,
        checkin_time=now,
        status=status,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return APIResponse(
        success=True,
        data={
            "trainee_name": trainee.unique_name,
            "time": record.checkin_time.isoformat(),
            "status": status,
            "action": "checkin",
        },
        message=f"Check-in recorded for {trainee.unique_name}",
    )


@router.post("/checkout", response_model=APIResponse)
async def checkout(body: AttendanceFrameRequest, db: Session = Depends(get_db)):
    trainee = await identify_trainee(body.frame, db)
    today = date.today()

    existing = db.query(Attendance).filter(
        Attendance.trainee_id == trainee.id,
        Attendance.date == today,
    ).first()

    if not existing or not existing.checkin_time:
        raise HTTPException(status_code=400, detail=f"{trainee.unique_name} has not checked in today.")

    if existing.checkout_time:
        raise HTTPException(status_code=400, detail=f"{trainee.unique_name} already checked out today.")

    existing.checkout_time = datetime.utcnow()
    db.commit()
    db.refresh(existing)

    return APIResponse(
        success=True,
        data={
            "trainee_name": trainee.unique_name,
            "time": existing.checkout_time.isoformat(),
            "status": existing.status,
            "action": "checkout",
        },
        message=f"Checkout recorded for {trainee.unique_name}",
    )


@router.get("", response_model=APIResponse)
async def get_attendance(
    date_filter: date | None = Query(None, alias="date"),
    trainee_id: int | None = None,
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    query = db.query(Attendance)

    if date_filter:
        query = query.filter(Attendance.date == date_filter)
    if trainee_id:
        query = query.filter(Attendance.trainee_id == trainee_id)
    if from_date:
        query = query.filter(Attendance.date >= from_date)
    if to_date:
        query = query.filter(Attendance.date <= to_date)

    records = query.order_by(Attendance.date.desc(), Attendance.checkin_time.desc()).all()

    data = []
    for r in records:
        trainee = db.query(Trainee).filter(Trainee.id == r.trainee_id).first()
        item = AttendanceOut(
            id=r.id,
            trainee_id=r.trainee_id,
            trainee_name=trainee.unique_name if trainee else "Unknown",
            date=r.date,
            checkin_time=r.checkin_time,
            checkout_time=r.checkout_time,
            status=r.status,
        )
        data.append(item.model_dump())

    return APIResponse(success=True, data=data, message="Attendance records retrieved")


@router.patch("/{record_id}", response_model=APIResponse)
async def patch_attendance(
    record_id: int,
    body: AttendancePatch,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    record = db.query(Attendance).filter(Attendance.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    if body.checkin_time is not None:
        record.checkin_time = body.checkin_time
    if body.checkout_time is not None:
        record.checkout_time = body.checkout_time
    if body.status is not None:
        record.status = body.status

    db.commit()
    db.refresh(record)

    return APIResponse(success=True, message="Attendance record updated")
