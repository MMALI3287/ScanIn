# ScanIn — Face Attendance System

A self-hosted attendance system that uses face recognition to automatically mark trainee attendance. Built for small training centers (~30 trainees) with a single fixed webcam and one admin.

---

## Features

### Kiosk (Check-in / Check-out)

- Face recognition check-in and check-out — under 2 seconds
- Two-step confirm flow: identify → confirm → record (prevents accidental entries)
- "Not Me" cancel button if misidentified
- Automatic check-in vs check-out detection (first scan = in, second = out)
- Live clock display, photo evidence capture per event, auto-reset after 3 seconds

### Face Recognition & Liveness

- FaceNet (MTCNN + InceptionResnetV1) — 512-dimensional face embeddings, runs locally
- Cosine similarity matching with configurable threshold (default 0.75)
- Multi-angle guided registration (5 poses) with MediaPipe FaceLandmarker for pose validation
- 1-second hold-to-capture requirement with progress ring animation
- Google Gemini liveness detection — rejects printed photos and screen replays
- Fail-open liveness: gracefully degrades if the Gemini API is unavailable

### Admin Panel

- Dashboard — today's attendance with Present / Late / Absent stat cards, date picker, live updates
- History — full CRUD with trainee/date filters, inline editing, delete with confirmation
- Trainee Management — view trainees, upload 1–5 images to register, delete with cascade
- Reports — export attendance as Excel (.xlsx) or PDF for any date range
- Settings — configure work start time, grace period, similarity threshold, liveness toggle
- JWT authentication, toast notifications across all pages

### Notifications & Automation

- HTML email on every check-in/check-out with attached photo
- Automated absent alert emailed to admin (cron job, Mon–Fri, ~30 min after work start)
- Real-time WebSocket broadcast to admin dashboard on any attendance event

---

## How It Works

**Registration** (once per trainee):

```
Trainee → opens /register → MediaPipe guides 5 poses
  → hold each pose 1 second → auto-capture
  → 5 images sent to backend → MTCNN detects faces
  → InceptionResnetV1 extracts embeddings → averaged → stored in DB
```

**Daily check-in**:

```
Trainee → walks to kiosk → presses Scan
  → frame sent to backend → Gemini liveness check
  → FaceNet embedding → cosine match against all stored faces
  → match found → shows name + "Check In" / "Check Out"
  → trainee confirms → attendance recorded with timestamp + photo
  → email sent → WebSocket updates admin dashboard
```

**Status logic**: check-in within grace period of work start time → `present`; after → `late`. Absent is set by scheduler ~30 min after work start for trainees with no check-in.

---

## Tech Stack

| Layer         | Technology                                              |
| ------------- | ------------------------------------------------------- |
| Frontend      | React 19 + Vite, Tailwind CSS v4, React Router v7       |
| Mobile        | Capacitor 8 (Android APK)                               |
| Face Tracking | MediaPipe FaceLandmarker (client-side, GPU)             |
| Charts        | Recharts                                                |
| Backend       | FastAPI (Python 3.13), SQLAlchemy, NeonDB (PostgreSQL)  |
| Face Model    | facenet-pytorch (MTCNN + InceptionResnetV1, runs local) |
| Liveness      | Google Gemini 1.5 Flash API                             |
| Auth          | JWT (python-jose + bcrypt)                              |
| Scheduling    | APScheduler                                             |
| Reports       | openpyxl (Excel), ReportLab (PDF)                       |
| Email         | smtplib (SMTP/TLS)                                      |

---

## Prerequisites

- Python 3.13+
- Node.js 20+
- A Gemini API key (free tier works)

---

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / macOS
pip install -r requirements.txt
cp .env.example .env
# Fill in all required values in .env
```

### Frontend

```bash
cd frontend
npm install
```

---

## Running Locally

**Backend** (port 8000):

```bash
cd backend
uvicorn main:app --reload
```

**Frontend** (port 5173):

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

| Variable               | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `JWT_SECRET_KEY`       | Random secret for signing JWT tokens                          |
| `JWT_EXPIRE_MINUTES`   | Token lifetime in minutes (default: `480`)                    |
| `GEMINI_API_KEY`       | Google Gemini API key for liveness detection                  |
| `DATABASE_URL`         | NeonDB connection string (`postgresql://...?sslmode=require`) |
| `R2_ACCOUNT_ID`        | Cloudflare account ID (from R2 overview page)                 |
| `R2_ACCESS_KEY_ID`     | R2 API token access key                                       |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret key                                       |
| `R2_BUCKET_NAME`       | R2 bucket name (e.g. `scanin-captures`)                       |
| `R2_PUBLIC_URL`        | Public bucket URL (e.g. `https://pub-xxx.r2.dev`)             |
| `SMTP_HOST`            | SMTP server hostname (e.g. `smtp-relay.brevo.com`)            |
| `SMTP_PORT`            | SMTP port (default: `587`)                                    |
| `SMTP_USER`            | SMTP login email                                              |
| `SMTP_PASS`            | SMTP password / API key                                       |
| `ADMIN_EMAIL`          | Email address to receive absent alerts                        |

Generate a secure JWT secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

---

## Default Admin Credentials

| Field    | Value      |
| -------- | ---------- |
| Username | `admin`    |
| Password | `admin123` |

> **Change these immediately after first login via Admin → Settings.**

---

## Key Constraints

- Max ~30 trainees — no pagination
- One check-in and one check-out per trainee per day (second scan = checkout)
- One admin account — no self-signup for admins
- Unrecognized face returns an error, no fallback identification
- Admin can manually edit any attendance record after the fact

---

## Project Structure

```
ScanIn/
├── backend/
│   ├── main.py               # App entry point (thin factory)
│   ├── models.py             # SQLAlchemy ORM models
│   ├── schemas.py            # Pydantic v2 request/response schemas
│   ├── database.py           # DB session setup
│   ├── dependencies.py       # FastAPI dependency injectors
│   ├── core/
│   │   ├── startup.py        # DB seed on startup
│   │   ├── scheduler.py      # APScheduler absent-alert job
│   │   └── ws_manager.py     # WebSocket connection manager
│   ├── routers/              # One file per feature domain
│   │   ├── attendance.py
│   │   ├── trainees.py
│   │   ├── auth.py
│   │   ├── reports.py
│   │   ├── settings.py
│   │   ├── analytics.py
│   │   └── websocket.py
│   └── services/
│       ├── face_service.py          # Embedding extraction + cosine matching
│       ├── liveness_service.py      # Gemini liveness check
│       └── notification_service.py  # Email alerts
└── frontend/
    └── src/
        ├── pages/            # One file per route/screen
        ├── components/       # Shared UI components
        ├── contexts/         # React context providers (DarkMode)
        └── services/
            └── api.js        # Axios instance + all API calls
```

---

## API Reference

All routes are prefixed `/api/v1/`. Protected routes require `Authorization: Bearer <token>`.

All responses follow: `{ "success": bool, "data": ..., "message": str }`

### Auth

| Method | Path          | Body                     |
| ------ | ------------- | ------------------------ |
| `POST` | `/auth/login` | `{ username, password }` |

### Trainees

| Method   | Path                       | Notes                                             |
| -------- | -------------------------- | ------------------------------------------------- |
| `GET`    | `/trainees`                | Protected                                         |
| `POST`   | `/trainees/register-self`  | `{ unique_name, frames: [base64] }`               |
| `POST`   | `/trainees/register-admin` | Protected — multipart: `unique_name` + `images[]` |
| `DELETE` | `/trainees/{id}`           | Protected — cascades embeddings + attendance      |

### Attendance

| Method  | Path                   | Notes                                                    |
| ------- | ---------------------- | -------------------------------------------------------- |
| `POST`  | `/attendance/checkin`  | `{ frame: base64 }`                                      |
| `POST`  | `/attendance/checkout` | `{ frame: base64 }`                                      |
| `GET`   | `/attendance`          | Protected — query: `date`, `trainee_id`, `from`, `to`    |
| `PATCH` | `/attendance/{id}`     | Protected — `{ checkin_time?, checkout_time?, status? }` |

### Reports & Settings

| Method  | Path              | Notes                                            |
| ------- | ----------------- | ------------------------------------------------ |
| `GET`   | `/reports/export` | Protected — `?format=excel\|pdf&from=...&to=...` |
| `GET`   | `/settings`       | Protected                                        |
| `PATCH` | `/settings`       | Protected — `{ key, value }`                     |

---

## Android Build

```bash
cd frontend
npm run build
npx cap sync android
# Open android/ in Android Studio → Build APK
```

App ID: `com.scanin.app`

---

## Deployment

See [DEPLOY.md](DEPLOY.md) for Oracle Cloud Free Tier (ARM VM) setup with Docker.
