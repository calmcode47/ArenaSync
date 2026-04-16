# Vercel Checklist Retired

Vercel is not part of the active ArenaFlow deployment path.

Use these production paths instead:
- Frontend: Firebase Hosting via root GitHub Actions workflows
- Backend: Railway GitHub autodeploy gated on successful CI

Frontend runtime configuration should continue to use `VITE_API_URL` for both HTTP and websocket derivation.
