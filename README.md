# CareCircle

> Connected, compassionate care coordination for elderly loved ones.

CareCircle is a lightweight, cloud-ready elderly care coordination platform designed to help family members, caregivers, and seniors stay in sync with daily routines, health check-ins, and emergency alert notifications.

---

## 1. Problem Statement

Aging in place allows seniors to maintain independence, comfort, and familiarity in their own homes. However, it often presents major caregiving challenges:
- **Fragmented Communication**: Family members, professional caregivers, and healthcare aides frequently operate in silos without a unified communication channel.
- **Missed Check-ins & Alerts**: Time-sensitive reminders (medications, appointments, hydration) can be overlooked without automated, reliable alert notifications.
- **Complex Setups**: Many existing medical monitoring systems are complex, intrusive, or expensive for families needing a straightforward coordination tool.
- **Development & Staging Bottlenecks**: Developers and testers often struggle to run notification systems locally without live SMTP credentials or risking unintended real-world email dispatches.

CareCircle addresses these issues with an intuitive web platform, client-side resilience, automated email dispatch with a built-in safe "preview mode", and a containerized architecture deployable to Google Cloud Run.

---

## 2. Key Features

- **Static Frontend Serving**: Fast and minimal static frontend delivered directly via Express from `/public` (`index.html`, `style.css`, `app.js`).
- **Client-Side Persistence**: Stores care circle records, daily check-ins, and reminders in `localStorage` for responsive offline-friendly operations before database connection.
- **Automated Email Notifications**: Backend endpoint (`POST /api/send-email`) powered by Nodemailer using Gmail SMTP.
- **Safe Development Preview Mode**: If email credentials (`EMAIL_USER`, `EMAIL_PASS`) are absent from the environment, the server automatically responds with a `{ preview: true, ... }` payload containing the email body, preventing runtime failures and accidental dispatches during local development.
- **Health Check Monitoring**: Lightweight `GET /health` endpoint for container health probes and uptime monitoring.
- **Cloud Run Native**: Fully containerized using `node:20-alpine` with deterministic dependency locking (`npm ci --omit=dev`) and port flexibility (`PORT=8080`).

---

## 3. Tech Stack

- **Backend Runtime**: [Node.js](https://nodejs.org/) (v20+)
- **Server Framework**: [Express.js](https://expressjs.com/) (v4)
- **Email Service**: [Nodemailer](https://nodemailer.com/) (Gmail SMTP integration)
- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (ES6+) with `localStorage` persistence
- **Containerization**: [Docker](https://www.docker.com/) (`node:20-alpine`)
- **Cloud Infrastructure**: [Google Cloud Run](https://cloud.google.com/run)

---

## 4. How to Run Locally

### Prerequisites
- Node.js (version 20 or higher)
- npm (version 9 or higher)

### Installation
1. Clone the repository and navigate into the project directory:
   ```bash
   cd "Elderly care platform"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration
3. Create your `.env` file from the example template:
   ```bash
   cp .env.example .env
   ```

4. Configure environment variables in `.env`:
   ```env
   PORT=8080
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-gmail-app-password
   ```
   > **Note on Gmail SMTP**: If 2-Step Verification is active on your Google account, generate an **App Password** under `Google Account > Security > 2-Step Verification > App passwords`. Never use your personal Google account password directly.
   > 
   > **Preview Mode**: You can leave `EMAIL_USER` and `EMAIL_PASS` blank or unset. The server will automatically return an email preview object instead of failing or attempting network delivery.

### Starting the Server
- **Production Mode**:
  ```bash
  npm start
  ```
- **Development Mode** (with automatic restart on file changes):
  ```bash
  npm run dev
  ```

Open your browser at [http://localhost:8080](http://localhost:8080) to access the application.

### Testing the Email Endpoint
You can test the notification endpoint using `curl` or PowerShell:

```bash
curl -X POST http://localhost:8080/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "caregiver@example.com",
    "subject": "CareCircle Alert: Morning Check-in Completed",
    "text": "Daily check-in for Eleanor completed at 9:00 AM."
  }'
```

If credentials are not configured, the response will be:
```json
{
  "preview": true,
  "message": "EMAIL_USER or EMAIL_PASS environment variables are not configured. Returning email preview.",
  "email": {
    "to": "caregiver@example.com",
    "subject": "CareCircle Alert: Morning Check-in Completed",
    "text": "Daily check-in for Eleanor completed at 9:00 AM.",
    "html": null,
    "timestamp": "2026-11-15T07:00:00.000Z"
  }
}
```

---

## 5. How to Deploy to Google Cloud Run

### 1. Build and Test Container Locally
Build the Docker container image:
```bash
docker build -t carecircle:latest .
```

Run the container locally:
```bash
docker run -p 8080:8080 --env-file .env carecircle:latest
```

### 2. Deploy to Google Cloud Run
CareCircle is designed to deploy directly to Google Cloud Run:

```bash
# Set your Google Cloud project
gcloud config set project YOUR_PROJECT_ID

# Build and submit the container to Google Artifact Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/carecircle:latest

# Deploy to Cloud Run
gcloud run deploy carecircle \
  --image gcr.io/YOUR_PROJECT_ID/carecircle:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "EMAIL_USER=your-email@gmail.com" \
  --set-secrets "EMAIL_PASS=carecircle-email-pass:latest"
```

> **Security Best Practice**: In Google Cloud Run, store `EMAIL_PASS` in **Google Cloud Secret Manager** and inject it as a secret reference (`--set-secrets`) rather than plain text environment variables.

---

## 6. Project Structure

```
CareCircle/
├── public/
│   ├── index.html       # Static frontend entry point
│   ├── style.css        # Application styling baseline
│   └── app.js           # Frontend client & localStorage persistence
├── .dockerignore        # Build context exclusions
├── .env.example         # Environment template
├── .gitignore           # Git ignore rules (node_modules, .env)
├── Dockerfile           # Cloud Run container specification (node:20-alpine)
├── package.json         # Project manifests and scripts
├── package-lock.json    # Locked dependency tree for npm ci
├── README.md            # Platform documentation and architecture
└── server.js            # Express server & Nodemailer /api/send-email endpoint
```

---

## 7. Roadmap

- [x] **Phase 1: Project Skeleton & Containerization**
  - Express static file server (`/public`)
  - Cloud Run ready Dockerfile (`node:20-alpine`, `npm ci --omit=dev`)
  - Email notification API with preview fallback mode
  - Client-side storage scaffolding (`localStorage`)
- [ ] **Phase 2: Care Dashboard UI**
  - Senior profile setup & medical history summary
  - Daily checklist (medications, meals, hydration, physical exercise)
  - Emergency SOS trigger button with instant caregiver notification
- [ ] **Phase 3: Multi-User Collaboration & Authentication**
  - Role-based access control (Senior, Primary Caregiver, Family Member, Doctor)
  - User authentication (Google OAuth / Passkeys)
  - Persistent database integration (PostgreSQL / Firestore)
- [ ] **Phase 4: Multi-Channel Alerts & Telemetry**
  - SMS & Voice call alerts (Twilio integration)
  - Push notifications via Web Push API
- [ ] **Phase 5: Smart Device & IoT Integrations**
  - Smart pill dispenser synchronization
  - Fall-detection sensor webhooks & wearables integration
