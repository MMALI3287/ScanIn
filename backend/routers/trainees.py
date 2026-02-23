import json
import base64
from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Trainee, FaceEmbedding, Attendance
from schemas import TraineeSelfRegister, TraineeOut, APIResponse
from dependencies import get_current_admin
from services.face_service import get_embedding, average_embeddings

router = APIRouter(prefix="/api/v1/trainees", tags=["trainees"])


@router.get("", response_model=APIResponse)
async def list_trainees(db: Session = Depends(get_db), _admin: dict = Depends(get_current_admin)):
    trainees = db.query(Trainee).all()
    embedding_counts = dict(
        db.query(FaceEmbedding.trainee_id, func.count(FaceEmbedding.id))
        .group_by(FaceEmbedding.trainee_id)
        .all()
    )
    data = []
    for t in trainees:
        item = TraineeOut.model_validate(t).model_dump()
        item["embedding_count"] = embedding_counts.get(t.id, 0)
        data.append(item)
    return APIResponse(success=True, data=data, message="Trainees retrieved")


@router.post("/register-self", response_model=APIResponse)
async def register_self(body: TraineeSelfRegister, db: Session = Depends(get_db)):
    if db.query(Trainee).filter(Trainee.unique_name == body.unique_name).first():
        raise HTTPException(status_code=400, detail="Name already registered")

    if len(body.frames) < 1:
        raise HTTPException(status_code=400, detail="At least one frame required")

    embeddings = []
    for frame_b64 in body.frames:
        try:
            emb = await get_embedding(frame_b64)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        embeddings.append(emb)

    trainee = Trainee(unique_name=body.unique_name, registered_by="self")
    if body.email:
        trainee.email = body.email
    db.add(trainee)
    db.flush()

    avg = average_embeddings(embeddings)
    face = FaceEmbedding(trainee_id=trainee.id, embedding=json.dumps(avg), source="camera")
    db.add(face)
    db.commit()
    db.refresh(trainee)

    return APIResponse(
        success=True,
        data={"id": trainee.id, "unique_name": trainee.unique_name},
        message="Registration successful",
    )


@router.post("/register-admin", response_model=APIResponse)
async def register_by_admin(
    unique_name: str = Form(...),
    images: list[UploadFile] = File(...),
    email: str | None = Form(None),
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    if db.query(Trainee).filter(Trainee.unique_name == unique_name).first():
        raise HTTPException(status_code=400, detail="Name already registered")

    if len(images) < 1 or len(images) > 5:
        raise HTTPException(status_code=400, detail="Provide 1 to 5 images")

    embeddings = []
    for img_file in images:
        raw = await img_file.read()
        b64 = base64.b64encode(raw).decode()
        try:
            emb = await get_embedding(b64)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"No face detected in one of the uploaded images. Ensure each image shows a clear face.")
        embeddings.append(emb)

    trainee = Trainee(unique_name=unique_name, registered_by="admin")
    if email:
        trainee.email = email
    db.add(trainee)
    db.flush()

    avg = average_embeddings(embeddings)
    face = FaceEmbedding(trainee_id=trainee.id, embedding=json.dumps(avg), source="upload")
    db.add(face)
    db.commit()
    db.refresh(trainee)

    return APIResponse(success=True, data=TraineeOut.model_validate(trainee).model_dump(), message="Trainee registered by admin")


@router.delete("/{trainee_id}", response_model=APIResponse)
async def delete_trainee(
    trainee_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")

    db.query(Attendance).filter(Attendance.trainee_id == trainee_id).delete()
    db.delete(trainee)
    db.commit()
    return APIResponse(success=True, message="Trainee deleted")
