#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Header
echo -e "${BLUE}"
echo "🚀 Job Automation System Setup"
echo "==============================="
echo -e "${NC}"

# Check prerequisites
log_info "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker Desktop first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check Node.js (for Supabase CLI)
if ! command -v node &> /dev/null; then
    log_warning "Node.js not found. Installing Supabase CLI may fail."
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

log_success "Prerequisites check completed"

# Check if .env exists
if [ ! -f .env ]; then
    log_info "Creating .env file from template..."
    cp .env.example .env
    log_success ".env file created"
else
    log_warning ".env file already exists"
fi

# Install Supabase CLI if not present
if ! command -v supabase &> /dev/null; then
    log_info "Installing Supabase CLI..."
    npm install -g supabase
    log_success "Supabase CLI installed"
else
    log_success "Supabase CLI already installed"
fi

# Prompt for setup type
echo
log_info "Choose setup option:"
echo "1) Full automated setup (recommended)"
echo "2) Manual setup with guidance"
echo "3) Skip Supabase setup (I'll do it later)"
read -p "Enter choice (1-3): " setup_choice

case $setup_choice in
    1)
        log_info "Running automated Supabase setup..."
        ./scripts/setup-supabase.sh
        ;;
    2)
        log_info "Manual setup guidance:"
        echo "1. Create Supabase account at https://supabase.com"
        echo "2. Create new project"
        echo "3. Run: ./scripts/setup-supabase.sh"
        echo "4. Update .env with your credentials"
        ;;
    3)
        log_warning "Skipping Supabase setup. You'll need to configure it manually."
        ;;
    *)
        log_error "Invalid choice"
        exit 1
        ;;
esac

# Environment configuration check
log_info "Checking environment configuration..."

missing_vars=()
required_vars=("VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY" "OPENAI_API_KEY")

for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env || grep -q "^$var=$" .env || grep -q "^$var=your_" .env; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    log_warning "Missing or incomplete environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    echo
    log_info "Please update .env file with your actual values:"
    echo "  - VITE_SUPABASE_URL: Your Supabase project URL"
    echo "  - VITE_SUPABASE_ANON_KEY: Your Supabase anon key"  
    echo "  - OPENAI_API_KEY: Your OpenAI API key"
    echo "  - VITE_GITHUB_CLIENT_ID: GitHub OAuth client ID (optional)"
    echo "  - GITHUB_CLIENT_SECRET: GitHub OAuth secret (optional)"
    echo
    read -p "Press Enter after updating .env file..."
fi

# GitHub OAuth setup guidance
log_info "GitHub OAuth setup (optional but recommended):"
echo "1. Go to GitHub Settings → Developer settings → OAuth Apps"
echo "2. Create new OAuth App with:"
echo "   - Homepage URL: http://localhost:8087"
echo "   - Callback URL: http://localhost:8087/auth/github/callback"
echo "3. Add Client ID and Secret to .env file"
echo

# Final checks
log_info "Running final validation..."

# Check if ports are available
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_warning "Port 8000 is in use. Please stop the service or Docker will fail."
fi

if lsof -Pi :8087 -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_warning "Port 8087 is in use. Please stop the service or Docker will fail."
fi

# Setup completed
echo
log_success "Setup completed! 🎉"
echo
log_info "Next steps:"
echo "1. Update .env with your actual API keys if not done already"
echo "2. Run: docker-compose -f docker-compose.dev.yml up"
echo "3. Open: http://localhost:8087"
echo
log_info "Troubleshooting:"
echo "- Check logs: docker-compose logs backend"
echo "- Validate setup: ./scripts/validate-setup.sh"
echo "- Documentation: docs/deployment-guide.md"
echo

# Ask if user wants to start the application
read -p "Start the application now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Starting application..."
    docker-compose -f docker-compose.dev.yml up
fi