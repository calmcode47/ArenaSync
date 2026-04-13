# Vercel Environment Variables Checklist
## Set these in Vercel → Project → Settings → Environment Variables

| Variable | Value | Notes |
|---|---|---|
| VITE_API_URL | https://your-app.up.railway.app/api/v1 | Railway backend URL + /api/v1 |
| VITE_GOOGLE_MAPS_API_KEY | your_key | Enable: Maps JS, Places, Visualization, Geometry |
| VITE_DEMO_EMAIL | demo@arenaflow.app | Must match seeded user in Supabase |
| VITE_DEMO_PASSWORD | ArenaFlow2026! | Must match seeded user in Supabase |
| VITE_APP_NAME | ArenaFlow | |
| VITE_APP_VERSION | 1.0.0 | |

## Post-Deploy Verification
After deploying, open browser DevTools and verify:
1. Network tab: no CORS errors on API calls
2. Network tab → WS: connection to wss://your-app.up.railway.app/ws/{venueId} shows 101
3. Console: no "Failed to fetch" errors
4. /map route accessible directly (vercel.json rewrite working)
