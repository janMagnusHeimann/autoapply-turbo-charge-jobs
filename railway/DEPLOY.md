# Railway Deployment Guide

This guide walks you through deploying AutoApply to Railway with all services.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         RAILWAY PROJECT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Frontend   │  │  Main API   │  │   CV API    │              │
│  │  (React)    │  │  (FastAPI)  │  │  (FastAPI)  │              │
│  │  Port 8080  │  │  Port 8000  │  │  Port 8001  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  App Agent  │  │   Celery    │  │   Celery    │              │
│  │ (Playwright)│  │   Worker    │  │    Beat     │              │
│  │  Port 8002  │  │  (no port)  │  │  (no port)  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
│  ┌─────────────────────────────────────────────────┐            │
│  │                    Redis                         │            │
│  │              (Railway Add-on)                    │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │       Supabase          │
                 │   (External Service)    │
                 └─────────────────────────┘
```

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Supabase Project**: Create at [supabase.com](https://supabase.com)
3. **OpenAI API Key**: Get from [platform.openai.com](https://platform.openai.com)
4. **GitHub OAuth App**: Create at [github.com/settings/developers](https://github.com/settings/developers)

## Step 1: Setup Supabase

1. Create a new Supabase project
2. Go to **Settings > API** and copy:
   - Project URL (`SUPABASE_URL`)
   - `anon` public key (`VITE_SUPABASE_ANON_KEY`)
   - `service_role` secret key (`SUPABASE_SERVICE_ROLE_KEY`)

3. Run database migrations:
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to your project
   supabase link --project-ref your-project-ref

   # Push migrations
   supabase db push
   ```

## Step 2: Create Railway Project

### Option A: Via Railway Dashboard (Recommended)

1. Go to [railway.app/new](https://railway.app/new)
2. Click **"Empty Project"**
3. Name it `autoapply`

### Option B: Via CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init
```

## Step 3: Add Redis

1. In your Railway project, click **"+ New"**
2. Select **"Database"** > **"Redis"**
3. Wait for deployment
4. Note the `REDIS_URL` from the Redis service variables

## Step 4: Deploy Services

Deploy each service by connecting to your GitHub repo and specifying the Dockerfile.

### 4.1 Frontend Service

1. Click **"+ New"** > **"GitHub Repo"**
2. Select your repository
3. Configure:
   - **Name**: `frontend`
   - **Root Directory**: `/`
   - **Dockerfile Path**: `Dockerfile.railway`
4. Add environment variables (Settings > Variables):
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_API_BASE_URL=https://${{main-api.RAILWAY_PUBLIC_DOMAIN}}
   VITE_CV_API_URL=https://${{cv-api.RAILWAY_PUBLIC_DOMAIN}}
   VITE_APPLICATION_AGENT_URL=https://${{app-agent.RAILWAY_PUBLIC_DOMAIN}}
   VITE_GITHUB_CLIENT_ID=your-github-client-id
   ```
5. Generate domain: **Settings > Networking > Generate Domain**

### 4.2 Main API Service

1. Click **"+ New"** > **"GitHub Repo"**
2. Select your repository
3. Configure:
   - **Name**: `main-api`
   - **Root Directory**: `/`
   - **Dockerfile Path**: `railway/main-api.dockerfile`
4. Add environment variables:
   ```
   OPENAI_API_KEY=sk-your-key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   GITHUB_CLIENT_SECRET=your-github-secret
   CELERY_BROKER_URL=${{Redis.REDIS_URL}}
   CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}
   ```
5. Generate domain

### 4.3 CV API Service

1. Click **"+ New"** > **"GitHub Repo"**
2. Configure:
   - **Name**: `cv-api`
   - **Root Directory**: `/`
   - **Dockerfile Path**: `railway/cv-api.dockerfile`
3. Add environment variables:
   ```
   OPENAI_API_KEY=sk-your-key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   ```
4. Generate domain

### 4.4 Application Agent Service

1. Click **"+ New"** > **"GitHub Repo"**
2. Configure:
   - **Name**: `app-agent`
   - **Root Directory**: `/`
   - **Dockerfile Path**: `railway/app-agent.dockerfile`
3. Add environment variables:
   ```
   OPENAI_API_KEY=sk-your-key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   CV_API_URL=http://cv-api.railway.internal:8001
   ```
4. Generate domain

### 4.5 Celery Worker Service

1. Click **"+ New"** > **"GitHub Repo"**
2. Configure:
   - **Name**: `celery-worker`
   - **Root Directory**: `/`
   - **Dockerfile Path**: `railway/celery-worker.dockerfile`
3. Add environment variables:
   ```
   OPENAI_API_KEY=sk-your-key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   CELERY_BROKER_URL=${{Redis.REDIS_URL}}
   CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}
   ```
4. **No domain needed** (worker doesn't expose HTTP)

### 4.6 Celery Beat Service

1. Click **"+ New"** > **"GitHub Repo"**
2. Configure:
   - **Name**: `celery-beat`
   - **Root Directory**: `/`
   - **Dockerfile Path**: `railway/celery-beat.dockerfile`
3. Add environment variables:
   ```
   CELERY_BROKER_URL=${{Redis.REDIS_URL}}
   CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}
   ```
4. **No domain needed**
5. **IMPORTANT**: Only run ONE instance (set replicas to 1)

## Step 5: Update Frontend URLs

After all services are deployed, update the frontend's API URLs:

1. Go to **frontend** service > **Variables**
2. Update with actual domains:
   ```
   VITE_API_BASE_URL=https://main-api-production-xxxx.up.railway.app
   VITE_CV_API_URL=https://cv-api-production-xxxx.up.railway.app
   VITE_APPLICATION_AGENT_URL=https://app-agent-production-xxxx.up.railway.app
   ```
3. Redeploy frontend

## Step 6: Configure GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App:
   - **Application name**: AutoApply
   - **Homepage URL**: `https://your-frontend.up.railway.app`
   - **Authorization callback URL**: `https://your-frontend.up.railway.app/auth/callback`
3. Copy Client ID and Client Secret
4. Update environment variables in Railway

## Verification Checklist

After deployment, verify each service:

- [ ] **Frontend**: Visit `https://your-frontend.up.railway.app`
- [ ] **Main API**: Visit `https://your-main-api.up.railway.app/health`
- [ ] **CV API**: Visit `https://your-cv-api.up.railway.app/health`
- [ ] **App Agent**: Visit `https://your-app-agent.up.railway.app/health`
- [ ] **Redis**: Check connection in Railway dashboard
- [ ] **Celery Worker**: Check logs for "ready" message
- [ ] **Celery Beat**: Check logs for scheduler startup

## Cost Estimation

Railway pricing (as of 2024):

| Service | Memory | Estimated Cost |
|---------|--------|----------------|
| Frontend | 512MB | ~$5/month |
| Main API | 1GB | ~$10/month |
| CV API | 1GB | ~$10/month |
| App Agent | 2GB | ~$15/month |
| Celery Worker | 1GB | ~$10/month |
| Celery Beat | 512MB | ~$5/month |
| Redis | 256MB | ~$5/month |

**Total: ~$50-60/month** (varies by usage)

## Troubleshooting

### Service won't start
- Check logs: Click service > **Deployments** > **View Logs**
- Verify all environment variables are set
- Check Dockerfile path is correct

### Redis connection failed
- Verify `CELERY_BROKER_URL` uses `${{Redis.REDIS_URL}}` syntax
- Check Redis service is running

### Frontend can't reach API
- Ensure API services have public domains
- Check CORS settings in backend
- Verify `VITE_*` URLs are correct

### Celery tasks not running
- Check worker logs for errors
- Verify Redis connection
- Ensure broker URL is correct

## Scaling

To handle more load:

1. **Increase replicas**: Service > Settings > Replicas
2. **Add more workers**: Duplicate celery-worker service
3. **Upgrade memory**: Service > Settings > Resources

**Note**: Never scale `celery-beat` beyond 1 replica!

## Monitoring

- **Railway Dashboard**: View logs, metrics, and deployments
- **Add Flower** (optional): Deploy Celery Flower for task monitoring
  ```
  Dockerfile: railway/celery-flower.dockerfile (create if needed)
  Port: 5555
  ```

## Custom Domain

1. Go to service > **Settings** > **Networking**
2. Click **"+ Custom Domain"**
3. Add your domain (e.g., `app.yourdomain.com`)
4. Add CNAME record at your DNS provider
