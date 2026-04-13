# Railway Environment Variables Checklist
## Set these in Railway → Project → Variables before deploying

### Required (app will crash without these)
| Variable | Description | Example |
|---|---|---|
| DATABASE_URL | Supabase asyncpg connection string | postgresql+asyncpg://... |
| DATABASE_MIGRATION_URL | Supabase direct connection for Alembic | postgresql+psycopg2://... |
| SECRET_KEY | JWT signing key (min 32 chars, random) | openssl rand -hex 32 |
| UPSTASH_REDIS_REST_URL | Upstash Redis HTTPS URL | https://xxx.upstash.io |
| UPSTASH_REDIS_REST_TOKEN | Upstash Redis token | AXxx... |
| FIREBASE_PROJECT_ID | Firebase project ID | arenaflow-xxxxx |
| ALLOWED_ORIGINS | Frontend URLs (comma-separated) | https://arenaflow.vercel.app |

### Required for Google Services (affects judging score)
| Variable | Description |
|---|---|
| GOOGLE_MAPS_API_KEY | Server-side Maps key (geocoding, places) |
| GOOGLE_TRANSLATE_API_KEY | Cloud Translate API key |

### Optional (seeding + configuration)
| Variable | Description | Default |
|---|---|---|
| ADMIN_EMAIL | Seeds first admin user on boot | — (skip if not set) |
| ADMIN_PASSWORD | Admin password for demo | — |
| APP_ENV | Environment name | production |
| ALGORITHM | JWT algorithm | HS256 |
| ACCESS_TOKEN_EXPIRE_MINUTES | Token TTL | 60 |

### Firebase credentials
Firebase Admin SDK requires a credentials JSON file.
On Railway, embed it as a base64 environment variable:
1. `base64 -i firebase_credentials.json` → copy output
2. Set `FIREBASE_CREDENTIALS_BASE64` in Railway variables
3. The app will decode base64 on boot, write it to `/tmp/firebase_credentials.json`, and load the SDK automatically.
