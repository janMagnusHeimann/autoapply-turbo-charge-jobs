# GitHub Actions Secrets Configuration

This document outlines the environment variables and secrets needed for the CI/CD pipeline with real integration tests.

## Required Secrets for Real Integration Tests

### GitHub Service Integration
```
GITHUB_TEST_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_TEST_USERNAME=your-github-username
GITHUB_CLIENT_ID=your-github-oauth-app-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-app-client-secret
```

### Supabase Database Integration
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Optional Services
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Production Deployment (Optional)
```
DOCKER_REGISTRY_USERNAME=your-docker-username
DOCKER_REGISTRY_PASSWORD=your-docker-password
PRODUCTION_SUPABASE_URL=https://production.supabase.co
PRODUCTION_SUPABASE_KEY=production-service-key
```

## Setting Up GitHub Secrets

1. Go to your repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret from the list above

## Development vs Production

### Development Environment
- Tests run with mock data when real credentials aren't available
- Non-blocking tests that skip if credentials missing
- Local Supabase instance for development

### Production Environment  
- Full integration tests with real API calls
- Database operations on test tables
- Rate limiting and error handling validation

## Security Notes

- **Never commit real credentials to code**
- Use different credentials for testing vs production
- GitHub test tokens should have minimal permissions
- Supabase service role key needed for admin operations
- Consider using separate test project for Supabase

## Test Token Permissions

### GitHub Test Token Permissions
- `repo` - Access repositories
- `user:email` - Read user email

### Supabase Test Setup
- Create test tables with same schema as production
- Use service role key for bypassing RLS in tests
- Set up test data cleanup procedures

## Running Tests Locally

```bash
# With real credentials
export GITHUB_TEST_TOKEN=your_token
export SUPABASE_URL=your_url
export SUPABASE_SERVICE_ROLE_KEY=your_key

cd backend
uv run pytest tests/test_github_integration.py -v
uv run pytest tests/test_scholar_integration.py -v  
uv run pytest tests/test_supabase_integration.py -v
```

```bash
# Without credentials (mock tests only)
cd backend
uv run pytest tests/test_services.py -v
```