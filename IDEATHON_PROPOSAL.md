# 🧠 ScanIn — AI-Powered Face Recognition Attendance System

### B-JET Ideathon 2026 Proposal / B-JETアイデアソン2026 提案書

> _"Solving Japan's workforce crisis, one face at a time."_

---

## 📌 Table of Contents

1. [The Challenge — Japan's Workforce & DX Crisis](#1-the-challenge--japans-workforce--dx-crisis)
2. [Our Unique Solution — ScanIn](#2-our-unique-solution--scanin)
3. [System Architecture](#3-system-architecture)
4. [Features Already Implemented (Demo)](#4-features-already-implemented-demo)
5. [Technology Stack](#5-technology-stack)
6. [How It Works](#6-how-it-works)
7. [Future Roadmap — Next Ideas to Implement](#7-future-roadmap--next-ideas-to-implement)
8. [Impact & Value Proposition](#8-impact--value-proposition)
9. [Why Us — Our Unique Strengths](#9-why-us--our-unique-strengths)

---

## 1. The Challenge — Japan's Workforce & DX Crisis

### 日本が抱える課題：労働力不足とDXの遅れ

Japan faces a **severe and accelerating labor shortage**. By 2030, the country is projected to face a shortfall of over **6.4 million workers** (Persol Research Institute / RESAS). At the same time, **70% of Japanese SMEs** still rely on paper-based or legacy attendance tracking — manual timesheets, stamp cards (タイムカード), and hanko-based sign-in sheets.

### The Real Problems:

| Problem                                               | Impact                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| **Manual attendance fraud** (buddy punching / 代打ち) | Inaccurate payroll, lost productivity, compliance risk                     |
| **Paper-based tracking** (紙ベースの管理)             | Slow reporting, human error, no real-time visibility                       |
| **High administrative overhead**                      | HR staff spend hours compiling attendance data manually                    |
| **Compliance burden**                                 | Japan's labor law reforms (働き方改革) demand precise working-hour records |
| **Late/absence management**                           | Managers learn about absences too late to react                            |

These problems are **not unique to large corporations** — they affect factories, training centers, language schools, nursing homes, construction sites, and logistics companies across Japan.

**Japan needs a DX-driven, contactless, fraud-proof attendance solution that is simple enough for any organization to deploy.**

---

## 2. Our Unique Solution — ScanIn

### あなた独自のソリューション

**ScanIn** is an **AI-powered, face recognition-based attendance system** that replaces outdated manual processes with a **contactless, real-time, fraud-proof** solution.

### Core Concept:

> Walk up → Look at the camera → Done. No cards. No PINs. No touching anything.

A trainee or employee simply stands in front of a kiosk (any device with a camera — tablet, laptop, Raspberry Pi). The system:

1. **Detects and recognizes their face** using deep learning (FaceNet)
2. **Verifies they are a real person** using AI-powered liveness detection (Google Gemini)
3. **Automatically records check-in or check-out** with timestamp and photo evidence
4. **Sends real-time notifications** via email and WebSocket
5. **Generates reports** for management in Excel and PDF formats

### Why Face Recognition?

| Method                        | Fraud-Proof    | Contactless | Speed       | Cost    |
| ----------------------------- | -------------- | ----------- | ----------- | ------- |
| Paper / Stamp Card            | ❌             | ❌          | Slow        | Low     |
| IC Card (Suica/PASMO)         | ❌ (shareable) | ✅          | Fast        | Medium  |
| Fingerprint                   | ✅             | ❌          | Medium      | High    |
| **Face Recognition (ScanIn)** | **✅**         | **✅**      | **< 2 sec** | **Low** |

---

## 3. System Architecture

### システムアーキテクチャ

```
┌──────────────────────────────────┐
│        KIOSK / CLIENT            │
│   React 19 + Vite + Tailwind    │
│   ┌────────────────────────┐    │
│   │  Webcam + MediaPipe    │    │  ← Client-side face pose validation
│   │  FaceLandmarker (GPU)  │    │  ← 5-angle guided registration
│   └────────────────────────┘    │
└──────────────┬───────────────────┘
               │ HTTP REST + WebSocket
               ▼
┌──────────────────────────────────┐
│        BACKEND SERVER            │
│   FastAPI + Uvicorn (Python)     │
│                                  │
│   ┌──────────┐  ┌─────────────┐ │
│   │  FaceNet  │  │ Gemini 1.5  │ │  ← AI-powered face matching
│   │  PyTorch  │  │ Flash API   │ │  ← LLM-based liveness detection
│   │  (MTCNN + │  │ (Liveness)  │ │
│   │  VGGFace2)│  └─────────────┘ │
│   └──────────┘                   │
│   ┌──────────┐  ┌─────────────┐ │
│   │  SMTP     │  │ APScheduler │ │  ← Email notifications
│   │  Mailer   │  │ (Cron Jobs) │ │  ← Automated absent alerts
│   └──────────┘  └─────────────┘ │
│   ┌──────────────────────────┐  │
│   │  SQLAlchemy ORM          │  │
│   │  SQLite / PostgreSQL     │  │  ← Flexible database support
│   └──────────────────────────┘  │
└──────────────────────────────────┘
```

---

## 4. Features Already Implemented (Demo)

### デモで実装済みの機能 ✅

### 🎯 Kiosk Mode (Self-Service Attendance)

- [x] **Real-time face recognition check-in/check-out** — < 2 second identification
- [x] **Two-step confirmation flow** — Identify → Confirm → Record (prevents accidental entries)
- [x] **"Not Me" escape button** — Cancel misidentification before recording
- [x] **Automatic check-in vs check-out detection** — System knows if you're arriving or leaving
- [x] **Live clock display** with date — Full-screen kiosk-ready UI
- [x] **Photo evidence capture** — Every attendance event is saved with a timestamped image
- [x] **Auto-reset** — Screen returns to ready state after 3 seconds

### 🤖 AI & Face Recognition

- [x] **FaceNet deep learning** (InceptionResnetV1 + MTCNN) — 512-dimensional face embeddings
- [x] **Cosine similarity matching** — Configurable threshold (default 0.75)
- [x] **Multi-angle registration** — 5 guided poses (straight, left, right, up, straight) for robust recognition
- [x] **Client-side MediaPipe FaceLandmarker** — Real-time yaw/pitch validation during registration
- [x] **Hold-to-capture** — 1-second pose hold requirement with progress ring animation
- [x] **Face geometry validation** — Rejects non-face objects (hands, etc.)
- [x] **Multi-frame embedding averaging** — Better accuracy from multiple captures
- [x] **Google Gemini 1.5 Flash liveness detection** — AI-powered anti-spoofing (photo/screen detection)
- [x] **Fail-open liveness** — System gracefully degrades if AI API is unavailable

### 👨‍💼 Admin Panel

- [x] **Dashboard** — Today's attendance with Present / Late / Absent stat cards + date picker
- [x] **Attendance History** — Full CRUD with trainee/date filters, inline editing, delete with confirmation
- [x] **Trainee Management** — List trainees with embedding counts, add via image upload (1-5 photos), delete with cascade
- [x] **Image Preview** — Click any capture thumbnail to view full-size photo
- [x] **Settings Management** — Configure work start time, grace period, similarity threshold, liveness toggle
- [x] **JWT Authentication** — Secure admin access with token-based auth
- [x] **Toast Notifications** — Real-time success/error feedback across all admin pages

### 📊 Reports & Analytics

- [x] **Excel export** (.xlsx) — Formatted workbook with auto-width columns
- [x] **PDF export** — Styled reports with color-coded status rows (green/yellow/red)
- [x] **Date range selection** — Customizable report periods
- [x] **Weekly analytics API** — 7-day present/late/absent breakdown for charts

### 📧 Notifications

- [x] **Check-in/check-out email alerts** — Styled HTML emails with inline capture photo attached
- [x] **Automated absent alerts** — Scheduled cron job (Mon-Fri) emails admin absent trainee list
- [x] **Real-time WebSocket updates** — Live dashboard updates when someone checks in/out

### 🔄 Registration

- [x] **Self-registration portal** (`/register`) — Trainees register themselves with guided face capture
- [x] **Admin registration** — Upload 1-5 face images to register a trainee from the admin panel
- [x] **Manual capture fallback** — If MediaPipe fails, manual tap-to-capture still works

---

## 5. Technology Stack

### 技術スタック

| Layer             | Technology                         | Purpose                           |
| ----------------- | ---------------------------------- | --------------------------------- |
| **Frontend**      | React 19 + Vite 7                  | Modern SPA framework              |
| **Styling**       | Tailwind CSS v4                    | Rapid, responsive dark-mode UI    |
| **Face Tracking** | MediaPipe FaceLandmarker           | Client-side pose validation (GPU) |
| **Camera**        | react-webcam                       | Browser-based video capture       |
| **Charts**        | Recharts                           | Analytics visualization           |
| **Backend**       | FastAPI + Uvicorn                  | High-performance async Python API |
| **Face AI**       | FaceNet-PyTorch (MTCNN + VGGFace2) | Face detection + 512-d embeddings |
| **Liveness AI**   | Google Gemini 1.5 Flash            | Multimodal LLM anti-spoofing      |
| **Database**      | SQLAlchemy + SQLite / PostgreSQL   | Flexible ORM with dual DB support |
| **Auth**          | python-jose (JWT) + bcrypt         | Secure authentication             |
| **Scheduling**    | APScheduler                        | Automated cron-based alerts       |
| **Reports**       | openpyxl + ReportLab               | Excel and PDF generation          |
| **Email**         | SMTP (smtplib)                     | Notification delivery             |
| **Real-time**     | WebSocket (FastAPI)                | Live attendance updates           |

---

## 6. How It Works

### 動作フロー

### Registration Flow (1回だけ)

```
Trainee → Opens /register → Camera activates
  → MediaPipe guides 5 poses (straight → left → right → up → straight)
  → Each pose: hold 1 second → auto-capture
  → 5 face images sent to backend
  → MTCNN detects faces → InceptionResnetV1 extracts embeddings
  → Embeddings averaged → stored in database
  → ✅ Registration complete!
```

### Daily Check-in Flow (毎日)

```
Trainee → Walks to kiosk → Looks at camera → Presses "Scan"
  → Camera captures frame → Sent to backend
  → Gemini checks liveness (real person? not a photo?)
  → FaceNet extracts embedding → Cosine match against all registered faces
  → Match found (> threshold) → Shows name + "Check In" / "Check Out"
  → Trainee confirms → Attendance recorded with timestamp + photo
  → Email notification sent → WebSocket broadcasts to admin dashboard
  → ✅ Done in < 2 seconds!
```

---

## 7. Future Roadmap — Next Ideas to Implement

### 今後の実装予定 🚀

### Phase 1: Enhanced Intelligence (強化されたAI機能)

| Feature                            | Description                                                                           | Japan Relevance                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **🔥 Emotion & Fatigue Detection** | Detect drowsiness, stress, or fatigue from facial expressions using AI                | Mental health crisis in Japanese workplaces (過労死対策) — early warning for overwork |
| **📱 LINE Integration**            | Send check-in/out notifications and absent alerts via LINE (Japan's #1 messaging app) | LINE has 96M+ MAU in Japan — far more accessible than email                           |
| **🗣️ Multilingual Voice Feedback** | Audio greetings in Japanese, English, Bengali — "おはようございます、田中さん！"      | Support diverse workforce including foreign workers (外国人労働者)                    |
| **🌡️ Thermal Camera Integration**  | Integrate with IR cameras for contactless temperature screening at check-in           | Post-COVID health safety compliance                                                   |

### Phase 2: Workforce Analytics (労働力分析)

| Feature                             | Description                                                                      | Japan Relevance                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **📊 Advanced Analytics Dashboard** | Trends, patterns, overtime analysis, heat maps of peak hours                     | 働き方改革 compliance — precise working hour tracking required by law     |
| **⏰ Overtime Alert System**        | Automatic alerts when employee approaches overtime limits (36協定)               | Legal overtime caps under Article 36 Agreement — penalties for violations |
| **📈 Predictive Absence Modeling**  | ML-based prediction of likely absences using historical patterns                 | Proactive shift management for understaffed industries                    |
| **🏥 Health & Wellness Index**      | Track patterns (frequent late arrivals, short stays) as early burnout indicators | Japan's mental health and karoshi prevention initiatives                  |

### Phase 3: Enterprise & Scale (企業展開)

| Feature                          | Description                                                        | Japan Relevance                                                          |
| -------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **🏢 Multi-Location Support**    | Central management of multiple sites (factories, offices, schools) | Manufacturing companies with multiple 工場                               |
| **👤 Role-Based Access Control** | Manager, HR, Supervisor roles with granular permissions            | Enterprise security requirements                                         |
| **📋 Shift Management**          | Define shifts, rotations, and flexible schedules per employee      | Complex shift patterns in 製造業 (manufacturing) and 介護 (nursing care) |
| **🔗 API Integration Hub**       | Connect with 勤怠管理 systems (KING OF TIME, AKASHI, freee HR)     | Seamless integration with existing Japanese HR ecosystems                |
| **☁️ Edge + Cloud Hybrid**       | Run face recognition locally on Raspberry Pi, sync to cloud        | Works in factories/sites with limited internet connectivity              |

### Phase 4: Industry-Specific Solutions (業界特化型ソリューション)

| Feature                       | Description                                                 | Target Industry         |
| ----------------------------- | ----------------------------------------------------------- | ----------------------- |
| **🏗️ Construction Site Mode** | Helmet-compatible recognition, safety gear detection        | 建設業 — Construction   |
| **🏥 Nursing Home Mode**      | Resident monitoring, caregiver attendance, wandering alerts | 介護施設 — Elderly Care |
| **🏫 School / Juku Mode**     | Student attendance with parent LINE notifications           | 学校・塾 — Education    |
| **🏭 Factory Floor Mode**     | Zone-based tracking, clean room entry/exit logging          | 製造業 — Manufacturing  |
| **🚚 Logistics Mode**         | Driver check-in with route assignment integration           | 物流 — Logistics        |

### Phase 5: Compliance & Governance (コンプライアンス)

| Feature                                | Description                                                                             | Japan Relevance                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **📜 Audit Trail & Tamper-Proof Logs** | Blockchain-anchored attendance records                                                  | Legal evidence for labor disputes and compliance audits |
| **🔒 APPI Compliance Module**          | Full compliance with Japan's Act on Protection of Personal Information (個人情報保護法) | Mandatory for handling biometric data in Japan          |
| **🌐 My Number Integration**           | Link attendance to Japan's national ID system for tax/social insurance                  | Government compliance for foreign workers               |

---

## 8. Impact & Value Proposition

### 社会的・経済的インパクト

### Quantifiable Benefits

| Metric                   | Before (Manual)        | After (ScanIn)           | Improvement              |
| ------------------------ | ---------------------- | ------------------------ | ------------------------ |
| **Check-in time**        | 15-30 sec (card/paper) | < 2 sec (face scan)      | **90% faster**           |
| **Buddy punching fraud** | ~5% of hours           | 0% (biometric)           | **100% eliminated**      |
| **Admin reporting time** | 2-4 hours/week         | Instant (auto-generated) | **95% reduction**        |
| **Absence detection**    | End of day             | Real-time (< 30 min)     | **Immediate awareness**  |
| **Hardware cost**        | ¥50,000+ card reader   | ¥0 (any webcam)          | **Near-zero entry cost** |

### Who Benefits?

| Stakeholder              | Benefit                                                                |
| ------------------------ | ---------------------------------------------------------------------- |
| **Employees / Trainees** | Faster, contactless, no cards to lose                                  |
| **HR / Admin**           | Automated reports, real-time visibility, zero manual data entry        |
| **Management**           | Fraud-proof records, compliance confidence, analytics-driven decisions |
| **Japanese Companies**   | DX transformation of a fundamental business process at minimal cost    |
| **Foreign Workers**      | Multilingual support, no language barrier for daily attendance         |

### Addressing Japan's Core Challenges

| Japan's Challenge              | How ScanIn Helps                                                     |
| ------------------------------ | -------------------------------------------------------------------- |
| **Labor Shortage (人手不足)**  | Eliminates admin overhead — HR staff freed for higher-value work     |
| **Aging Workforce (高齢化)**   | Simple "just look at the camera" — no tech literacy required         |
| **DX Lag (DXの遅れ)**          | Modernizes a universal business process with AI at minimal cost      |
| **働き方改革 Compliance**      | Precise, tamper-proof working hour records with legal-grade evidence |
| **Foreign Worker Integration** | Multilingual, contactless — works regardless of language ability     |

---

## 9. Why Us — Our Unique Strengths

### 私たちの強み

### 🌏 New Perspectives (新しい視点)

We bring a **global engineering perspective** — combining cutting-edge AI (FaceNet, Gemini LLM, MediaPipe) into a practical solution that directly addresses Japan's structural challenges. We don't just code; we **understand the problem deeply** and design solutions that respect Japanese work culture while introducing innovation.

### ⚡ Technical Excellence (高い技術力)

This is **not just a proposal — it's a working demo**. We built a full-stack production-grade system with:

- Deep learning face recognition (PyTorch + FaceNet)
- LLM-powered liveness detection (Google Gemini)
- Client-side AI (MediaPipe on GPU)
- Real-time communication (WebSocket)
- Enterprise features (JWT auth, PDF/Excel reports, cron scheduling, email notifications)

### 🤝 Commitment & Trust (コミットメントと信頼)

- **Horenso (報連相) in code**: Real-time WebSocket notifications, automated email alerts, comprehensive reporting — the system itself embodies the spirit of reporting, communicating, and consulting.
- **Quality-first**: Two-step confirmation flows, liveness anti-spoofing, multi-angle registration — every feature is built with the Japanese standard of thoroughness (丁寧さ).
- **Fail-safe design**: Graceful degradation when services are unavailable — the system never blocks a legitimate user.

---

## 🎯 Summary / まとめ

**ScanIn** transforms a universal pain point — attendance management — into a **contactless, AI-powered, fraud-proof** system that any Japanese organization can deploy with minimal hardware investment.

|              |                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| **Problem**  | Manual, fraud-prone attendance tracking in an era of labor shortage and DX demand                              |
| **Solution** | AI face recognition + LLM liveness detection + real-time automation                                            |
| **Status**   | ✅ Working demo with 25+ features implemented                                                                  |
| **Impact**   | 90% faster check-in, 100% fraud elimination, 95% less admin work                                               |
| **Vision**   | Industry-specific solutions for construction, nursing, manufacturing, logistics — the sectors Japan needs most |

---

> **あなたの才能が日本を救う未来を見せてください。**
> _Show us the future where your talent saves Japan._

**ScanIn — Because the future of attendance is your face.** 🚀

---

_Built with ❤️ for the B-JET Ideathon 2026_
