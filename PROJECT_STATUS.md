# ArenaFlow Project Status

## Current deployment model
- CI source of truth: root GitHub Actions workflows in `.github/workflows`
- Frontend deployment: Firebase Hosting preview/live from repo root `firebase.json`
- Backend deployment: Railway GitHub autodeploy using root `railway.toml`
- Backend deploy gate: Railway GitHub integration should be configured with `Wait for CI`

## Current application state
- Frontend app lives in `arenaflow/frontend`
- Backend app lives in `arenaflow/backend`
- Public app interfaces are mounted under `/api/v1/{auth,maps,crowd,queue,alerts,vqueue,ml}`, `/health`, `/health/detailed`, and `/ws/{venue_id}`
- Frontend API and websocket URLs derive from `VITE_API_URL`

## Retired deployment paths
- Cloud Run is no longer an active backend deployment target
- Vercel is no longer an active frontend deployment target
- Nested Firebase and GitHub workflow config under `arenaflow/` has been removed so the repo root is the only deploy/config source of truth
