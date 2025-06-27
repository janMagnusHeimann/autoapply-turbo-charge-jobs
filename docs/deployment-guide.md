# 🚀 Deployment Guide - Open Source Setup

This guide helps you deploy the Job Automation System locally with your own Supabase instance.

## 🎯 Quick Start (5 minutes)

### Prerequisites
- Docker & Docker Compose installed
- Node.js 18+ (for Supabase CLI)
- GitHub account (for OAuth)
- OpenAI API key

### 1. Clone and Setup
```bash
git clone https://github.com/yourusername/autoapply-turbo-charge-jobs
cd autoapply-turbo-charge-jobs
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 2. Configure Supabase
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Run automated setup
./scripts/setup-supabase.sh
```

### 3. Start Application
```bash
docker-compose -f docker-compose.dev.yml up
```

🎉 **Access your app at**: http://localhost:8087

---

## 📋 Detailed Setup Instructions

### Step 1: Supabase Project Setup

#### Option A: Automated Setup (Recommended)
```bash
./scripts/setup-supabase.sh
```

#### Option B: Manual Setup
1. **Create Supabase Account**: https://supabase.com
2. **Create New Project**: 
   - Name: "job-automation-{your-name}"
   - Region: Choose closest to you
   - Database password: Save securely
3. **Run Migrations**:
   ```bash
   cd supabase
   supabase init
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

### Step 2: Environment Configuration

Copy and configure environment variables:
```bash
cp .env.example .env
```

Required variables:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# OpenAI Configuration  
OPENAI_API_KEY=sk-your-openai-key

# GitHub OAuth (for repository integration)
VITE_GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Step 3: GitHub OAuth Setup

1. **Create GitHub OAuth App**:
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - New OAuth App with:
     - Application name: "Job Automation Tool"
     - Homepage URL: `http://localhost:8087`
     - Authorization callback URL: `http://localhost:8087/auth/github/callback`

2. **Configure OAuth**:
   - Copy Client ID to `VITE_GITHUB_CLIENT_ID`
   - Copy Client Secret to `GITHUB_CLIENT_SECRET`

### Step 4: Launch Application

```bash
# Development mode (with hot reload)
docker-compose -f docker-compose.dev.yml up

# Production mode  
docker-compose up
```

---

## 🛠️ Automation Scripts

### setup.sh
Main setup script that:
- Checks prerequisites
- Installs dependencies
- Guides through configuration
- Validates setup

### setup-supabase.sh
Supabase-specific automation:
- Creates project (interactive)
- Applies database schema
- Sets up authentication
- Configures row-level security
- Tests connections

### validate-setup.sh
Post-setup validation:
- Tests database connections
- Validates environment variables
- Checks GitHub OAuth
- Runs health checks

---

## 🔧 Troubleshooting

### Common Issues

#### Supabase Connection Failed
```bash
# Check your project URL and keys
supabase status
```

#### Docker Port Conflicts
```bash
# Stop conflicting services
docker-compose down
lsof -ti:8000,8087 | xargs kill -9
```

#### GitHub OAuth 404
- Verify callback URL matches exactly
- Check client ID and secret are correct
- Ensure backend is running on port 8000

#### Database Migration Errors
```bash
# Reset and reapply migrations
supabase db reset
supabase db push
```

### Getting Help

1. **Check logs**: `docker-compose logs backend`
2. **Validate setup**: `./scripts/validate-setup.sh`
3. **Database issues**: Check Supabase dashboard
4. **Create issue**: GitHub Issues with logs

---

## 🎯 Production Deployment

### For Public Deployment

1. **Update URLs** in environment variables
2. **Secure secrets** (use proper secret management)
3. **Configure CORS** in Supabase for your domain
4. **Update GitHub OAuth** callback URLs
5. **Use production Docker compose**: `docker-compose.yml`

### Scaling Considerations

- **Supabase**: Automatically scales with your usage
- **OpenAI API**: Monitor usage and set limits
- **GitHub API**: Rate limits apply (5000 requests/hour)

---

## 💰 Cost Estimation

### Monthly Costs Per User

- **Supabase Free Tier**: $0 (up to 2 databases, 500MB storage)
- **Supabase Pro**: $25/month (production features)
- **OpenAI API**: $10-50/month (depending on usage)
- **GitHub API**: Free (with rate limits)
- **Hosting**: $0 (local) or $5-20/month (cloud)

### Free Tier Limitations

- 2 Supabase projects maximum
- 500MB database storage
- 5GB bandwidth
- 50,000 monthly active users

**Recommendation**: Start with free tier, upgrade when needed.

---

## 🚀 Advanced Configuration

### Custom Database Schema

Modify `supabase/migrations/` files to customize:
- Additional user fields
- Custom job matching logic  
- Extended company data
- Industry-specific features

### AI Model Configuration

Configure different LLM providers in backend:
```python
# backend/src/job_automation/config.py
DEFAULT_LLM_PROVIDER = "openai"  # or "anthropic", "gemini"
DEFAULT_LLM_MODEL = "gpt-4o"
```

### Browser Automation

Enable/disable browser automation features:
```bash
USE_BROWSER_AUTOMATION=true
BROWSER_HEADLESS=true
SAVE_SCREENSHOTS=false
```

---

## 📝 License & Contributing

This project is open source under MIT License.

**Contributing**:
1. Fork the repository
2. Create feature branch
3. Submit pull request

**Bug Reports**: Use GitHub Issues with reproduction steps.