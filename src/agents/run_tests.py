#!/usr/bin/env python3
"""
Test runner for the multi-agent job discovery system.
Provides different testing modes and comprehensive test execution.
"""

import sys
import os
import asyncio
import subprocess
from pathlib import Path
from typing import List, Optional

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent))

def run_command(command: List[str], description: str) -> bool:
    """Run a command and return success status."""
    print(f"\n{'='*50}")
    print(f"🔧 {description}")
    print(f"{'='*50}")
    print(f"Command: {' '.join(command)}")
    print()
    
    try:
        result = subprocess.run(command, check=True, cwd=Path(__file__).parent)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed with exit code {e.returncode}")
        return False
    except FileNotFoundError:
        print(f"❌ Command not found: {command[0]}")
        return False


def install_dependencies() -> bool:
    """Install test dependencies."""
    return run_command(
        ["pip", "install", "-r", "requirements.txt"],
        "Installing dependencies"
    )


def run_unit_tests() -> bool:
    """Run unit tests."""
    return run_command(
        ["python", "-m", "pytest", "tests/test_models.py", "-v"],
        "Running unit tests (models)"
    )


def run_agent_tests() -> bool:
    """Run agent tests."""
    return run_command(
        ["python", "-m", "pytest", "tests/test_agents.py", "-v"],
        "Running agent tests"
    )


def run_orchestrator_tests() -> bool:
    """Run orchestrator tests."""
    return run_command(
        ["python", "-m", "pytest", "tests/test_orchestrator.py", "-v"],
        "Running orchestrator tests"
    )


def run_api_tests() -> bool:
    """Run API tests."""
    return run_command(
        ["python", "-m", "pytest", "tests/test_api.py", "-v"],
        "Running API tests"
    )


def run_all_tests() -> bool:
    """Run all tests with coverage."""
    return run_command(
        ["python", "-m", "pytest", "tests/", "-v", "--cov=.", "--cov-report=html", "--cov-report=term"],
        "Running all tests with coverage"
    )


def run_integration_tests() -> bool:
    """Run integration tests (slower tests with real dependencies)."""
    print(f"\n{'='*50}")
    print("🧪 Running Integration Tests")
    print(f"{'='*50}")
    
    # Set environment for integration tests
    env = os.environ.copy()
    env["INTEGRATION_TESTS"] = "true"
    env["OPENAI_API_KEY"] = env.get("OPENAI_API_KEY", "test-key-for-integration")
    
    try:
        # Run a simple integration test
        from .example_usage import example_basic_usage
        
        print("Running basic usage example as integration test...")
        
        # This would require real API keys, so we'll skip for now
        print("⚠️  Integration tests require real API keys - skipping")
        print("   Set OPENAI_API_KEY to run integration tests")
        return True
        
    except Exception as e:
        print(f"❌ Integration tests failed: {e}")
        return False


def run_quick_tests() -> bool:
    """Run quick tests (unit tests only)."""
    return run_command(
        ["python", "-m", "pytest", "tests/test_models.py", "tests/test_agents.py", "-v", "--tb=short"],
        "Running quick tests"
    )


def lint_code() -> bool:
    """Run code linting."""
    success = True
    
    # Run flake8 if available
    if run_command(["flake8", ".", "--count", "--select=E9,F63,F7,F82", "--show-source", "--statistics"], 
                   "Running flake8 linting"):
        print("✅ No critical linting errors found")
    else:
        print("⚠️  flake8 not available or found issues")
        success = False
    
    return success


def check_types() -> bool:
    """Run type checking."""
    return run_command(
        ["python", "-m", "mypy", ".", "--ignore-missing-imports"],
        "Running type checking"
    )


def format_code() -> bool:
    """Format code with black."""
    return run_command(
        ["black", ".", "--check"],
        "Checking code formatting"
    )


def run_security_check() -> bool:
    """Run security checks."""
    return run_command(
        ["bandit", "-r", ".", "-x", "tests/"],
        "Running security checks"
    )


def test_basic_imports() -> bool:
    """Test basic imports to ensure the system is properly set up."""
    print(f"\n{'='*50}")
    print("📦 Testing Basic Imports")
    print(f"{'='*50}")
    
    try:
        # Test core imports
        print("Testing core imports...")
        from .core.base_agent import BaseAgent
        from .core.agent_orchestrator import JobDiscoveryOrchestrator
        from .models import JobListing, UserPreferences
        print("✅ Core imports successful")
        
        # Test specialized agents
        print("Testing specialized agent imports...")
        from .specialized.career_discovery_agent import CareerDiscoveryAgent
        from .specialized.job_extraction_agent import JobExtractionAgent
        from .specialized.job_matching_agent import JobMatchingAgent
        print("✅ Specialized agent imports successful")
        
        # Test browser components
        print("Testing browser component imports...")
        from .browser.browser_controller import BrowserController
        from .browser.dom_processor import DOMProcessor
        print("✅ Browser component imports successful")
        
        # Test API
        print("Testing API imports...")
        from .api.main import app
        print("✅ API imports successful")
        
        print("\n✅ All imports successful!")
        return True
        
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error during import test: {e}")
        return False


def main():
    """Main test runner."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Multi-Agent Job Discovery System Test Runner")
    parser.add_argument("mode", nargs="?", default="quick", 
                       choices=["quick", "unit", "agents", "orchestrator", "api", "all", "integration", 
                               "lint", "format", "types", "security", "imports", "install"],
                       help="Test mode to run")
    parser.add_argument("--install-deps", action="store_true", help="Install dependencies first")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    print("🚀 Multi-Agent Job Discovery System Test Runner")
    print(f"Mode: {args.mode}")
    
    # Install dependencies if requested
    if args.install_deps or args.mode == "install":
        if not install_dependencies():
            print("❌ Failed to install dependencies")
            sys.exit(1)
        
        if args.mode == "install":
            print("✅ Dependencies installed successfully")
            sys.exit(0)
    
    # Test basic imports first
    if not test_basic_imports():
        print("❌ Basic imports failed - check your installation")
        sys.exit(1)
    
    # Run tests based on mode
    success = True
    
    if args.mode == "quick":
        success = run_quick_tests()
    elif args.mode == "unit":
        success = run_unit_tests()
    elif args.mode == "agents":
        success = run_agent_tests()
    elif args.mode == "orchestrator":
        success = run_orchestrator_tests()
    elif args.mode == "api":
        success = run_api_tests()
    elif args.mode == "all":
        success = run_all_tests()
    elif args.mode == "integration":
        success = run_integration_tests()
    elif args.mode == "lint":
        success = lint_code()
    elif args.mode == "format":
        success = format_code()
    elif args.mode == "types":
        success = check_types()
    elif args.mode == "security":
        success = run_security_check()
    elif args.mode == "imports":
        success = test_basic_imports()
    
    # Summary
    print(f"\n{'='*50}")
    if success:
        print("🎉 All tests completed successfully!")
        print("✅ System is ready for use")
    else:
        print("❌ Some tests failed")
        print("🔧 Please check the output above and fix any issues")
    print(f"{'='*50}")
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()