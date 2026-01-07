# Hybrid Deployment Guide: Vercel + GCP

This guide explains how to deploy the **AutoApply** platform using a hybrid strategy:
- **Frontend**: **Vercel** (Global CDN, fast static serving)
- **Backend**: **Google Cloud Platform (GCP)** (via Terraform) for heavy AI agents and Celery workers.

## Prerequisites

1.  **GCP Account**: A Google Cloud Project with billing enabled.
2.  **Vercel Account**: For frontend deployment.
3.  **Supabase Project**: You should already have this.
4.  **CLI Tools Installed**:
    -   `gcloud`
    -   `terraform`
    -   `node` / `npm`

---

## Part 1: Backend Deployment (GCP)

We will use the existing Terraform configuration to deploy the backend services (Application Agent, CV API, Job Discovery) to Cloud Run.

### 1. Setup GCP Environment
Run the following in your terminal:

```bash
# Login to Google Cloud
gcloud auth application-default login

# config project 
gcloud config set project YOUR_PROJECT_ID
```

### 2. Configure Terraform
Navigate to the `terraform` directory and create a `terraform.tfvars` file:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and fill in your details:
```hcl
project_id           = "your-gcp-project-id"
openai_api_key       = "your-openai-key"
supabase_url         = "your-supabase-url"
supabase_service_key = "your-supabase-service-role-key"
github_client_id     = "your-github-id"
github_client_secret = "your-github-secret"
alert_email          = "your-email@example.com"
cors_allowed_origins = "https://your-vercel-app.vercel.app,http://localhost:5173" 
# NOTE: You can update cors_allowed_origins LATER after you get the Vercel URL. 
# For now, you can leave it as "*" or add localhost.
```

### 3. Deploy
```bash
terraform init
terraform apply
```
Type `yes` when prompted.

**Wait for completion (approx 5-10 mins).**

### 4. Note the Outputs
At the end, Terraform will show `service_urls`. Copy these! You will need them for the frontend.
Example:
```
service_urls = {
  "agent_api" = "https://application-agent-api-xyz-uc.a.run.app"
  "cv_api"    = "https://cv-processing-api-xyz-uc.a.run.app"
  "job_api"   = "https://job-discovery-api-xyz-uc.a.run.app"
}
```

---

## Part 2: Frontend Deployment (Vercel)

### 1. Push to GitHub
Ensure your latest code is pushed to a GitHub repository.

### 2. Import in Vercel
1.  Go to [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New..."** -> **"Project"**.
3.  Select your `autoapply-turbo-charge-jobs` repository.

### 3. Configure Environment Variables
In the "Environment Variables" section of the Vercel project setup, add the following. Use the URLs from the Terraform output in Part 1.

| Variable Name | Value (Example) |
| :--- | :--- |
| `VITE_APPLICATION_AGENT_URL` | `https://application-agent-api-xyz-uc.a.run.app` |
| `VITE_CV_API_BASE_URL` | `https://cv-processing-api-xyz-uc.a.run.app` |
| `VITE_JOB_DISCOVERY_URL` | `https://job-discovery-api-xyz-uc.a.run.app` |
| `VITE_SUPABASE_URL` | `your-supabase-url` (from your Supabase dashboard) |
| `VITE_SUPABASE_ANON_KEY` | `your-supabase-anon-key` (NOT service role key!) |

### 4. Deploy
Click **"Deploy"**. Vercel will build your React app and publish it.

---

## Part 3: Final Integration

1.  **Get Vercel URL**: Once deployed, Vercel will give you a domain (e.g., `https://autoapply-xyz.vercel.app`).
2.  **Update Backend CORS**:
    -   Go back to `terraform/terraform.tfvars`.
    -   Update `cors_allowed_origins`:
        ```hcl
        cors_allowed_origins = "https://autoapply-xyz.vercel.app,http://localhost:5173"
        ```
    -   Run `terraform apply` again to update the backend allowed origins.
3.  **Verify**: Open your Vercel URL and try to login/start an application. It should now communicate with your GCP backend.
