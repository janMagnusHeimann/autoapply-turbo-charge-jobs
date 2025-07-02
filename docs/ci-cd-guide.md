# CI/CD Pipeline Guide

Complete guide to the automated testing and deployment pipeline for the Job Automation project.

## Overview

The project uses a **3-tier testing strategy** with GitHub Actions to ensure code quality, functionality, and deployment readiness:

1. **Mock Tests** - Fast, always-passing structure validation
2. **Integration Tests** - Real functionality testing without credentials  
3. **Real API Tests** - Full integration testing with live credentials

## 🔄 Workflows

### 1. **Main CI Pipeline** (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` branch

**What it tests:**
- ✅ Frontend build, lint, typecheck (non-blocking)
- ✅ Backend Python tests with pytest
- ✅ Supabase configuration validation
- ✅ GitHub/Scholar service file existence
- ✅ Security scanning (npm audit, Python safety)
- ✅ Basic integration checks (main branch only)

**Duration:** ~5-10 minutes

### 2. **Core Functionality Tests** (`.github/workflows/core-functionality.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` branch

**What it tests:**
- 🐳 Docker container builds and health checks
- 🚀 Backend API responds on port 8000
- 🌐 Frontend serves on port 8087
- 📋 Supabase project structure validation
- 🔧 Service integration readiness

**Duration:** ~10-15 minutes

### 3. **Real Integration Tests** (`.github/workflows/integration-tests.yml`)

**Triggers:**
- Manual trigger only (`workflow_dispatch`)
- Weekly schedule (Mondays 6 AM UTC)

**What it tests:**
- 🔑 Real GitHub API authentication and calls
- 🎓 Google Scholar profile scraping
- 🗄️ Supabase database CRUD operations
- ⚡ Rate limiting and error handling
- 🔒 Security and validation with live services

**Duration:** ~10-15 minutes (requires credentials)

### 4. **Quick Check** (`.github/workflows/quick-check.yml`)

**Triggers:**
- Push to any branch
- Pull requests

**What it tests:**
- ⚡ Fast 5-minute validation
- 📁 Project structure integrity
- 📦 Dependency installation
- 🏗️ Basic build process

**Duration:** ~5 minutes

## 🎯 Testing Strategy by Branch

| Branch | Mock Tests | Docker Tests | Integration Tests | Real API Tests |
|--------|------------|--------------|-------------------|----------------|
| `main` | ✅ Auto | ✅ Auto | ✅ Auto | 🔧 Manual |
| `develop` | ✅ Auto | ✅ Auto | ❌ No | 🔧 Manual |
| `feature/*` | ✅ Quick only | ❌ No | ❌ No | 🔧 Manual |
| PRs to main | ✅ Auto | ✅ Auto | ❌ No | 🔧 Manual |

## 🔧 Setting Up Real Integration Tests

### Step 1: GitHub Secrets Configuration

Navigate to: **Repository → Settings → Secrets and variables → Actions**

#### Required Secrets

**GitHub Integration:**
```
GITHUB_TEST_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_TEST_USERNAME=your-github-username
GITHUB_CLIENT_ID=your-oauth-app-client-id
GITHUB_CLIENT_SECRET=your-oauth-app-client-secret
```

**Supabase Integration:**
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Optional:**
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 2: Obtaining Credentials

#### GitHub Personal Access Token
1. GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `user:email`
4. Copy token (starts with `ghp_`)

#### GitHub OAuth App
1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Application name: "Job Automation Test"
3. Homepage URL: `http://localhost:8087`
4. Authorization callback URL: `http://localhost:8087/auth/github/callback`
5. Copy Client ID and Client Secret

#### Supabase Credentials
1. Supabase project dashboard
2. Settings → API → Project URL (for SUPABASE_URL)
3. Settings → API → Project API keys:
   - `anon public` key (for SUPABASE_ANON_KEY)
   - `service_role` key (for SUPABASE_SERVICE_ROLE_KEY)

### Step 3: Running Real Integration Tests

1. Go to **Actions** tab in GitHub
2. Find **"Real Integration Tests"** workflow
3. Click **"Run workflow"** → **"Run workflow"** button
4. Monitor test results with real API calls

## 📊 Test Results Interpretation

### ✅ **All Tests Pass**
- **Deployment Ready**: App builds and starts successfully
- **Infrastructure Works**: Docker, networking, health checks pass
- **Basic Structure Valid**: Files exist, imports work
- **Security Clean**: No critical vulnerabilities

### ⚠️ **Some Tests Fail (Non-blocking)**
- **Code Quality Issues**: ESLint/TypeScript errors (warnings only)
- **Missing Credentials**: Integration tests skipped
- **Transient Failures**: Network timeouts, rate limits

### ❌ **Critical Failures**
- **Build Failures**: Docker containers won't start
- **Import Errors**: Missing dependencies or syntax errors
- **Health Check Failures**: Services not responding

## 🛠️ Local Testing

### Without Credentials (Structure Testing)
```bash
cd backend
uv run pytest tests/test_services.py -v
```

### With Credentials (Full Integration)
```bash
# Set environment variables
export GITHUB_TEST_TOKEN=your_token
export SUPABASE_URL=your_url
export SUPABASE_SERVICE_ROLE_KEY=your_key

# Run specific integration tests
cd backend
uv run pytest tests/test_github_integration.py -v
uv run pytest tests/test_scholar_integration.py -v
uv run pytest tests/test_supabase_integration.py -v
```

### Docker Testing
```bash
# Build and test containers
docker compose -f docker-compose.test.yml build
docker compose -f docker-compose.test.yml up -d

# Check health
curl http://localhost:8000/health
curl http://localhost:8087

# Cleanup
docker compose -f docker-compose.test.yml down
```

## 🔍 Test Coverage

### Frontend Tests
- ✅ TypeScript compilation
- ✅ ESLint code quality (non-blocking)
- ✅ Build process validation
- ✅ Service file existence

### Backend Tests
- ✅ Python dependency installation
- ✅ Import validation
- ✅ Mock API functionality
- ✅ Configuration validation
- ✅ Playwright browser automation setup

### Integration Tests
- ✅ GitHub API authentication
- ✅ Repository fetching and user data
- ✅ Scholar profile scraping
- ✅ Database CRUD operations
- ✅ Error handling and rate limiting

### Docker Tests
- ✅ Container builds
- ✅ Service health checks
- ✅ Network connectivity
- ✅ Multi-container orchestration

## 🚨 Troubleshooting

### Common Issues

**ESLint Failures (839 problems)**
- Status: ⚠️ Non-blocking warnings
- Solution: Run `npm run lint:fix` locally
- Impact: Doesn't prevent deployment

**Backend Test Failures**
- Check: Python dependencies in `pyproject.toml`
- Solution: Run `uv sync --dev` locally
- Verify: Import paths and PYTHONPATH

**Supabase Container Failures**
- Known Issue: `storage-api:custom-metadata` image missing
- Workaround: Tests use offline validation
- Impact: No effect on functionality

**Docker Build Timeouts**
- Cause: Large dependencies, slow network
- Solution: Increase timeout in workflow
- Prevention: Optimize Dockerfile layers

### Getting Help

**View Logs:**
1. GitHub → Actions tab
2. Click on failed workflow run
3. Expand failed job steps
4. Check detailed error messages

**Debug Locally:**
```bash
# Reproduce CI environment
docker compose -f docker-compose.test.yml build
docker compose -f docker-compose.test.yml up

# Check specific service
docker logs <container_name>
```

## 📈 Best Practices

### Development Workflow
1. ✅ Push to `feature/` branch (quick checks only)
2. ✅ Create PR to `main` (full CI runs)
3. ✅ Merge to `main` (comprehensive testing)
4. ✅ Run manual integration tests periodically

### Security
- 🔒 Never commit real credentials
- 🔑 Use separate test/production credentials
- 🔄 Rotate API keys regularly
- ✅ Monitor security scan results

### Performance
- ⚡ Use `continue-on-error` for non-critical tests
- 🕒 Set appropriate timeouts
- 💾 Cache dependencies when possible
- 🎯 Run expensive tests manually only

## 🎯 Next Steps

### Immediate Actions
1. ✅ Add GitHub Secrets for real integration testing
2. ✅ Run manual integration tests to verify credentials
3. ✅ Fix any ESLint issues locally
4. ✅ Monitor weekly automated integration runs

### Future Enhancements
- 🚀 Add deployment workflows for staging/production
- 📊 Add performance benchmarking
- 🔍 Add end-to-end user workflow testing
- 📈 Add test coverage reporting
- 🌐 Add browser-based integration tests

## 📚 Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Compose Testing](docker-setup.md)
- [Supabase Local Development](supabase_setup.md)
- [Project Setup Guide](project-setup.md)

---

**Status:** ✅ CI/CD pipeline fully operational  
**Last Updated:** 2025-06-27  
**Maintainer:** Job Automation Team