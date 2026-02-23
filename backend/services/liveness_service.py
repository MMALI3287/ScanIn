import os
import httpx
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"


async def check_liveness(base64_image: str) -> bool:
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": "Does this image show a real live person present in front of the camera? Reply only with yes or no."},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64_image,
                        }
                    },
                ]
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(GEMINI_URL, json=payload)

        if response.status_code != 200:
            return True

        result = response.json()
        answer = result["candidates"][0]["content"]["parts"][0]["text"].strip().lower()
        return "yes" in answer
    except Exception:
        return True
