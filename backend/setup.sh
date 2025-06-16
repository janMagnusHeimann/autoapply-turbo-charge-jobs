#!/bin/bash

# FastAPI Backend Setup with UV
# Run with: chmod +x setup.sh && ./setup.sh

set -e  # Exit on any error

echo "🚀 Setting up FastAPI Backend with UV"
echo "===================================="

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ UV is not installed. Installing UV..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.cargo/env
    echo "✅ UV installed successfully!"
fi

echo "📦 Creating virtual environment with UV..."
uv venv

echo "🔧 Installing dependencies..."
uv pip install -e .

echo "🎭 Installing Playwright browsers..."
uv run playwright install

echo "🔍 Checking environment variables..."
if [ ! -f "../.env" ]; then
    echo "⚠️  No .env file found in root directory"
    echo "Please create a .env file with:"
    echo "OPENAI_API_KEY=your_key"
    echo "VITE_SUPABASE_URL=your_url"
    echo "VITE_SUPABASE_SERVICE_KEY=your_key"
else
    echo "✅ .env file found"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "To activate the virtual environment:"
echo "  source .venv/bin/activate"
echo ""
echo "To start the backend:"
echo "  uv run python start.py"
echo ""
echo "Or use the npm script from root directory:"
echo "  npm run backend"