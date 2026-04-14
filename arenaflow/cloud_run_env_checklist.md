# Cloud Run Environment Variables Checklist
## Set via gcloud CLI or Cloud Run Console → Edit & Deploy New Revision → Variables

### Set ALL of these before the first deployment:

```bash
gcloud run services update arenaflow-backend \
  --region=us-central1 \
  --set-env-vars="APP_ENV=production" \
  --set-env-vars="SECRET_KEY=$(openssl rand -hex 32)" \
  --set-env-vars="ALGORITHM=HS256" \
  --set-env-vars="ACCESS_TOKEN_EXPIRE_MINUTES=60" \
  --set-env-vars="DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?prepared_statement_cache_size=0" \
  --set-env-vars="DATABASE_MIGRATION_URL=postgresql+psycopg2://postgres.[ref]:[pass]@db.[ref].supabase.co:5432/postgres" \
  --set-env-vars="UPSTASH_REDIS_REST_URL=https://[your].upstash.io" \
  --set-env-vars="UPSTASH_REDIS_REST_TOKEN=[token]" \
  --set-env-vars="FIREBASE_PROJECT_ID=[your-project-id]" \
  --set-env-vars="FIREBASE_CREDENTIALS_BASE64=[base64-encoded-credentials-json]" \
  --set-env-vars="GOOGLE_MAPS_API_KEY=[key]" \
  --set-env-vars="GOOGLE_TRANSLATE_API_KEY=[key]" \
  --set-env-vars="ALLOWED_ORIGINS=https://[your-frontend].web.app,https://[your-frontend].vercel.app" \
  --set-env-vars="ADMIN_EMAIL=admin@arenaflow.app" \
  --set-env-vars="ADMIN_PASSWORD=ArenaFlow2026!" \
  --set-env-vars="DEMO_STAFF_EMAIL=demo@arenaflow.app" \
  --set-env-vars="DEMO_STAFF_PASSWORD=ArenaFlow2026!" \
  --set-env-vars="DEMO_VENUE_ID=[venue-uuid-from-seed-script]"
```

### How to generate FIREBASE_CREDENTIALS_BASE64:
```bash
base64 -i firebase_credentials.json | tr -d '\n'
# Paste the output as the value for FIREBASE_CREDENTIALS_BASE64
```

### After setting env vars, verify the service is healthy:
```bash
curl https://[your-service-url].run.app/health
# Expected: {"status": "ok", "env": "production"}
```
