import os
import base64
import uuid
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Trainee, Attendance, Setting
from schemas import AttendanceFrameRequest, AttendanceOut, AttendancePatch, APIResponse
from dependencies import get_current_admin
from services.face_service import get_embedding, find_best_match
from services.liveness_service import check_liveness
from services.notification_service import send_email
from ws_manager import manager

router = APIRouter(prefix="/api/v1/attendance", tags=["attendance"])

CAPTURES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "captures")
os.makedirs(CAPTURES_DIR, exist_ok=True)


def save_capture(frame_b64: str) -> str:
    filename = f"{uuid.uuid4().hex}.jpg"
    filepath = os.path.join(CAPTURES_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(base64.b64decode(frame_b64))
    return filename


def get_work_start_time(db: Session) -> str:
    setting = db.query(Setting).filter(Setting.key == "work_start_time").first()
    return setting.value if setting else "09:00"


def is_liveness_enabled(db: Session) -> bool:
    setting = db.query(Setting).filter(Setting.key == "liveness_check_enabled").first()
    if setting is None:
        return True
    return setting.value.lower() == "true"


def compute_status(checkin_time: datetime, work_start: str, grace_minutes: int = 10) -> str:
    h, m = map(int, work_start.split(":"))
    threshold = checkin_time.replace(hour=h, minute=m, second=0, microsecond=0)
    grace = timedelta(minutes=grace_minutes)
    if checkin_time <= threshold + grace:
        return "present"
    return "late"


@router.post("/identify", response_model=APIResponse)
async def identify(body: AttendanceFrameRequest, db: Session = Depends(get_db)):
    if is_liveness_enabled(db):
        is_live = await check_liveness(body.frame)
        if not is_live:
            raise HTTPException(status_code=400, detail="Liveness check failed. Please look at the camera naturally.")

    try:
        new_embedding = await get_embedding(body.frame)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    trainee = find_best_match(new_embedding, db)

    if not trainee:
        raise HTTPException(status_code=400, detail="Face not recognized. Try again.")

    today = date.today()
    existing = db.query(Attendance).filter(
        Attendance.trainee_id == trainee.id,
        Attendance.date == today,
    ).first()

    if existing and existing.checkin_time and existing.checkout_time:
        raise HTTPException(status_code=400, detail=f"{trainee.unique_name} already checked in and out today.")

    action = "checkout" if (existing and existing.checkin_time) else "checkin"

    return APIResponse(
        success=True,
        data={
            "trainee_id": trainee.id,
            "trainee_name": trainee.unique_name,
            "action": action,
        },
        message=f"Identified as {trainee.unique_name}",
    )


@router.post("/checkin", response_model=APIResponse)
async def checkin(body: AttendanceFrameRequest, db: Session = Depends(get_db)):
    if is_liveness_enabled(db):
        is_live = await check_liveness(body.frame)
        if not is_live:
            raise HTTPException(status_code=400, detail="Liveness check failed. Please look at the camera naturally.")

    try:
        new_embedding = await get_embedding(body.frame)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    trainee = find_best_match(new_embedding, db)

    if not trainee:
        raise HTTPException(status_code=400, detail="Face not recognized. Try again.")

    today = date.today()
    existing = db.query(Attendance).filter(
        Attendance.trainee_id == trainee.id,
        Attendance.date == today,
    ).first()

    if existing and existing.checkin_time and existing.checkout_time:
        raise HTTPException(status_code=400, detail="Already checked in and out today.")

    if existing and existing.checkin_time and not existing.checkout_time:
        existing.checkout_time = datetime.now()
        existing.checkout_image = save_capture(body.frame)
        db.commit()
        db.refresh(existing)
        _send_attendance_email(trainee, "checkout", existing.checkout_time, existing.checkout_image)
        await manager.broadcast({
            "type": "checkout",
            "trainee_name": trainee.unique_name,
            "time": existing.checkout_time.strftime("%I:%M %p"),
            "status": existing.status,
        })
        return APIResponse(
            success=True,
            data={
                "trainee_name": trainee.unique_name,
                "time": existing.checkout_time.strftime("%I:%M %p"),
                "status": existing.status,
                "action": "checkout",
            },
            message=f"Checkout recorded for {trainee.unique_name}",
        )

    now = datetime.now()
    work_start = get_work_start_time(db)
    grace_setting = db.query(Setting).filter(Setting.key == "grace_period_minutes").first()
    grace_minutes = int(grace_setting.value) if grace_setting else 10
    status = compute_status(now, work_start, grace_minutes)

    record = Attendance(
        trainee_id=trainee.id,
        date=today,
        checkin_time=now,
        checkin_image=save_capture(body.frame),
        status=status,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    _send_attendance_email(trainee, "checkin", record.checkin_time, record.checkin_image)
    await manager.broadcast({
        "type": "checkin",
        "trainee_name": trainee.unique_name,
        "time": record.checkin_time.strftime("%I:%M %p"),
        "status": status,
    })

    return APIResponse(
        success=True,
        data={
            "trainee_name": trainee.unique_name,
            "time": record.checkin_time.strftime("%I:%M %p"),
            "status": status,
            "action": "checkin",
        },
        message=f"Check-in recorded for {trainee.unique_name}",
    )


@router.post("/checkout", response_model=APIResponse)
async def checkout(body: AttendanceFrameRequest, db: Session = Depends(get_db)):
    # TODO: Add liveness check here before embedding extraction

    try:
        new_embedding = await get_embedding(body.frame)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    trainee = find_best_match(new_embedding, db)

    if not trainee:
        raise HTTPException(status_code=400, detail="Face not recognized. Try again.")

    today = date.today()
    existing = db.query(Attendance).filter(
        Attendance.trainee_id == trainee.id,
        Attendance.date == today,
    ).first()

    if not existing or not existing.checkin_time:
        raise HTTPException(status_code=400, detail=f"{trainee.unique_name} has not checked in today.")

    if existing.checkout_time:
        raise HTTPException(status_code=400, detail=f"{trainee.unique_name} already checked out today.")

    existing.checkout_time = datetime.now()
    existing.checkout_image = save_capture(body.frame)
    db.commit()
    db.refresh(existing)

    _send_attendance_email(trainee, "checkout", existing.checkout_time, existing.checkout_image)
    await manager.broadcast({
        "type": "checkout",
        "trainee_name": trainee.unique_name,
        "time": existing.checkout_time.strftime("%I:%M %p"),
        "status": existing.status,
    })

    return APIResponse(
        success=True,
        data={
            "trainee_name": trainee.unique_name,
            "time": existing.checkout_time.strftime("%I:%M %p"),
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
        t = db.query(Trainee).filter(Trainee.id == r.trainee_id).first()
        item = AttendanceOut(
            id=r.id,
            trainee_id=r.trainee_id,
            trainee_name=t.unique_name if t else "Unknown",
            date=r.date,
            checkin_time=r.checkin_time,
            checkout_time=r.checkout_time,
            checkin_image=f"/captures/{r.checkin_image}" if r.checkin_image else None,
            checkout_image=f"/captures/{r.checkout_image}" if r.checkout_image else None,
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
    elif body.checkin_time is not None:
        work_start = get_work_start_time(db)
        grace_setting = db.query(Setting).filter(Setting.key == "grace_period_minutes").first()
        grace_minutes = int(grace_setting.value) if grace_setting else 10
        record.status = compute_status(body.checkin_time, work_start, grace_minutes)

    db.commit()
    db.refresh(record)

    return APIResponse(success=True, message="Attendance record updated")


@router.delete("/{record_id}", response_model=APIResponse)
async def delete_attendance(
    record_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    record = db.query(Attendance).filter(Attendance.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    db.delete(record)
    db.commit()

    return APIResponse(success=True, message="Attendance record deleted")


@router.get("/my", response_model=APIResponse)
async def get_my_attendance(
    name: str = Query(...),
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    trainee = db.query(Trainee).filter(Trainee.unique_name == name).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    query = db.query(Attendance).filter(Attendance.trainee_id == trainee.id)
    if from_date:
        query = query.filter(Attendance.date >= from_date)
    if to_date:
        query = query.filter(Attendance.date <= to_date)

    records = query.order_by(Attendance.date.desc(), Attendance.checkin_time.desc()).all()

    data = []
    for r in records:
        item = AttendanceOut(
            id=r.id,
            trainee_id=r.trainee_id,
            trainee_name=trainee.unique_name,
            date=r.date,
            checkin_time=r.checkin_time,
            checkout_time=r.checkout_time,
            checkin_image=f"/captures/{r.checkin_image}" if r.checkin_image else None,
            checkout_image=f"/captures/{r.checkout_image}" if r.checkout_image else None,
            status=r.status,
        )
        data.append(item.model_dump())

    return APIResponse(success=True, data=data, message="Attendance records retrieved")


@router.get("/history", response_model=APIResponse)
async def get_public_history(
    name: str | None = Query(None),
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    db: Session = Depends(get_db),
):
    """Public endpoint for the history page — optionally filter by trainee name."""
    query = db.query(Attendance)
    if name:
        trainee = db.query(Trainee).filter(Trainee.unique_name == name).first()
        if not trainee:
            raise HTTPException(status_code=404, detail="Trainee not found")
        query = query.filter(Attendance.trainee_id == trainee.id)
    if from_date:
        query = query.filter(Attendance.date >= from_date)
    if to_date:
        query = query.filter(Attendance.date <= to_date)

    records = query.order_by(Attendance.date.desc(), Attendance.checkin_time.desc()).all()

    data = []
    for r in records:
        t = db.query(Trainee).filter(Trainee.id == r.trainee_id).first()
        item = AttendanceOut(
            id=r.id,
            trainee_id=r.trainee_id,
            trainee_name=t.unique_name if t else "Unknown",
            date=r.date,
            checkin_time=r.checkin_time,
            checkout_time=r.checkout_time,
            checkin_image=f"/captures/{r.checkin_image}" if r.checkin_image else None,
            checkout_image=f"/captures/{r.checkout_image}" if r.checkout_image else None,
            status=r.status,
        )
        data.append(item.model_dump())

    return APIResponse(success=True, data=data, message="Attendance records retrieved")


def _send_attendance_email(trainee: Trainee, action: str, time: datetime, image_filename: str | None = None) -> None:
    if not trainee.email:
        return
    action_label = "Check-in" if action == "checkin" else "Check-out"
    action_color = "#22c55e" if action == "checkin" else "#3b82f6"
    time_str = time.strftime("%I:%M %p")
    date_str = time.strftime("%B %d, %Y")

    image_tag = ""
    image_bytes = None
    if image_filename:
        image_path = os.path.join(CAPTURES_DIR, image_filename)
        if os.path.exists(image_path):
            with open(image_path, "rb") as f:
                image_bytes = f.read()
            image_tag = '<br><img src="cid:capture" style="max-width:320px;border-radius:12px;border:2px solid #e5e7eb;margin-top:12px;">'

    body = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#f9fafb;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:{action_color};padding:24px 32px;">
        <h2 style="color:#fff;margin:0;font-size:22px;">{action_label} Recorded</h2>
      </div>
      <div style="padding:28px 32px;">
        <p style="font-size:16px;color:#111827;">Hi <strong>{trainee.unique_name}</strong>,</p>
        <p style="font-size:15px;color:#374151;">Your <strong>{action_label.lower()}</strong> was recorded successfully.</p>
        <table style="margin:16px 0;border-collapse:collapse;width:100%;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Time</td>
            <td style="padding:8px 0;color:#111827;font-weight:600;font-size:14px;">{time_str}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Date</td>
            <td style="padding:8px 0;color:#111827;font-weight:600;font-size:14px;">{date_str}</td>
          </tr>
        </table>
        {image_tag}
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">— ScanIn Attendance System</p>
      </div>
    </div>
    """
    try:
        send_email(trainee.email, f"ScanIn {action_label} — {time_str}", body, image_bytes)
        print(f"[email] Sent {action} email to {trainee.email}")
    except Exception as e:
        print(f"[email] Failed to send {action} email to {trainee.email}: {e}")
