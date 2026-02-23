import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")


def send_email(to: str, subject: str, body: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_USER
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to, msg.as_string())


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
