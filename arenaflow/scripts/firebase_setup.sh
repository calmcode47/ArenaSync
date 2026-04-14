#!/bin/bash
# firebase_setup.sh — One-time Firebase project configuration
# Prerequisites: firebase-tools installed (npm install -g firebase-tools)
#                and authenticated (firebase login)
# Usage: bash scripts/firebase_setup.sh YOUR_FIREBASE_PROJECT_ID

set -e

PROJECT_ID=${1:?"Usage: $0 FIREBASE_PROJECT_ID"}

echo "════════════════════════════════════════════"
echo "  ArenaFlow Firebase Setup"
echo "  Project: $PROJECT_ID"
echo "════════════════════════════════════════════"

# Step 1: Set active Firebase project
firebase use "$PROJECT_ID"
echo "✅ Active Firebase project: $PROJECT_ID"

# Step 2: Deploy Firestore rules and indexes
echo "Deploying Firestore security rules..."
firebase deploy --only firestore:rules,firestore:indexes --project "$PROJECT_ID"
echo "✅ Firestore rules deployed"

# Step 3: Create service account credentials for Admin SDK
# (done via GCP console or gcloud — print instructions)
echo ""
echo "════════════════════════════════════════════"
echo "  Manual Step: Create Service Account"
echo "════════════════════════════════════════════"
echo ""
echo "Run these commands to create the Firebase Admin SDK credentials:"
echo ""
echo "  gcloud iam service-accounts create arenaflow-firebase-admin \\"
echo "    --display-name='ArenaFlow Firebase Admin' \\"
echo "    --project=$PROJECT_ID"
echo ""
echo "  gcloud projects add-iam-policy-binding $PROJECT_ID \\"
echo "    --member='serviceAccount:arenaflow-firebase-admin@$PROJECT_ID.iam.gserviceaccount.com' \\"
echo "    --role='roles/firebase.admin'"
echo ""
echo "  gcloud iam service-accounts keys create firebase_credentials.json \\"
echo "    --iam-account=arenaflow-firebase-admin@$PROJECT_ID.iam.gserviceaccount.com \\"
echo "    --project=$PROJECT_ID"
echo ""
echo "Then encode for Cloud Run:"
echo "  base64 -i firebase_credentials.json | tr -d '\\n'"
echo "  → Set as FIREBASE_CREDENTIALS_BASE64 in Cloud Run env vars"
echo ""

# Step 4: Enable Firebase Auth providers (print instructions)
echo "════════════════════════════════════════════"
echo "  Enable Firebase Auth Providers"
echo "════════════════════════════════════════════"
echo ""
echo "In Firebase Console → Authentication → Sign-in method, enable:"
echo "  ✅ Email/Password"
echo "  ✅ Anonymous (optional, for guest attendees)"
echo ""
echo "Auth is used for:"
echo "  • POST /auth/firebase-login (backend verifies Firebase ID tokens)"
echo "  • FCM token registration (authenticated users only)"
echo ""

# Step 5: Enable Cloud Messaging
echo "════════════════════════════════════════════"
echo "  Firebase Cloud Messaging (FCM)"
echo "════════════════════════════════════════════"
echo ""
echo "In Firebase Console → Project Settings → Cloud Messaging:"
echo "  1. Note your Server Key (used as FIREBASE_SERVER_KEY if needed)"
echo "  2. Note your Sender ID"
echo "  3. FCM is enabled by default for all Firebase projects"
echo ""
echo "The backend uses Admin SDK to send FCM messages — no Server Key needed."
echo "Just ensure FIREBASE_CREDENTIALS_BASE64 is set in Cloud Run."
echo ""
echo "✅ Firebase setup complete."
