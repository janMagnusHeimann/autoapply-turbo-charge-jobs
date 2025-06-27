#!/usr/bin/env python3
"""
Setup script for testing the multi-agent job discovery system.
Prepares the environment and validates everything is working.
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible."""
    print("🐍 Checking Python version...")
    
    if sys.version_info < (3, 9):
        print("❌ Python 3.9+ is required")
        return False
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    return True

def setup_environment():
    """Setup environment variables for testing."""
    print("\n🔧 Setting up environment...")
    
    env_vars = {
        "ENVIRONMENT": "test",
        "DEBUG": "true",
        "OPENAI_API_KEY": "test-key-123",  # Fake key for unit tests
        "PYTHONPATH": str(Path(__file__).parent)
    }
    
    for key, value in env_vars.items():
        if key not in os.environ:
            os.environ[key] = value
            print(f"✅ Set {key}={value}")
        else:
            print(f"ℹ️  {key} already set")
    
    return True

def install_dependencies():
    """Install required dependencies."""
    print("\n📦 Installing dependencies...")
    
    try:
        # Install main dependencies
        subprocess.run([
            sys.executable, "-m", "pip", "install", 
            "pydantic", "fastapi", "uvicorn", "httpx", "pytest", "pytest-asyncio"
        ], check=True)
        
        print("✅ Core dependencies installed")
        
        # Try to install playwright (optional)
        try:
            subprocess.run([
                sys.executable, "-m", "pip", "install", "playwright"
            ], check=True)
            print("✅ Playwright installed")
        except subprocess.CalledProcessError:
            print("⚠️  Playwright installation failed (optional)")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def test_imports():
    """Test that all imports work."""
    print("\n📦 Testing imports...")
    
    try:
        # Test pydantic
        import pydantic
        print("✅ Pydantic available")
        
        # Test fastapi
        import fastapi
        print("✅ FastAPI available")
        
        # Test httpx
        import httpx
        print("✅ HTTPX available")
        
        # Test pytest
        import pytest
        print("✅ Pytest available")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False

def test_system_imports():
    """Test system-specific imports."""
    print("\n🧪 Testing system imports...")
    
    try:
        # Add current directory to path
        sys.path.insert(0, str(Path(__file__).parent))
        
        # Test core models
        from models import JobListing, UserPreferences
        print("✅ Models import successful")
        
        # Test base agent (may fail if dependencies missing)
        try:
            from core.base_agent import BaseAgent
            print("✅ Base agent import successful")
        except ImportError as e:
            print(f"⚠️  Base agent import failed: {e}")
        
        return True
        
    except ImportError as e:
        print(f"❌ System import failed: {e}")
        print("   This is expected if dependencies are missing")
        return False

def create_test_config():
    """Create a test configuration file."""
    print("\n⚙️  Creating test configuration...")
    
    config_content = """# Test configuration for multi-agent system
OPENAI_API_KEY=test-key-123
ENVIRONMENT=test
DEBUG=true
LOG_LEVEL=INFO
MAX_CONCURRENT_WORKFLOWS=3
WORKFLOW_TIMEOUT=60
"""
    
    config_file = Path(".env.test")
    with open(config_file, "w") as f:
        f.write(config_content)
    
    print(f"✅ Created {config_file}")
    return True

def run_basic_test():
    """Run a basic test to verify everything works."""
    print("\n🧪 Running basic test...")
    
    try:
        # Test model creation
        from models import UserPreferences, JobType
        
        prefs = UserPreferences(
            skills=["python", "javascript"],
            experience_years=3,
            job_types=[JobType.REMOTE]
        )
        
        print(f"✅ Created user preferences: {prefs.skills}")
        
        # Test validation
        if len(prefs.skills) == 2:
            print("✅ Model validation working")
        
        return True
        
    except Exception as e:
        print(f"❌ Basic test failed: {e}")
        return False

def run_simple_unit_test():
    """Run a simple unit test."""
    print("\n🔍 Running simple unit test...")
    
    try:
        # Create a simple test
        test_code = '''
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from models import JobListing

def test_job_listing():
    job = JobListing(
        title="Test Engineer",
        company="Test Corp"
    )
    assert job.title == "Test Engineer"
    assert job.company == "Test Corp"
    assert job.id is not None
    print("✅ Job listing test passed")

if __name__ == "__main__":
    test_job_listing()
'''
        
        # Write and run test
        test_file = Path("simple_test.py")
        with open(test_file, "w") as f:
            f.write(test_code)
        
        subprocess.run([sys.executable, str(test_file)], check=True)
        
        # Cleanup
        test_file.unlink()
        
        print("✅ Simple unit test passed")
        return True
        
    except Exception as e:
        print(f"❌ Simple unit test failed: {e}")
        return False

def print_next_steps():
    """Print next steps for testing."""
    print(f"\n{'='*60}")
    print("🎉 Setup Complete! Next Steps:")
    print(f"{'='*60}")
    
    print("\n1. Run quick tests:")
    print("   python run_tests.py quick")
    
    print("\n2. Run specific tests:")
    print("   python -m pytest tests/test_models.py -v")
    
    print("\n3. Test API (requires OpenAI key):")
    print("   export OPENAI_API_KEY='your-real-key'")
    print("   python -m uvicorn api.main:app --port 8000")
    
    print("\n4. Run integration tests:")
    print("   export OPENAI_API_KEY='your-real-key'")
    print("   python run_tests.py integration")
    
    print("\n5. View test coverage:")
    print("   python run_tests.py all")
    print("   open htmlcov/index.html")
    
    print(f"\n{'='*60}")
    print("📚 Read TESTING_GUIDE.md for detailed instructions")
    print(f"{'='*60}")

def main():
    """Main setup function."""
    print("🚀 Multi-Agent Job Discovery System - Testing Setup")
    print("=" * 60)
    
    success_count = 0
    total_checks = 7
    
    # Run setup checks
    if check_python_version():
        success_count += 1
    
    if setup_environment():
        success_count += 1
    
    if install_dependencies():
        success_count += 1
    
    if test_imports():
        success_count += 1
    
    if test_system_imports():
        success_count += 1
    
    if create_test_config():
        success_count += 1
    
    if run_basic_test():
        success_count += 1
    
    # Summary
    print(f"\n{'='*60}")
    print(f"Setup Results: {success_count}/{total_checks} checks passed")
    
    if success_count == total_checks:
        print("🎉 All setup checks passed!")
        print_next_steps()
    elif success_count >= 5:
        print("⚠️  Setup mostly successful with some warnings")
        print("   You can proceed with basic testing")
        print_next_steps()
    else:
        print("❌ Setup failed - please check the errors above")
        print("\nCommon solutions:")
        print("1. Install Python 3.9+")
        print("2. Run: pip install pydantic fastapi pytest")
        print("3. Check your internet connection")
    
    return success_count == total_checks

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)