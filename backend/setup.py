#!/usr/bin/env python3
"""
FastAPI Backend Setup Script
Run with: python setup.py
"""

import subprocess
import sys
import os

def install_requirements():
    """Install Python requirements"""
    print("🐍 Installing Python requirements...")
    
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Python requirements installed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False
    
    return True

def install_playwright():
    """Install Playwright browsers"""
    print("🎭 Installing Playwright browsers...")
    
    try:
        subprocess.check_call([sys.executable, "-m", "playwright", "install"])
        print("✅ Playwright browsers installed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install Playwright browsers: {e}")
        return False
    
    return True

def check_environment():
    """Check environment variables"""
    print("🔧 Checking environment variables...")
    
    required_env_vars = [
        "OPENAI_API_KEY",
        "VITE_SUPABASE_URL", 
        "VITE_SUPABASE_SERVICE_KEY"
    ]
    
    missing_vars = []
    for var in required_env_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠️  Missing environment variables: {', '.join(missing_vars)}")
        print("Please set these in your .env file")
        return False
    
    print("✅ All required environment variables are set!")
    return True

def main():
    print("🚀 Setting up FastAPI Job Automation Backend")
    print("=" * 50)
    
    success = True
    
    # Install requirements
    if not install_requirements():
        success = False
    
    print()
    
    # Install Playwright
    if not install_playwright():
        success = False
    
    print()
    
    # Check environment
    if not check_environment():
        success = False
    
    print()
    
    if success:
        print("🎉 Setup completed successfully!")
        print("🚀 You can now start the backend with: python start.py")
    else:
        print("❌ Setup failed. Please fix the errors above and try again.")
        sys.exit(1)

if __name__ == "__main__":
    main()