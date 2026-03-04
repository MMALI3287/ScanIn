import os
import boto3
from botocore.config import Config
from dotenv import load_dotenv

load_dotenv()

R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "scanin-captures")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "").rstrip("/")

_s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4"),
    region_name="auto",
)


def upload_capture(filename: str, image_bytes: bytes) -> str:
    """Upload a JPEG to R2 and return the public URL."""
    _s3.put_object(
        Bucket=R2_BUCKET_NAME,
        Key=filename,
        Body=image_bytes,
        ContentType="image/jpeg",
    )
    return f"{R2_PUBLIC_URL}/{filename}"


def get_capture_url(filename: str) -> str:
    """Return the public URL for an already-uploaded capture filename."""
    return f"{R2_PUBLIC_URL}/{filename}"
