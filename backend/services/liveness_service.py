import os
import httpx
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"


async def check_liveness(image_base64: str) -> bool:
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": "Does this image show a real live person (not a photo of a photo, not a screen, not a printout)? Reply only yes or no."},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": image_base64,
                        }
                    },
                ]
            }
        ]
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(GEMINI_URL, json=payload)

    if response.status_code != 200:
        raise ValueError(f"Gemini API error: {response.status_code} - {response.text}")

    result = response.json()
    try:
        answer = result["candidates"][0]["content"]["parts"][0]["text"].strip().lower()
    except (KeyError, IndexError):
        raise ValueError(f"Unexpected Gemini response: {result}")

    return answer.startswith("yes")
