import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
# SMTP_FROM should be a verified sender address in your email provider (e.g. Brevo).
# If not set, falls back to SMTP_USER.
SMTP_FROM = os.getenv("SMTP_FROM", "") or SMTP_USER


def send_email(to: str, subject: str, body: str, image_bytes: bytes | None = None) -> None:
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        print("[email] SMTP not configured — skipping email to", to)
        return
    if not SMTP_FROM:
        print("[email] SMTP_FROM not set — skipping email to", to)
        return

    if image_bytes:
        # related allows referencing the inline image via cid:capture
        msg = MIMEMultipart("related")
        msg["From"] = SMTP_FROM
        msg["To"] = to
        msg["Subject"] = subject
        alt = MIMEMultipart("alternative")
        alt.attach(MIMEText(body, "html"))
        msg.attach(alt)
        img = MIMEImage(image_bytes, name="capture.jpg")
        img.add_header("Content-ID", "<capture>")
        img.add_header("Content-Disposition", "inline", filename="capture.jpg")
        msg.attach(img)
    else:
        msg = MIMEMultipart("alternative")
        msg["From"] = SMTP_FROM
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_FROM, to, msg.as_string())


def alert_admin_absent(admin_email: str, absent_trainees: list[str]) -> None:
    if not absent_trainees:
        return

    rows = "".join(f"<li>{name}</li>" for name in absent_trainees)
    body = f"""
    <h2>Absent Trainees Alert</h2>
    <p>The following trainees have <strong>not checked in</strong> today:</p>
    <ul>{rows}</ul>
    <p style="color:#888;font-size:12px;">— ScanIn Attendance System</p>
    """

    try:
        send_email(admin_email, "Absent Trainees Alert", body)
    except Exception as e:
        print(f"Failed to send absent alert email: {e}")
