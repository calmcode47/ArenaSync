#!/bin/bash
# gcloud_setup.sh — One-time GCP infrastructure provisioning for ArenaFlow
# Prerequisites: gcloud CLI installed and authenticated (gcloud auth login)
# Usage: bash scripts/gcloud_setup.sh YOUR_PROJECT_ID us-central1

set -e

PROJECT_ID=${1:?"Usage: $0 PROJECT_ID [REGION]"}
REGION=${2:-"us-central1"}
AR_REPO="arenaflow"
SERVICE_NAME="arenaflow-backend"

echo "════════════════════════════════════════════"
echo "  ArenaFlow GCP Infrastructure Setup"
echo "  Project: $PROJECT_ID | Region: $REGION"
echo "════════════════════════════════════════════"

# Step 1: Set project
gcloud config set project "$PROJECT_ID"
echo "✅ Active project: $PROJECT_ID"

# Step 2: Enable required APIs
echo "Enabling GCP APIs (this takes ~60 seconds)..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --quiet
echo "✅ APIs enabled"

# Step 3: Create Artifact Registry repository (Docker format)
gcloud artifacts repositories create "$AR_REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="ArenaFlow container images" \
  --quiet 2>/dev/null || echo "ℹ️  Repository '$AR_REPO' already exists — skipping"
echo "✅ Artifact Registry: $REGION-docker.pkg.dev/$PROJECT_ID/$AR_REPO"

# Step 4: Configure Docker authentication for Artifact Registry
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet
echo "✅ Docker configured for Artifact Registry"

# Step 5: Grant Cloud Build service account permissions to deploy to Cloud Run
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
CLOUD_BUILD_SA="$PROJECT_NUMBER@cloudbuild.gserviceaccount.com"

echo "Granting IAM permissions to Cloud Build service account ($CLOUD_BUILD_SA)..."

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CLOUD_BUILD_SA" \
  --role="roles/run.admin" --quiet

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CLOUD_BUILD_SA" \
  --role="roles/iam.serviceAccountUser" --quiet

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CLOUD_BUILD_SA" \
  --role="roles/artifactregistry.writer" --quiet

echo "✅ Cloud Build IAM permissions granted"

# Step 6: Print next steps
echo ""
echo "════════════════════════════════════════════"
echo "  Setup Complete. Next Steps:"
echo "════════════════════════════════════════════"
echo ""
echo "1. Set environment variables in Cloud Run:"
echo "   gcloud run services update $SERVICE_NAME \\"
echo "     --region=$REGION \\"
echo "     --set-env-vars DATABASE_URL='postgresql+asyncpg://...' \\"
echo "     --set-env-vars SECRET_KEY='...' \\"
echo "     --set-env-vars UPSTASH_REDIS_REST_URL='...' \\"
echo "     --set-env-vars UPSTASH_REDIS_REST_TOKEN='...' \\"
echo "     --set-env-vars FIREBASE_PROJECT_ID='...' \\"
echo "     --set-env-vars FIREBASE_CREDENTIALS_BASE64='...' \\"
echo "     --set-env-vars ALLOWED_ORIGINS='https://your-frontend.web.app'"
echo ""
echo "2. Trigger first deployment:"
echo "   gcloud builds submit --config=cloudbuild.yaml \\"
echo "     --substitutions=_REGION=$REGION,_AR_REPO=$AR_REPO,_SERVICE=$SERVICE_NAME ."
echo ""
echo "3. Get your Cloud Run URL:"
echo "   gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'"
echo ""
echo "4. Set VITE_API_URL in Vercel/Firebase Hosting to:"
echo "   https://[cloud-run-url]/api/v1"
