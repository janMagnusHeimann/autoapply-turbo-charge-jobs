#!/bin/bash
# Build and push Docker images to Google Artifact Registry

set -e

# Configuration
PROJECT_ID=${1:-$(gcloud config get-value project)}
REGION=${2:-us-central1}
REPOSITORY="autoapply"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Building and pushing Docker images to GCP${NC}"

# Create Artifact Registry repository if it doesn't exist
echo -e "${YELLOW}📦 Setting up Artifact Registry...${NC}"
gcloud artifacts repositories create $REPOSITORY \
    --repository-format=docker \
    --location=$REGION \
    --description="AutoApply microservices" \
    2>/dev/null || echo "Repository already exists"

# Configure Docker authentication
echo -e "${YELLOW}🔐 Configuring Docker authentication...${NC}"
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

# Function to build and push image
build_and_push() {
    local service_name=$1
    local dockerfile_path=$2
    local context_path=$3

    echo -e "${GREEN}Building $service_name...${NC}"

    # Build the image
    docker build \
        -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$service_name:latest \
        -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$service_name:$(git rev-parse --short HEAD) \
        -f $dockerfile_path \
        $context_path

    # Push the image
    echo -e "${YELLOW}Pushing $service_name...${NC}"
    docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$service_name:latest
    docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$service_name:$(git rev-parse --short HEAD)

    echo -e "${GREEN}✅ $service_name deployed successfully${NC}"
}

# Build and push each service
echo -e "${GREEN}🏗️ Building services...${NC}"

# Job Discovery API
build_and_push "job-discovery-api" "backend/Dockerfile" "backend"

# CV Processing API
build_and_push "cv-processing-api" "backend/cv_api/Dockerfile" "backend/cv_api"

# Application Agent API
build_and_push "application-agent-api" "backend/application_agent/Dockerfile" "backend/application_agent"

# Frontend (optional - if containerizing)
# build_and_push "frontend" "Dockerfile" "."

echo -e "${GREEN}✅ All services built and pushed successfully!${NC}"
echo -e "${YELLOW}Next step: Run terraform apply to deploy${NC}"