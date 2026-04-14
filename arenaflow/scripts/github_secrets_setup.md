# GitHub Repository Configuration Guide
## Required for CI/CD Auto-Deployment to Cloud Run

### Step 1: Create a GCP Service Account for GitHub Actions

Run these commands in your local terminal (ensure you are authenticated with `gcloud` and have the correct project set):

```bash
# Create service account
gcloud iam service-accounts create github-actions-deploy \
  --display-name="GitHub Actions Deployer" \
  --project=YOUR_PROJECT_ID

# Grant required roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Create and download key
gcloud iam service-accounts keys create github_deploy_key.json \
  --iam-account=github-actions-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Encode for GitHub secret
base64 -i github_deploy_key.json | tr -d '\n'
# → copy this output
```

### Step 2: Add GitHub Secret

Go to: **GitHub Repo → Settings → Secrets and variables → Actions → New repository secret**
- **Name**: `GCP_SA_KEY`
- **Value**: Paste the base64 output from Step 1

### Step 3: Add GitHub Variables

Go to: **GitHub Repo → Settings → Secrets and variables → Actions → Variables → New repository variable**

| Name | Value |
|---|---|
| `GCP_PROJECT_ID` | `flowarena-694a7` (or your actual GCP project ID) |
| `GCP_REGION` | `us-central1` (or your chosen region) |
| `AR_REPO` | `arenaflow` |
| `CLOUD_RUN_SERVICE` | `arenaflow-backend` |

### Step 4: Verify

Push any commit to `main`. After all CI jobs (`backend-quality`, `backend-tests`, `frontend-build`, `repo-size-check`) pass, the `deploy-backend` job will automatically build and deploy the application to Cloud Run.

Monitor progress at: [https://console.cloud.google.com/cloud-build/builds](https://console.cloud.google.com/cloud-build/builds)
