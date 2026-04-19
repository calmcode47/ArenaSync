#!/bin/bash
# deploy.sh — ArenaFlow backend deployment trigger
# Usage: bash scripts/deploy.sh [PROJECT_ID] [REGION]
# Submits a Cloud Build job from the current directory.

set -e

PROJECT_ID=${1:?"Usage: $0 PROJECT_ID [REGION]"}
REGION=${2:-"us-central1"}
AR_REPO="arenaflow"
SERVICE_NAME="arenaflow-backend"

echo "[ ArenaFlow ] Submitting Cloud Build deployment..."
echo "  Project: $PROJECT_ID"
echo "  Region:  $REGION"
echo "  Service: $SERVICE_NAME"
echo ""

SHORT_SHA=$(git rev-parse --short HEAD || echo "manual")

gcloud builds submit \
  --project="$PROJECT_ID" \
  --config=cloudbuild.yaml \
  --substitutions="_REGION=$REGION,_AR_REPO=$AR_REPO,_SERVICE=$SERVICE_NAME,SHORT_SHA=$SHORT_SHA" \
  .

echo ""
echo "[ ArenaFlow ] Deployment submitted. Monitor at:"
echo "  https://console.cloud.google.com/cloud-build/builds?project=$PROJECT_ID"
echo ""

# Fetch and print the live URL
URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(status.url)" 2>/dev/null || echo "pending")

if [ "$URL" != "pending" ]; then
  echo "[ ArenaFlow ] Live URL: $URL"
  echo "  Health check: $URL/health"
fi
