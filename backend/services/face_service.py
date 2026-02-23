import io
import json
import base64
import numpy as np
import torch
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1
from sqlalchemy.orm import Session

print("Loading FaceNet model (MTCNN + InceptionResnetV1)...")
_mtcnn = MTCNN(
    image_size=160,
    margin=40,
    keep_all=False,
    post_process=True,
    min_face_size=20,
    thresholds=[0.5, 0.6, 0.6],
)
_resnet = InceptionResnetV1(pretrained="vggface2").eval()
print("FaceNet model loaded.")


def cosine_similarity(a: list[float], b: list[float]) -> float:
    a_arr, b_arr = np.array(a), np.array(b)
    norm_product = np.linalg.norm(a_arr) * np.linalg.norm(b_arr)
    if norm_product == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / norm_product)


def average_embeddings(embeddings: list[list[float]]) -> list[float]:
    return np.mean(embeddings, axis=0).tolist()


async def get_embedding(base64_image: str) -> list[float]:
    image_bytes = base64.b64decode(base64_image)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Scale up small images so MTCNN can detect faces reliably
    min_dim = min(image.size)
    if min_dim < 400:
        scale = 400 / min_dim
        image = image.resize(
            (int(image.width * scale), int(image.height * scale)),
            Image.LANCZOS,
        )

    face_tensor = _mtcnn(image)
    if face_tensor is None:
        raise ValueError("No face detected in image. Please ensure your face is clearly visible.")

    with torch.no_grad():
        embedding = _resnet(face_tensor.unsqueeze(0)).squeeze().tolist()
    return embedding


def find_best_match(new_embedding: list[float], db: Session):
    from models import FaceEmbedding, Trainee, Setting

    threshold = 0.6
    similarity_setting = db.query(Setting).filter(Setting.key == "similarity_threshold").first()
    if similarity_setting:
        threshold = float(similarity_setting.value)

    all_face_rows = db.query(FaceEmbedding).all()

    best_trainee_id = None
    best_score = -1.0

    for row in all_face_rows:
        stored = json.loads(row.embedding) if isinstance(row.embedding, str) else row.embedding
        score = cosine_similarity(new_embedding, stored)
        if score > best_score:
            best_score = score
            best_trainee_id = row.trainee_id

    if best_score >= threshold and best_trainee_id is not None:
        return db.query(Trainee).filter(Trainee.id == best_trainee_id).first()
    return None
