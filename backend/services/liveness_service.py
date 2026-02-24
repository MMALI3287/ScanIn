import os
import httpx
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={GEMINI_API_KEY}"


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
            print(f"[liveness] Gemini API error {response.status_code}: {response.text[:200]}")
            return True

        result = response.json()
        answer = result["candidates"][0]["content"]["parts"][0]["text"].strip().lower()
        is_live = "yes" in answer
        print(f"[liveness] Gemini says: {answer!r} → live={is_live}")
        return is_live
    except Exception as e:
        print(f"[liveness] Exception during liveness check: {e}")
        return True
