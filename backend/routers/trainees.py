import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Trainee, FaceEmbedding
from schemas import TraineeSelfRegister, TraineeAdminRegister, TraineeOut, APIResponse
from dependencies import get_current_admin
from services.face_service import get_embedding_from_base64, average_embeddings

router = APIRouter(prefix="/api/v1/trainees", tags=["trainees"])


@router.get("", response_model=APIResponse)
async def list_trainees(db: Session = Depends(get_db), _admin: dict = Depends(get_current_admin)):
    trainees = db.query(Trainee).all()
    data = [TraineeOut.model_validate(t).model_dump() for t in trainees]
    return APIResponse(success=True, data=data, message="Trainees retrieved")


@router.post("/register-self", response_model=APIResponse)
async def register_self(body: TraineeSelfRegister, db: Session = Depends(get_db)):
    if db.query(Trainee).filter(Trainee.unique_name == body.unique_name).first():
        raise HTTPException(status_code=400, detail="Name already registered")

    if len(body.embeddings) < 1:
        raise HTTPException(status_code=400, detail="At least one embedding required")

    trainee = Trainee(unique_name=body.unique_name, registered_by="self")
    db.add(trainee)
    db.flush()

    avg = average_embeddings(body.embeddings)
    face = FaceEmbedding(trainee_id=trainee.id, embedding=json.dumps(avg), source="camera")
    db.add(face)
    db.commit()
    db.refresh(trainee)

    return APIResponse(success=True, data=TraineeOut.model_validate(trainee).model_dump(), message="Registration successful")


@router.post("/register-admin", response_model=APIResponse)
async def register_by_admin(
    body: TraineeAdminRegister,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    if db.query(Trainee).filter(Trainee.unique_name == body.unique_name).first():
        raise HTTPException(status_code=400, detail="Name already registered")

    if len(body.images) < 1:
        raise HTTPException(status_code=400, detail="At least one image required")

    embeddings = []
    for img_b64 in body.images:
        emb = await get_embedding_from_base64(img_b64)
        embeddings.append(emb)

    trainee = Trainee(unique_name=body.unique_name, registered_by="admin")
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

    db.delete(trainee)
    db.commit()
    return APIResponse(success=True, message="Trainee deleted")
