#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo -e "${BLUE}"
echo "🔍 Setup Validation"
echo "==================="
echo -e "${NC}"

# Check if .env exists
log_info "Checking environment configuration..."
if [ ! -f .env ]; then
    log_error ".env file not found"
    exit 1
fi

# Source .env file
set -a
source .env
set +a

# Validate required environment variables
required_vars=("VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY" "OPENAI_API_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] || [[ "${!var}" == *"your_"* ]] || [[ "${!var}" == *"example"* ]]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    log_error "Missing or invalid environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    echo
    log_info "Please update .env file with valid values"
    exit 1
else
    log_success "Environment variables configured"
fi

# Check Docker
log_info "Checking Docker..."
if ! command -v docker &> /dev/null; then
    log_error "Docker not installed"
    exit 1
fi

if ! docker info &> /dev/null; then
    log_error "Docker daemon not running"
    exit 1
fi

log_success "Docker is running"

# Check ports
log_info "Checking port availability..."
ports_in_use=()

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    ports_in_use+=("8000")
fi

if lsof -Pi :8087 -sTCP:LISTEN -t >/dev/null 2>&1; then
    ports_in_use+=("8087")
fi

if [ ${#ports_in_use[@]} -ne 0 ]; then
    log_warning "Ports in use: ${ports_in_use[*]}"
    log_info "You may need to stop other services or use different ports"
else
    log_success "Ports 8000 and 8087 are available"
fi

# Test Supabase connection
log_info "Testing Supabase connection..."
if command -v curl &> /dev/null; then
    response=$(curl -s -o /dev/null -w "%{http_code}" "${VITE_SUPABASE_URL}/rest/v1/" -H "apikey: ${VITE_SUPABASE_ANON_KEY}")
    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        log_success "Supabase connection successful"
    else
        log_error "Supabase connection failed (HTTP $response)"
        log_info "Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
    fi
else
    log_warning "curl not available, skipping Supabase connection test"
fi

# Test OpenAI API key format
log_info "Validating OpenAI API key..."
if [[ "$OPENAI_API_KEY" =~ ^sk-[a-zA-Z0-9]{20,}$ ]]; then
    log_success "OpenAI API key format is valid"
else
    log_warning "OpenAI API key format may be invalid"
    log_info "Expected format: sk-... (at least 20 characters after 'sk-')"
fi

# Test GitHub OAuth configuration (if provided)
if [ -n "$VITE_GITHUB_CLIENT_ID" ] && [ -n "$GITHUB_CLIENT_SECRET" ]; then
    log_info "Validating GitHub OAuth configuration..."
    if [[ "$VITE_GITHUB_CLIENT_ID" =~ ^[a-f0-9]{20}$ ]]; then
        log_success "GitHub Client ID format is valid"
    else
        log_warning "GitHub Client ID format may be invalid"
    fi
    
    if [ ${#GITHUB_CLIENT_SECRET} -ge 20 ]; then
        log_success "GitHub Client Secret format is valid"
    else
        log_warning "GitHub Client Secret may be too short"
    fi
else
    log_info "GitHub OAuth not configured (optional)"
fi

# Check if Docker Compose files exist
log_info "Checking Docker Compose configuration..."
if [ ! -f docker-compose.dev.yml ]; then
    log_error "docker-compose.dev.yml not found"
    exit 1
fi

if [ ! -f docker-compose.yml ]; then
    log_warning "docker-compose.yml not found (production config)"
else
    log_success "Docker Compose files found"
fi

# Validate Docker Compose syntax
log_info "Validating Docker Compose syntax..."
if docker-compose -f docker-compose.dev.yml config > /dev/null 2>&1; then
    log_success "Docker Compose configuration is valid"
else
    log_error "Docker Compose configuration has errors"
    docker-compose -f docker-compose.dev.yml config
    exit 1
fi

# Check backend dependencies
log_info "Checking backend configuration..."
if [ -f backend/pyproject.toml ]; then
    log_success "Backend pyproject.toml found"
else
    log_error "Backend pyproject.toml not found"
fi

if [ -f backend/uv.lock ]; then
    log_success "Backend uv.lock found"
else
    log_warning "Backend uv.lock not found (will be generated on first build)"
fi

# Check if we can build the Docker images
log_info "Testing Docker image builds..."
if docker-compose -f docker-compose.dev.yml build --dry-run &> /dev/null; then
    log_success "Docker build configuration is valid"
else
    log_warning "Docker build test failed (may be network-related)"
fi

# Overall status
echo
if [ ${#missing_vars[@]} -eq 0 ] && [ ${#ports_in_use[@]} -eq 0 ]; then
    log_success "✅ Setup validation passed! You're ready to start the application."
    echo
    log_info "To start the application:"
    echo "  docker-compose -f docker-compose.dev.yml up"
    echo
    log_info "Application URLs:"
    echo "  Frontend: http://localhost:8087"
    echo "  Backend API: http://localhost:8000"
    echo "  API Docs: http://localhost:8000/docs"
else
    log_warning "⚠️  Setup validation completed with warnings."
    echo
    log_info "Please address the issues above before starting the application."
fi

echo
log_info "Additional resources:"
echo "  - Documentation: docs/deployment-guide.md"
echo "  - Troubleshooting: docs/docker-setup.md"
echo "  - Database setup: docs/supabase_setup.md"