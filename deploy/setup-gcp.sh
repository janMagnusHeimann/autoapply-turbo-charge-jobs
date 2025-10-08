#!/bin/bash
# Initial GCP setup script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}     AutoApply GCP Setup Script${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed${NC}"
    echo "Please install it from: https://www.terraform.io/downloads"
    exit 1
fi

# Get project ID
echo -e "\n${YELLOW}📋 Enter your GCP Project ID:${NC}"
read -p "> " PROJECT_ID

# Set project
gcloud config set project $PROJECT_ID

# Authenticate
echo -e "\n${YELLOW}🔐 Authenticating with GCP...${NC}"
gcloud auth login
gcloud auth application-default login

# Enable required APIs
echo -e "\n${YELLOW}🔧 Enabling required GCP APIs...${NC}"
gcloud services enable \
    cloudrun.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    cloudtasks.googleapis.com \
    secretmanager.googleapis.com \
    compute.googleapis.com \
    cloudscheduler.googleapis.com \
    servicenetworking.googleapis.com \
    vpcaccess.googleapis.com \
    monitoring.googleapis.com \
    logging.googleapis.com

echo -e "${GREEN}✅ APIs enabled${NC}"

# Create Terraform state bucket
BUCKET_NAME="${PROJECT_ID}-terraform-state"
echo -e "\n${YELLOW}🪣 Creating Terraform state bucket: $BUCKET_NAME${NC}"
gsutil mb -p $PROJECT_ID -l us-central1 gs://$BUCKET_NAME/ 2>/dev/null || echo "Bucket already exists"
gsutil versioning set on gs://$BUCKET_NAME/
echo -e "${GREEN}✅ State bucket ready${NC}"

# Create service account for Terraform
echo -e "\n${YELLOW}👤 Creating Terraform service account...${NC}"
SA_NAME="terraform-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create $SA_NAME \
    --display-name="Terraform Service Account" \
    2>/dev/null || echo "Service account already exists"

# Grant necessary roles
echo -e "\n${YELLOW}🔑 Granting IAM roles...${NC}"
ROLES=(
    "roles/editor"
    "roles/iam.serviceAccountAdmin"
    "roles/resourcemanager.projectIamAdmin"
    "roles/secretmanager.admin"
    "roles/run.admin"
    "roles/cloudsql.admin"
    "roles/redis.admin"
    "roles/cloudtasks.admin"
    "roles/artifactregistry.admin"
    "roles/compute.networkAdmin"
)

for role in "${ROLES[@]}"; do
    echo "  Granting $role..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$role" \
        --quiet
done

echo -e "${GREEN}✅ IAM roles granted${NC}"

# Create service account key
KEY_FILE="terraform-key.json"
echo -e "\n${YELLOW}🔐 Creating service account key...${NC}"
gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SA_EMAIL

echo -e "${GREEN}✅ Service account key saved to $KEY_FILE${NC}"

# Create terraform backend configuration
echo -e "\n${YELLOW}📝 Creating Terraform backend configuration...${NC}"
cat > terraform/backend.tf << EOF
terraform {
  backend "gcs" {
    bucket = "$BUCKET_NAME"
    prefix = "terraform/state"
  }
}
EOF

echo -e "${GREEN}✅ Backend configuration created${NC}"

# Setup secrets
echo -e "\n${YELLOW}🔒 Setting up secrets...${NC}"
echo -e "${BLUE}Please provide the following values:${NC}"

echo -e "\n${YELLOW}1. OpenAI API Key (sk-...):${NC}"
read -s OPENAI_KEY
gcloud secrets create openai-api-key --data-file=- <<< "$OPENAI_KEY" 2>/dev/null || \
    echo "$OPENAI_KEY" | gcloud secrets versions add openai-api-key --data-file=-

echo -e "\n${YELLOW}2. Supabase URL (https://xxx.supabase.co):${NC}"
read SUPABASE_URL
gcloud secrets create supabase-url --data-file=- <<< "$SUPABASE_URL" 2>/dev/null || \
    echo "$SUPABASE_URL" | gcloud secrets versions add supabase-url --data-file=-

echo -e "\n${YELLOW}3. Supabase Service Key:${NC}"
read -s SUPABASE_KEY
gcloud secrets create supabase-key --data-file=- <<< "$SUPABASE_KEY" 2>/dev/null || \
    echo "$SUPABASE_KEY" | gcloud secrets versions add supabase-key --data-file=-

echo -e "\n${YELLOW}4. GitHub Client ID (optional, press Enter to skip):${NC}"
read GITHUB_CLIENT
if [ ! -z "$GITHUB_CLIENT" ]; then
    gcloud secrets create github-client-id --data-file=- <<< "$GITHUB_CLIENT" 2>/dev/null || \
        echo "$GITHUB_CLIENT" | gcloud secrets versions add github-client-id --data-file=-
fi

echo -e "\n${YELLOW}5. GitHub Client Secret (optional, press Enter to skip):${NC}"
read -s GITHUB_SECRET
if [ ! -z "$GITHUB_SECRET" ]; then
    gcloud secrets create github-client-secret --data-file=- <<< "$GITHUB_SECRET" 2>/dev/null || \
        echo "$GITHUB_SECRET" | gcloud secrets versions add github-client-secret --data-file=-
fi

echo -e "\n${GREEN}✅ Secrets stored in Secret Manager${NC}"

# Create terraform.tfvars
echo -e "\n${YELLOW}📝 Creating terraform.tfvars...${NC}"
echo -e "${YELLOW}Enter your email for monitoring alerts:${NC}"
read ALERT_EMAIL

cat > terraform/terraform.tfvars << EOF
project_id = "$PROJECT_ID"
region     = "us-central1"
zone       = "us-central1-a"
environment = "prod"

# These will be read from Secret Manager
openai_api_key       = "secret-manager"
supabase_url         = "secret-manager"
supabase_service_key = "secret-manager"
github_client_id     = "secret-manager"
github_client_secret = "secret-manager"

# Scaling
min_instances            = 0
max_instances            = 10
max_concurrent_requests  = 80

# Database
database_tier      = "db-f1-micro"
database_disk_size = 10
redis_memory_size  = 1

# Monitoring
alert_email = "$ALERT_EMAIL"

# Features
enable_redis       = true
enable_cloud_sql   = false
enable_cloud_tasks = true
EOF

echo -e "${GREEN}✅ terraform.tfvars created${NC}"

# Initialize Terraform
echo -e "\n${YELLOW}🚀 Initializing Terraform...${NC}"
cd terraform
terraform init

echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ GCP Setup Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Review terraform/terraform.tfvars"
echo -e "2. Run: ${GREEN}cd terraform && terraform plan${NC}"
echo -e "3. Deploy: ${GREEN}terraform apply${NC}"
echo -e "4. Build images: ${GREEN}./deploy/build-and-push.sh${NC}"

echo -e "\n${YELLOW}GitHub Actions Setup:${NC}"
echo -e "Add these secrets to your GitHub repository:"
echo -e "  - GCP_PROJECT_ID: $PROJECT_ID"
echo -e "  - GCP_SA_KEY: (contents of terraform-key.json)"
echo -e "  - OPENAI_API_KEY"
echo -e "  - SUPABASE_URL"
echo -e "  - SUPABASE_SERVICE_KEY"
echo -e "  - GITHUB_CLIENT_ID"
echo -e "  - GITHUB_CLIENT_SECRET"
echo -e "  - ALERT_EMAIL"

echo -e "\n${RED}⚠️  Important: Keep terraform-key.json secure!${NC}"