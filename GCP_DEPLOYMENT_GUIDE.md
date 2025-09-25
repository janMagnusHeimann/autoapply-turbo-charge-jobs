# GCP Deployment Guide for AutoApply System

## Architecture on GCP

```
┌─────────────────────────────────────────────────────────────────┐
│                         GCP ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────── FRONTEND ────────────────────────────┐
│  Cloud CDN → Cloud Load Balancer → Cloud Storage (Static)    │
│  - React build artifacts served from GCS bucket              │
│  - Global CDN for fast delivery                              │
└───────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────── API GATEWAY / LOAD BALANCER ──────────────┐
│  Cloud Load Balancer with Cloud Armor (DDoS protection)      │
│  - Routes to different backend services                      │
│  - SSL termination                                           │
└───────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────── BACKEND SERVICES ────────────────────────┐
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Cloud Run - Main Backend API                    │        │
│  │  - Auto-scaling containerized FastAPI            │        │
│  │  - Connects to Cloud SQL & Memorystore           │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Cloud Run - CV Processing API                   │        │
│  │  - Stateless CV processing                       │        │
│  │  - Scales based on request volume                │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │  GKE - Application Agent API                     │        │
│  │  - Kubernetes for Playwright browser instances   │        │
│  │  - Persistent volumes for browser profiles       │        │
│  └─────────────────────────────────────────────────┘        │
└───────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────── ASYNC PROCESSING (CELERY) ───────────────────┐
│  ┌─────────────────────────────────────────────────┐        │
│  │  GKE - Celery Workers                            │        │
│  │  - Horizontal Pod Autoscaling                    │        │
│  │  - Multiple worker pools by priority             │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Memorystore for Redis                           │        │
│  │  - Managed Redis for Celery broker               │        │
│  │  - High availability with replicas               │        │
│  └─────────────────────────────────────────────────┘        │
└───────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────── DATA LAYER ─────────────────────────────┐
│  ┌─────────────────────────────────────────────────┐        │
│  │  Cloud SQL (PostgreSQL)                          │        │
│  │  - High availability with replicas               │        │
│  │  - Automated backups                             │        │
│  │  - Private IP only                               │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Cloud Storage                                   │        │
│  │  - User uploaded CVs                             │        │
│  │  - Generated documents                           │        │
│  │  - Application artifacts                         │        │
│  └─────────────────────────────────────────────────┘        │
└───────────────────────────────────────────────────────────────┘
```

## Step-by-Step Deployment

### 1. Prerequisites

```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# Set your project
export PROJECT_ID="your-autoapply-project"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  container.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com
```

### 2. Create Artifact Registry

```bash
# Create registry for Docker images
gcloud artifacts repositories create autoapply-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="AutoApply Docker images"

# Configure Docker
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### 3. Setup Database (Cloud SQL)

```bash
# Create PostgreSQL instance
gcloud sql instances create autoapply-db \
  --database-version=POSTGRES_15 \
  --tier=db-g1-small \
  --region=us-central1 \
  --network=default \
  --no-assign-ip

# Create database
gcloud sql databases create autoapply \
  --instance=autoapply-db

# Create user
gcloud sql users create autoapply-user \
  --instance=autoapply-db \
  --password=secure-password
```

### 4. Setup Redis (Memorystore)

```bash
# Create Redis instance
gcloud redis instances create autoapply-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=basic
```

### 5. Store Secrets

```bash
# Store API keys in Secret Manager
echo -n "your-openai-key" | gcloud secrets create openai-api-key --data-file=-
echo -n "your-supabase-url" | gcloud secrets create supabase-url --data-file=-
echo -n "your-supabase-key" | gcloud secrets create supabase-service-key --data-file=-
```

### 6. Deploy Backend Services to Cloud Run

```bash
# Build and push Main Backend
docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/autoapply-repo/backend-main:latest -f backend/Dockerfile.prod backend/
docker push us-central1-docker.pkg.dev/$PROJECT_ID/autoapply-repo/backend-main:latest

# Deploy to Cloud Run
gcloud run deploy backend-main \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/autoapply-repo/backend-main:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="CELERY_BROKER_URL=redis://redis-host:6379/0" \
  --set-secrets="OPENAI_API_KEY=openai-api-key:latest" \
  --set-secrets="SUPABASE_URL=supabase-url:latest" \
  --set-secrets="SUPABASE_SERVICE_ROLE_KEY=supabase-service-key:latest" \
  --vpc-connector=autoapply-connector \
  --min-instances=1 \
  --max-instances=10

# Repeat for CV API
docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/autoapply-repo/cv-api:latest -f backend/cv_api/Dockerfile backend/cv_api/
docker push us-central1-docker.pkg.dev/$PROJECT_ID/autoapply-repo/cv-api:latest

gcloud run deploy cv-api \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/autoapply-repo/cv-api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="OPENAI_API_KEY=openai-api-key:latest" \
  --min-instances=0 \
  --max-instances=5
```

### 7. Deploy Application Agent to GKE

```bash
# Create GKE cluster
gcloud container clusters create autoapply-cluster \
  --zone=us-central1-a \
  --num-nodes=3 \
  --machine-type=n2-standard-2 \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=10

# Get credentials
gcloud container clusters get-credentials autoapply-cluster --zone=us-central1-a

# Create Kubernetes deployment
kubectl create -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: application-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: application-agent
  template:
    metadata:
      labels:
        app: application-agent
    spec:
      containers:
      - name: agent
        image: us-central1-docker.pkg.dev/$PROJECT_ID/autoapply-repo/application-agent:latest
        ports:
        - containerPort: 8002
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: openai-key
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
---
apiVersion: v1
kind: Service
metadata:
  name: application-agent-service
spec:
  selector:
    app: application-agent
  ports:
  - port: 80
    targetPort: 8002
  type: LoadBalancer
EOF
```

### 8. Deploy Celery Workers to GKE

```bash
# Create Celery worker deployment
kubectl create -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: celery-worker
  template:
    metadata:
      labels:
        app: celery-worker
    spec:
      containers:
      - name: worker
        image: us-central1-docker.pkg.dev/$PROJECT_ID/autoapply-repo/backend-main:latest
        command: ["celery", "-A", "celery_app", "worker", "--loglevel=info"]
        env:
        - name: CELERY_BROKER_URL
          value: "redis://redis-service:6379/0"
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: openai-key
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: celery-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: celery-worker
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
EOF
```

### 9. Deploy Frontend to Cloud Storage + CDN

```bash
# Build frontend
npm run build

# Create storage bucket
gsutil mb -l us-central1 gs://autoapply-frontend-$PROJECT_ID

# Upload build files
gsutil -m cp -r dist/* gs://autoapply-frontend-$PROJECT_ID/

# Make bucket public
gsutil iam ch allUsers:objectViewer gs://autoapply-frontend-$PROJECT_ID

# Setup Load Balancer with CDN
gcloud compute backend-buckets create autoapply-frontend-backend \
  --gcs-bucket-name=autoapply-frontend-$PROJECT_ID

gcloud compute url-maps create autoapply-lb \
  --default-backend-bucket=autoapply-frontend-backend

gcloud compute target-https-proxies create autoapply-https-proxy \
  --url-map=autoapply-lb \
  --ssl-certificates=autoapply-cert

gcloud compute forwarding-rules create autoapply-https-rule \
  --global \
  --target-https-proxy=autoapply-https-proxy \
  --ports=443
```

### 10. Setup Monitoring & Logging

```bash
# Enable monitoring
gcloud services enable monitoring.googleapis.com logging.googleapis.com

# Create uptime checks
gcloud monitoring uptime-check-configs create \
  --display-name="Backend API Health" \
  --resource-type="uptime-url" \
  --hostname="backend-main-xxxxx.run.app" \
  --path="/api/system/status"

# Setup alerting policy
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="High Error Rate Alert" \
  --condition-display-name="Error rate > 1%" \
  --condition-threshold-value=0.01
```

## CI/CD with GitHub Actions

Create `.github/workflows/deploy-gcp.yml`:

```yaml
name: Deploy to GCP

on:
  push:
    branches: [main]

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: us-central1

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Build and Push Docker images
        run: |
          gcloud auth configure-docker us-central1-docker.pkg.dev

          # Build and push main backend
          docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/autoapply-repo/backend-main:$GITHUB_SHA -f backend/Dockerfile.prod backend/
          docker push us-central1-docker.pkg.dev/$PROJECT_ID/autoapply-repo/backend-main:$GITHUB_SHA

          # Deploy to Cloud Run
          gcloud run deploy backend-main \
            --image us-central1-docker.pkg.dev/$PROJECT_ID/autoapply-repo/backend-main:$GITHUB_SHA \
            --region $REGION

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Build frontend
        run: |
          npm ci
          npm run build

      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Deploy to GCS
        run: |
          gsutil -m rsync -r -d dist/ gs://autoapply-frontend-$PROJECT_ID/
```

## Cost Optimization

### Estimated Monthly Costs (USD)
- **Cloud Run (3 services)**: ~$50-150
- **GKE cluster (3 nodes)**: ~$200-300
- **Cloud SQL (small)**: ~$50
- **Memorystore Redis (1GB)**: ~$35
- **Cloud Storage + CDN**: ~$10-30
- **Total**: ~$345-565/month

### Cost Saving Tips
1. Use **Cloud Run** instead of GKE for stateless services
2. Enable **autoscaling** with appropriate min/max limits
3. Use **preemptible VMs** for Celery workers
4. Setup **lifecycle policies** for Cloud Storage
5. Use **committed use discounts** for predictable workloads

## Security Best Practices

1. **Network Security**
   - Use Private Service Connect for internal communication
   - Enable Cloud Armor for DDoS protection
   - Use VPC Service Controls

2. **Secrets Management**
   - Store all secrets in Secret Manager
   - Use Workload Identity for GKE
   - Rotate keys regularly

3. **Access Control**
   - Use IAM roles with least privilege
   - Enable Binary Authorization for containers
   - Implement Cloud Audit Logs

4. **Data Protection**
   - Encrypt data at rest and in transit
   - Enable Cloud SQL backups
   - Use Customer-Managed Encryption Keys (CMEK)

## Monitoring Dashboard

Create a custom dashboard in Cloud Console:
- Request latency (p50, p95, p99)
- Error rates by service
- Celery queue lengths
- Database connections
- CPU/Memory usage
- Cost tracking

## Disaster Recovery

1. **Backups**
   - Automated Cloud SQL backups (daily)
   - Cloud Storage versioning
   - Export critical data to cold storage

2. **Multi-region Setup** (for production)
   - Replicate Cloud SQL to another region
   - Use Cloud CDN for global distribution
   - Setup Cloud Run in multiple regions

3. **Rollback Strategy**
   - Use Cloud Run traffic splitting
   - Keep last 5 container versions
   - Database migration rollback scripts

## Support & Maintenance

- Setup **Error Reporting** for automatic error tracking
- Enable **Cloud Trace** for performance monitoring
- Use **Cloud Debugger** for production debugging
- Configure **Uptime checks** for all endpoints
- Setup **PagerDuty** integration for critical alerts

---

This setup provides a production-ready, scalable deployment on GCP with proper security, monitoring, and cost optimization.