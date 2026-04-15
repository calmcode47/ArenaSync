# ArenaFlow — Smart Venue Intelligence Platform

![ArenaFlow Banner](https://via.placeholder.com/1200x400/0a0a0f/00d4ff?text=ArenaFlow+Tactical+Venue+Operations)

**ArenaFlow** is a next-generation command-and-control platform designed for large-scale sports stadiums, concerts, and mass gatherings. It ingests thousands of live telemetry points to solve the most painful part of major events: catastrophic crowd surges and unpredictable wait times.

By unifying 3D spatial modeling, predictive Machine Learning (Prophet), and multi-lingual global directives into one dark-themed "tactical ops" dashboard, ArenaFlow ensures that attendees stay safe and staff stay ahead of the curve.

---

## 🏗️ Production Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                        │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
          ┌────────────▼────────────┐
          │   Firebase Hosting      │  https://[project].web.app
          │   React 18 + Vite SPA   │  (or Vercel)
          └────────────┬────────────┘
                       │ HTTPS REST + WSS WebSocket
          ┌────────────▼────────────┐
          │   Google Cloud Run      │  https://[service].run.app
          │   FastAPI + Uvicorn     │  Auto-scales 0→3 instances
          └──┬─────────┬────────────┘
             │         │
    ┌────────▼──┐  ┌───▼──────────┐
    │ Supabase  │  │ Upstash Redis│
    │ PostgreSQL│  │ Cache + Pub  │
    │ (primary) │  │ Sub (HTTP)   │
    └───────────┘  └──────────────┘
             │
    ┌────────▼──────────┐
    │ Firebase Admin SDK │
    │ Auth + FCM Push    │
    └────────────────────┘
```

### Service URLs
| Service | URL | Purpose |
|---|---|---|
| Frontend | `https://[project].web.app` | React SPA |
| Backend | `https://[service].run.app` | FastAPI REST + WS |
| Database | Supabase | PostgreSQL 15 |
| Cache | Upstash | Redis (serverless) |
| Auth/Push | Firebase | Auth + FCM |

---

---

## 🛠️ Technology Stack

| Domain | Tech |
|---|---|
| **Frontend** | React, TypeScript, Zustand, TailWindCSS v4, Framer Motion, Three.js (@react-three/fiber), Recharts |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0 (async), Alembic, asyncpg |
| **Machine Learning** | Prophet (Time-Series Forecasting), Scikit-learn (Congestion Random Forest) |
| **Google APIs** | Google Maps JS Route + Places + Visualization (Heatmap), Google Cloud Translate API |
| **Infrastructure** | Fully Dockerized (Compose), PostgreSQL 16, Upstash Redis (Serverless), Firebase FCM |

---

## 🔥 Key Features

- **Real-time 3D Venue Visualization:** Interactive `@react-three/fiber` Stadium wireframes mapping live sector occupancy constraints over top of dense particle crowd simulations.
- **Queue Intelligence via Prophet:** Predicts the best gates to utilize up to 30 minutes in the future by executing aggressive time-series math over historical ticketing flow.
- **Global Communications (8+ Languages):** Seamless single-click alert dissemination using Google Cloud Translation, bypassing typical event radio confusion.
- **Heatmap Layer Generation:** Integrates natively with the Google Maps `HeatmapLayer` library to color code congestion bottlenecks outside the arena grounds.
- **Live-Streaming WebSockets:** Re-routes complex payloads locally with zero HTTP polling latency. Room-based partitioning scales alerts exactly to the sectors experiencing stress.
- **FCM Push Intercepts:** Overrides to physical Android/iOS devices for emergency and evacuation protocol alerts. 
- **Scikit-learn Congestion Matrices:** Determines the hidden "density limit" of pathways using dynamic algorithms mapped against standard fire-marshal capacities.

---

---

## 🚀 Deployment & DevOps

### 🛠️ Production Automation Scripts
Located in the `scripts/` directory, these tools automate the entire infrastructure setup:

- **[gcloud_setup.sh](file:///Users/mayank/Documents/GitHub/ArenaSync/arenaflow/scripts/gcloud_setup.sh)**: Provisions GCP APIs, Artifact Registry, and IAM roles for Cloud Run.
- **[firebase_setup.sh](file:///Users/mayank/Documents/GitHub/ArenaSync/arenaflow/scripts/firebase_setup.sh)**: Deploys Firestore rules and provides instructions for Firebase Admin setup.
- **[build_and_deploy_frontend.sh](file:///Users/mayank/Documents/GitHub/ArenaSync/arenaflow/scripts/build_and_deploy_frontend.sh)**: Automates the Vite production build and Firebase Hosting deployment.
- **[deploy.sh](file:///Users/mayank/Documents/GitHub/ArenaSync/arenaflow/scripts/deploy.sh)**: Convenience wrapper for triggering Cloud Build deployments.

### 🤖 CI/CD Pipeline
ArenaFlow utilizes **GitHub Actions** for continuous integration and delivery. 
- **Workflow**: `.github/workflows/ci.yml`
- **Actions**: Linting (Ruff/Black), Type Checking (Mypy/TSC), Automated Tests (Pytest), and **Auto-Deployment** to Cloud Run on push to `main`.
- **Setup**: See [github_secrets_setup.md](file:///Users/mayank/Documents/GitHub/ArenaSync/arenaflow/scripts/github_secrets_setup.md) for configuring repository secrets.

---

## 🚀 Setup & Launch Instructions

### 1. Local Development
1. **Prerequisites**: Node.js 18+, Python 3.11+, Docker.
2. **Backend**: `cd ArenaFlow && docker-compose up -d --build`
3. **Frontend**: `cd frontend && npm install && npm run dev`

### 2. Production Deployment (Cloud)
To deploy the full-stack infrastructure to GCP and Firebase:

```bash
# 1. Provision GCP Resources
bash scripts/gcloud_setup.sh

# 2. Deploy Backend via Cloud Build
gcloud builds submit --config cloudbuild.yaml .

# 3. Setup Firebase Notifications/Hosting
bash scripts/firebase_setup.sh
bash scripts/build_and_deploy_frontend.sh
```

---

## 🔍 Observability & Health
ArenaFlow includes a specialized health monitoring system:
- **Liveness Probe**: `GET /health` (Status: 200)
- **Detailed Audit**: `GET /health/detailed`
  - In-depth verification of Database, Redis, Firebase, and ML engines status.
  - Requires admin privileges in production.

---

## 🔑 Environment Variables Reference

#### Backend (`backend/.env` or Secret Manager)
| Variable | Purpose |
|---|---|
| `APP_ENV` | `development` or `production` |
| `DATABASE_URL` | Supabase / Postgres connection string |
| `FIREBASE_CREDENTIALS_BASE64` | Encoded service account for Cloud Run |
| `UPSTASH_REDIS_REST_URL` | Serverless Redis endpoint |

#### Frontend (`frontend/.env.production`)
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Your Cloud Run Service URL |
| `VITE_FIREBASE_API_KEY` | Public Firebase Config |

---

## 📄 License
This project is licensed under the [MIT License](LICENSE). Built expressly for the *PromptWars* hackathon.
