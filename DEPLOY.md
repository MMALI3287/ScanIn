# Deploying ScanIn

Two deployment options:

- **Option A (recommended)**: Host only the backend, use the Android app as the frontend
- **Option B**: Host both backend + web frontend via Docker

---

## Backend: Oracle Cloud Free Tier

### Prerequisites

- Oracle Cloud account with Always Free Tier
- An ARM64 (Ampere A1) VM instance (recommended: 2 vCPU, 6 GB RAM)
- Ubuntu 22.04 or 24.04 as the OS image

### 1. Create the VM Instance

1. Go to **Compute → Instances → Create Instance**
2. Image: **Ubuntu 22.04** (or 24.04)
3. Shape: **VM.Standard.A1.Flex** (ARM), 2 OCPUs, 6 GB RAM
4. Add your SSH public key
5. Create the instance
6. Note the **Public IP**

#### Open Firewall Ports

In **Networking → Virtual Cloud Networks → your VCN → Security Lists → Default**:

- Add ingress rule: Source `0.0.0.0/0`, Protocol TCP, Destination Port `8000`

On the VM itself:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT
sudo netfilter-persistent save
```

### 2. Install Docker on the VM

```bash
ssh ubuntu@<PUBLIC_IP>

curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
sudo apt-get install -y docker-compose-plugin
```

### 3. Upload and Configure

```bash
# From your local machine — upload only the backend
scp -r backend docker-compose.yml ubuntu@<PUBLIC_IP>:~/scanin/
```

On the server:

```bash
cd ~/scanin
cp backend/.env.example backend/.env
nano backend/.env   # Fill in your real API keys and secrets
```

Generate a secure JWT secret:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 4. Deploy (backend only)

```bash
cd ~/scanin
docker compose up -d backend
```

The API will be available at `http://<PUBLIC_IP>:8000`.

#### Useful Commands

```bash
docker compose logs -f backend    # View logs
docker compose restart backend    # Restart
docker compose up -d --build backend  # Rebuild after code changes
docker compose down               # Stop
```

---

## Option A: Android App (recommended)

Use the Android APK as the frontend — no need to host any web server.

### Prerequisites

- [Android Studio](https://developer.android.com/studio) installed on your dev machine
- Node.js 18+

### 1. Set your backend URL

Edit `frontend/.env.production`:

```
VITE_API_URL=http://<YOUR_SERVER_PUBLIC_IP>:8000/api/v1
```

### 2. Build and sync

```bash
cd frontend
npm install
npm run build
npx cap sync android
```

### 3. Open in Android Studio

```bash
npx cap open android
```

This opens the project in Android Studio. From there:

- **Run on device**: Connect a phone via USB, click Run
- **Build APK**: Build → Build Bundle(s) / APK(s) → Build APK(s)
- The APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`

### 4. Install on phones

Copy the APK to any Android phone and install it. That's it — the app connects to your backend.

> **Camera permission**: The app will request camera access on first use. This is required for face recognition.

---

## Option B: Full Web Stack (backend + frontend)

If you prefer a web app instead of the Android app, deploy both via Docker.

### Additional Firewall Rule

Open port 80 (and optionally 443) in Oracle Cloud security list and iptables:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo netfilter-persistent save
```

### Build and Upload Frontend

```bash
cd frontend
npm run build
cd ..
scp -r frontend/dist nginx.conf ubuntu@<PUBLIC_IP>:~/scanin/
```

### Deploy Both Services

```bash
cd ~/scanin
docker compose up -d --build
```

The web app will be available at `http://<PUBLIC_IP>`.

### Optional: HTTPS with Let's Encrypt

```bash
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d yourdomain.com
```

Then update `nginx.conf` to use SSL certificates and change the compose port to `443:443`.

---

## Notes

- **Database** is hosted on NeonDB (PostgreSQL) — no local DB file or volume needed
- **Captured images** are stored in Cloudflare R2 — no local volume needed
- **First login**: username `admin`, password `admin123` — change immediately in Settings
- The FaceNet model (~100MB) downloads on first startup, so the first boot takes a few minutes
- ARM64 is fully supported — PyTorch CPU and facenet-pytorch work natively on Ampere
