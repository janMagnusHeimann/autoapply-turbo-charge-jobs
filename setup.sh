#!/bin/bash

# AutoApply - Complete Setup Script
# This script sets up the entire project with a single command

set -e  # Exit on any error

echo "🚀 Starting AutoApply setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed. Please install Python 3.8+."
        exit 1
    fi
    
    # Check pip
    if ! command -v pip3 &> /dev/null; then
        print_error "pip3 is not installed. Please install pip3."
        exit 1
    fi
    
    # Check Supabase CLI
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI not found. Installing..."
        npm install -g supabase
    fi
    
    print_success "All dependencies are available!"
}

# Install frontend dependencies
install_frontend_deps() {
    print_status "Installing frontend dependencies..."
    npm install
    print_success "Frontend dependencies installed!"
}

# Install backend dependencies
install_backend_deps() {
    print_status "Installing backend dependencies..."
    cd backend
    
    # Check if uv is available (faster Python package manager)
    if command -v uv &> /dev/null; then
        print_status "Using uv for faster package installation..."
        uv sync
    else
        print_status "Using pip for package installation..."
        pip3 install -r requirements.txt
    fi
    
    cd ..
    print_success "Backend dependencies installed!"
}

# Setup Supabase
setup_supabase() {
    print_status "Setting up Supabase..."
    
    # Initialize Supabase if not already done
    if [ ! -f "supabase/config.toml" ]; then
        print_status "Initializing Supabase project..."
        supabase init
    fi
    
    # Start Supabase local development
    print_status "Starting Supabase local development environment..."
    supabase start
    
    # Wait for Supabase to be ready
    print_status "Waiting for Supabase to be ready..."
    sleep 10
    
    # Apply migrations
    print_status "Applying database migrations..."
    supabase db reset
    
    print_success "Supabase setup complete!"
}

# Create environment files
create_env_files() {
    print_status "Creating environment configuration..."
    
    # Get Supabase local URLs and keys
    SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
    SUPABASE_ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')
    SUPABASE_SERVICE_ROLE_KEY=$(supabase status | grep "service_role key" | awk '{print $3}')
    
    # Create frontend .env file
    cat > .env.local << EOF
# Supabase Configuration
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Application Configuration
VITE_APP_ENV=development
VITE_ENABLE_MOCK_DATA=true
VITE_API_BASE_URL=http://localhost:8000

# GitHub Integration (Optional - add your own)
VITE_GITHUB_CLIENT_ID=your_github_client_id_here
VITE_GITHUB_CLIENT_SECRET=your_github_client_secret_here

# OpenAI API (Optional - add your own)
VITE_OPENAI_API_KEY=your_openai_api_key_here
EOF

    # Create backend .env file
    cat > backend/.env << EOF
# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Application Configuration
ENVIRONMENT=development
DEBUG=true
API_PORT=8000

# AI Agent Configuration
AGENT_LOG_LEVEL=INFO
MEMORY_MAX_SIZE=1000

# External APIs (Optional - add your own)
OPENAI_API_KEY=your_openai_api_key_here
GITHUB_TOKEN=your_github_token_here
EOF

    print_success "Environment files created!"
    print_warning "Remember to add your own API keys for GitHub and OpenAI integration!"
}

# Setup development database
setup_dev_data() {
    print_status "Setting up development data..."
    
    # The seed data is already applied with db reset
    # Add any additional setup here if needed
    
    print_success "Development data setup complete!"
}

# Run tests
run_tests() {
    print_status "Running tests to verify setup..."
    
    # Frontend tests
    print_status "Running frontend tests..."
    npm test -- --watchAll=false || print_warning "Some frontend tests failed (this might be expected in initial setup)"
    
    # Backend tests
    print_status "Running backend tests..."
    cd backend
    python3 -m pytest tests/ || print_warning "Some backend tests failed (this might be expected in initial setup)"
    cd ..
    
    # Agent tests
    print_status "Running agent tests..."
    cd tests
    python3 -m pytest . || print_warning "Some agent tests failed (this might be expected in initial setup)"
    cd ..
    
    print_success "Test suite completed!"
}

# Main setup function
main() {
    echo "╔══════════════════════════════════════╗"
    echo "║          AutoApply Setup             ║"
    echo "║   AI-Powered Job Application Bot     ║"
    echo "╚══════════════════════════════════════╝"
    echo ""
    
    check_dependencies
    install_frontend_deps
    install_backend_deps
    setup_supabase
    create_env_files
    setup_dev_data
    
    # Ask if user wants to run tests
    echo ""
    read -p "Do you want to run the test suite? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_tests
    fi
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    Setup Complete! 🎉                       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    print_success "AutoApply has been successfully set up!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Frontend: npm run dev (starts on http://localhost:5173)"
    echo "   2. Backend:  cd backend && python main.py (starts on http://localhost:8000)"
    echo "   3. AI Agent: python tools/run_agent.py --agent career_page"
    echo ""
    echo "🔧 Configuration:"
    echo "   • Supabase Dashboard: http://localhost:54323"
    echo "   • Database URL: $SUPABASE_URL"
    echo "   • Environment files created (.env.local and backend/.env)"
    echo ""
    echo "📚 Resources:"
    echo "   • Documentation: ./docs/"
    echo "   • Jupyter Notebooks: ./data/notebooks/"
    echo "   • API Documentation: http://localhost:8000/docs (when backend is running)"
    echo ""
    echo "⚠️  Don't forget to:"
    echo "   • Add your GitHub OAuth app credentials to .env.local"
    echo "   • Add your OpenAI API key for AI features"
    echo "   • Review the user guide in README.md"
    echo ""
}

# Run main function
main "$@"