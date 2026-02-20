import os
import json
import httpx
import numpy as np
from dotenv import load_dotenv

load_dotenv()

HF_API_KEY = os.getenv("HF_API_KEY", "")
HF_MODEL_URL = os.getenv("HF_MODEL_URL", "https://api-inference.huggingface.co/models/sentence-transformers/clip-ViT-B-32")


def cosine_similarity(a: list[float], b: list[float]) -> float:
    a_arr, b_arr = np.array(a), np.array(b)
    norm_product = np.linalg.norm(a_arr) * np.linalg.norm(b_arr)
    if norm_product == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / norm_product)


def average_embeddings(embeddings: list[list[float]]) -> list[float]:
    return np.mean(embeddings, axis=0).tolist()


async def get_embedding_from_base64(image_base64: str) -> list[float]:
    import base64
    image_bytes = base64.b64decode(image_base64)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            HF_MODEL_URL,
            headers={"Authorization": f"Bearer {HF_API_KEY}"},
            content=image_bytes,
        )

    if response.status_code != 200:
        raise ValueError(f"HuggingFace API error: {response.status_code} - {response.text}")

    result = response.json()

    if isinstance(result, list) and len(result) > 0:
        if isinstance(result[0], float):
            return result
        if isinstance(result[0], list):
            return result[0]

    raise ValueError(f"Unexpected HuggingFace response format: {result}")


def find_best_match(
    new_embedding: list[float],
    stored_embeddings: list[dict],
    threshold: float = 0.75,
) -> dict | None:
    best_match = None
    best_score = -1.0

    for entry in stored_embeddings:
        stored = json.loads(entry["embedding"]) if isinstance(entry["embedding"], str) else entry["embedding"]
        score = cosine_similarity(new_embedding, stored)
        if score > best_score:
            best_score = score
            best_match = entry

    if best_score >= threshold:
        return {"trainee_id": best_match["trainee_id"], "score": best_score}
    return None
