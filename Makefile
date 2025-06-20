# AutoApply - AI-Powered Job Application Automation
# Makefile for development and deployment

.PHONY: help install setup start stop test lint format clean build deploy docs

# Default target
help:
	@echo "AutoApply - AI Agent Job Application System"
	@echo ""
	@echo "Available commands:"
	@echo "  install       Install all dependencies (frontend + backend)"
	@echo "  setup         Complete project setup (install + database + env)"
	@echo "  start         Start all services (frontend + backend + supabase)"
	@echo "  stop          Stop all services"
	@echo "  test          Run all tests"
	@echo "  lint          Run linting for all code"
	@echo "  format        Format all code"
	@echo "  clean         Clean build artifacts and dependencies"
	@echo "  build         Build production assets"
	@echo "  deploy        Deploy to production"
	@echo "  docs          Generate documentation"
	@echo ""
	@echo "Development commands:"
	@echo "  dev-frontend  Start frontend development server"
	@echo "  dev-backend   Start backend development server"
	@echo "  dev-agent     Start AI agent in development mode"
	@echo ""

# Installation
install: install-frontend install-backend install-tools

install-frontend:
	@echo "Installing frontend dependencies..."
	npm install

install-backend:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt

install-tools:
	@echo "Installing development tools..."
	npm install -g supabase
	pip install black flake8 pytest pytest-cov

# Setup
setup: install setup-database setup-env
	@echo "Setup complete! Run 'make start' to begin development."

setup-database:
	@echo "Setting up Supabase database..."
	supabase start
	supabase db reset

setup-env:
	@echo "Setting up environment files..."
	@if [ ! -f .env.local ]; then \
		cp .env.example .env.local; \
		echo "Created .env.local - please add your API keys"; \
	fi
	@if [ ! -f backend/.env ]; then \
		echo "Creating backend/.env..."; \
		cd backend && cp ../.env.example .env; \
	fi

# Development servers
start: start-database start-backend start-frontend

start-database:
	@echo "Starting Supabase..."
	supabase start

start-backend:
	@echo "Starting backend server..."
	cd backend && python main.py &

start-frontend:
	@echo "Starting frontend development server..."
	npm run dev &

dev-frontend:
	@echo "Starting frontend in development mode..."
	npm run dev

dev-backend:
	@echo "Starting backend in development mode..."
	cd backend && python main.py

dev-agent:
	@echo "Starting AI agent in development mode..."
	python tools/run_agent.py --agent career_page --debug

# Stop services
stop:
	@echo "Stopping all services..."
	pkill -f "npm run dev" || true
	pkill -f "python main.py" || true
	supabase stop

# Testing
test: test-frontend test-backend test-agents

test-frontend:
	@echo "Running frontend tests..."
	npm test -- --watchAll=false

test-backend:
	@echo "Running backend tests..."
	cd backend && python -m pytest tests/ --cov=src --cov-report=term-missing

test-agents:
	@echo "Running agent tests..."
	python -m pytest tests/ --cov=backend/src --cov-report=term-missing

test-watch:
	@echo "Running tests in watch mode..."
	npm test &
	cd backend && python -m pytest tests/ --cov=src -f &
	python -m pytest tests/ --cov=backend/src -f

# Code quality
lint: lint-frontend lint-backend

lint-frontend:
	@echo "Linting frontend code..."
	npm run lint

lint-backend:
	@echo "Linting backend code..."
	cd backend && flake8 src/ tests/
	flake8 tests/ tools/

format: format-frontend format-backend

format-frontend:
	@echo "Formatting frontend code..."
	npm run format || npx prettier --write "src/**/*.{ts,tsx,js,jsx}"

format-backend:
	@echo "Formatting backend code..."
	cd backend && black src/ tests/
	black tests/ tools/

# Build
build: build-frontend build-backend

build-frontend:
	@echo "Building frontend..."
	npm run build

build-backend:
	@echo "Building backend..."
	cd backend && python setup.py build

# Clean
clean: clean-frontend clean-backend clean-database

clean-frontend:
	@echo "Cleaning frontend build artifacts..."
	rm -rf dist/
	rm -rf node_modules/
	rm -rf .vite/

clean-backend:
	@echo "Cleaning backend build artifacts..."
	cd backend && rm -rf build/ dist/ *.egg-info/
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete

clean-database:
	@echo "Cleaning database..."
	supabase db reset --force

# Agent management
agent-create:
	@echo "Creating new agent..."
	@read -p "Agent name: " name; \
	read -p "Description: " desc; \
	python tools/create_agent.py --name "$$name" --description "$$desc"

agent-list:
	@echo "Available agents:"
	@ls backend/src/job_automation/core/agents/*_agent.py | sed 's/.*\///g' | sed 's/_agent.py//g'

memory-populate:
	@echo "Populating long-term memory..."
	python tools/populate_long_term_memory.py

memory-clear:
	@echo "Clearing memory..."
	python tools/delete_long_term_memory.py --confirm

# Documentation
docs:
	@echo "Generating documentation..."
	@echo "API documentation available at http://localhost:8000/docs when backend is running"
	@echo "Project documentation in docs/ directory"

docs-serve:
	@echo "Serving documentation..."
	cd docs && python -m http.server 8080

# Database management
db-migrate:
	@echo "Running database migrations..."
	supabase db push

db-reset:
	@echo "Resetting database..."
	supabase db reset

db-backup:
	@echo "Backing up database..."
	supabase db dump > backup_$(shell date +%Y%m%d_%H%M%S).sql

# Deployment
deploy-staging:
	@echo "Deploying to staging..."
	# Add staging deployment commands here

deploy-production:
	@echo "Deploying to production..."
	# Add production deployment commands here

# Docker
docker-build:
	@echo "Building Docker image..."
	docker build -t autoapply:latest .

docker-run:
	@echo "Running Docker container..."
	docker-compose up -d

docker-stop:
	@echo "Stopping Docker containers..."
	docker-compose down

# Health checks
health-check:
	@echo "Checking system health..."
	@echo "Frontend: http://localhost:5173"
	@curl -s http://localhost:5173 > /dev/null && echo "✓ Frontend is running" || echo "✗ Frontend is not running"
	@echo "Backend: http://localhost:8000"
	@curl -s http://localhost:8000/health > /dev/null && echo "✓ Backend is running" || echo "✗ Backend is not running"
	@echo "Database: http://localhost:54323"
	@curl -s http://localhost:54323 > /dev/null && echo "✓ Database is running" || echo "✗ Database is not running"

# Utility commands
logs:
	@echo "Showing service logs..."
	tail -f *.log 2>/dev/null || echo "No log files found"

ps:
	@echo "Showing running processes..."
	ps aux | grep -E "(npm|python|supabase)" | grep -v grep

# Security
security-check:
	@echo "Running security checks..."
	npm audit
	cd backend && safety check

# Version info
version:
	@echo "AutoApply Version Information:"
	@echo "Node.js: $(shell node --version)"
	@echo "Python: $(shell python --version)"
	@echo "npm: $(shell npm --version)"
	@echo "Supabase CLI: $(shell supabase --version)"