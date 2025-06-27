# GitHub Actions Secrets Configuration

This document outlines the required secrets for the CI/CD pipeline.

## Required Secrets

### Development/Testing (Optional - pipeline will work without these)
- `OPENAI_API_KEY`: OpenAI API key for LLM functionality testing
- `GITHUB_CLIENT_SECRET`: GitHub OAuth client secret for GitHub integration testing
- `SUPABASE_URL`: Supabase project URL for database integration testing
- `SUPABASE_ANON_KEY`: Supabase anonymous key for database access

### Production (Required for production deployments)
- `DOCKER_REGISTRY_USERNAME`: Docker registry username for image pushing
- `DOCKER_REGISTRY_PASSWORD`: Docker registry password for image pushing
- `PRODUCTION_SUPABASE_URL`: Production Supabase URL
- `PRODUCTION_SUPABASE_KEY`: Production Supabase service key

## Setting Up Secrets

1. Go to your GitHub repository
2. Click on "Settings" tab
3. Navigate to "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add each secret with its corresponding value

## Environment-Specific Configuration

### Development
- Uses local Supabase instance (supabase start)
- Mock API keys for testing
- Reduced timeouts and limits for faster tests

### Testing (CI/CD)
- Uses Supabase CLI with local instance
- Test API keys that don't make real API calls
- Minimal resource usage for faster pipeline execution

### Production
- Real API keys and production Supabase instance
- Full resource limits and timeouts
- Security scanning and vulnerability checks

## Security Notes

- Never commit real API keys to the repository
- Use GitHub's encrypted secrets for sensitive data
- Regularly rotate API keys and secrets
- Test secrets should be clearly marked as test/mock values
- Production secrets should have restricted access