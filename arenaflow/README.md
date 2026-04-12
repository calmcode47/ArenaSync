# ArenaFlow — Smart Venue Intelligence Platform

![ArenaFlow Banner](https://via.placeholder.com/1200x400/0a0a0f/00d4ff?text=ArenaFlow+Tactical+Venue+Operations)

**ArenaFlow** is a next-generation command-and-control platform designed for large-scale sports stadiums, concerts, and mass gatherings. It ingests thousands of live telemetry points to solve the most painful part of major events: catastrophic crowd surges and unpredictable wait times.

By unifying 3D spatial modeling, predictive Machine Learning (Prophet), and multi-lingual global directives into one dark-themed "tactical ops" dashboard, ArenaFlow ensures that attendees stay safe and staff stay ahead of the curve.

---

## 🏛️ Architecture Overview
```text
[ Client Application (React/Three.js) ]
       |                  | (WebSocket)
       v                  v
[ FastAPI Core Backend & WebSockets ]  <--- [ Prophet ML Worker (Queue/Wait Prediction) ]
    /          |             \
   v           v              v
[PostgreSQL] [Upstash Redis] [Firebase Admin SDK]
```

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

## 🚀 Setup & Launch Instructions

### 1. Prerequisites
- `Node.js 18+` and `npm`
- `Python 3.11+`
- `Docker` and `docker-compose`

### 2. Backend Bootup (via Docker)
1. Clone the repository and navigate to the project directory: `cd ArenaFlow`
2. Configure your Environment Variables: Create a `backend/.env` file with your connection strings (see Environment Variables section).
3. Spin up the Postgres database and FastAPI server via Compose:
   ```bash
   docker-compose up -d --build
   ```
4. Confirm FastAPI is running: Navigate to [http://localhost:8000/docs](http://localhost:8000/docs) to view the Swagger API reference.

### 3. Frontend Bootup
1. Setup the client UI framework:
   ```bash
   cd frontend
   npm install --legacy-peer-deps
   ```
2. Setup environment keys: Create `.env` storing `VITE_GOOGLE_MAPS_API_KEY`.
3. Launch the development server:
   ```bash
   npm run dev
   ```

---

## 🔑 Environment Variables Reference

#### Backend (`backend/.env`)
```
APP_ENV=development
SECRET_KEY=supersecretkey...
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/arenaflow
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=token...
FIREBASE_CREDENTIALS_PATH=./firebase-deploy.json
GOOGLE_MAPS_API_KEY=AIz...
GOOGLE_TRANSLATE_API_KEY=AIy...
```

#### Frontend (`frontend/.env`)
```
VITE_GOOGLE_MAPS_API_KEY=AIy...
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE). Built expressly for the *PromptWars* hackathon.
