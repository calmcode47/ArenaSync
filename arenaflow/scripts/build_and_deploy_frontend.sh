#!/bin/bash
# build_and_deploy_frontend.sh
# Builds the React frontend and deploys to Firebase Hosting.
# Usage: bash scripts/build_and_deploy_frontend.sh [firebase_project_id]
#
# Prerequisites:
#   - firebase-tools installed: npm install -g firebase-tools
#   - Authenticated: firebase login
#   - frontend/.env.production exists with correct VITE_API_URL

set -e

PROJECT_ID=${1:-""}  # Optional override; uses .firebaserc default if not set

echo "════════════════════════════════════════════"
echo "  ArenaFlow Frontend Build + Deploy"
echo "════════════════════════════════════════════"

# Verify .env.production exists
if [ ! -f "frontend/.env.production" ]; then
  echo "ERROR: frontend/.env.production not found."
  echo "Create it with VITE_API_URL pointing to your Cloud Run URL."
  exit 1
fi

# Verify VITE_API_URL is not a placeholder
if grep -q "XXXX" frontend/.env.production; then
  echo "ERROR: VITE_API_URL in frontend/.env.production still contains placeholder 'XXXX'."
  echo "Update it with your actual Cloud Run URL before deploying."
  exit 1
fi

# Step 1: Install dependencies
echo "[ 1/3 ] Installing frontend dependencies..."
cd frontend
npm ci --silent

# Step 2: Build
echo "[ 2/3 ] Building production bundle..."
npm run build

BUILD_SIZE=$(du -sh dist | awk '{print $1}')
echo "  ✅ Build complete. dist/ size: $BUILD_SIZE"

# Step 3: Deploy to Firebase Hosting
echo "[ 3/3 ] Deploying to Firebase Hosting..."
cd ..

if [ -n "$PROJECT_ID" ]; then
  firebase deploy --only hosting --project "$PROJECT_ID"
else
  firebase deploy --only hosting
fi

echo ""
echo "════════════════════════════════════════════"
echo "  Deployment Complete"
echo "════════════════════════════════════════════"

# Print the live URL
HOSTING_URL=$(firebase hosting:sites:list --json 2>/dev/null | \
  python3 -c "import sys,json; sites=json.load(sys.stdin); \
  print(sites[0].get('defaultUrl','') if sites else '')" 2>/dev/null || echo "")

if [ -n "$HOSTING_URL" ]; then
  echo "  🌐 Live URL: $HOSTING_URL"
else
  # Fallback to default format if site list fails
  PROJECT_DEFAULT=$(cat .firebaserc | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["projects"]["default"])')
  echo "  🌐 Live URL: https://$PROJECT_DEFAULT.web.app"
fi
