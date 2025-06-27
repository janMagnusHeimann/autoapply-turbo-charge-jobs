# Multi-Agent Job Discovery System - Testing Guide

This guide provides comprehensive instructions for testing the multi-agent job discovery system.

## 🚀 Quick Start

### 1. Environment Setup

First, set up your environment variables:

```bash
# Required for testing
export OPENAI_API_KEY="your-openai-api-key"  # Optional for unit tests
export ENVIRONMENT="test"
export DEBUG="true"

# Optional for full testing
export ANTHROPIC_API_KEY="your-anthropic-key"
```

### 2. Install Dependencies

```bash
cd src/agents
pip install -r requirements.txt

# Or use the test runner
python run_tests.py install
```

### 3. Run Quick Tests

```bash
# Run basic tests (fastest)
python run_tests.py quick

# Or use pytest directly
python -m pytest tests/test_models.py -v
```

## 🧪 Testing Modes

### Unit Tests (Fastest)
Test individual components without external dependencies:

```bash
# Test data models
python run_tests.py unit

# Or specific test files
python -m pytest tests/test_models.py -v
python -m pytest tests/test_agents.py -v
```

### Agent Tests
Test individual agent functionality:

```bash
python run_tests.py agents
```

### Orchestrator Tests
Test the multi-agent coordination system:

```bash
python run_tests.py orchestrator
```

### API Tests
Test FastAPI endpoints:

```bash
python run_tests.py api
```

### Full Test Suite
Run all tests with coverage:

```bash
python run_tests.py all
```

### Integration Tests
Test with real dependencies (requires API keys):

```bash
# Set real API keys first
export OPENAI_API_KEY="your-real-key"
python run_tests.py integration
```

## 🔧 Development Testing

### Code Quality Checks

```bash
# Check imports and basic setup
python run_tests.py imports

# Lint code
python run_tests.py lint

# Check types
python run_tests.py types

# Security scan
python run_tests.py security

# Format check
python run_tests.py format
```

### Manual Testing

#### 1. Test Basic Functionality

```python
# Create a simple test script
cat > test_basic.py << 'EOF'
import asyncio
from src.agents.models import UserPreferences, JobType
from src.agents.config import validate_configuration

async def test_basic():
    # Test configuration
    config_result = validate_configuration()
    print(f"Configuration valid: {config_result['valid']}")
    
    # Test models
    prefs = UserPreferences(
        skills=["python", "javascript"],
        experience_years=3,
        job_types=[JobType.REMOTE]
    )
    print(f"User preferences created: {prefs.skills}")
    
    print("✅ Basic functionality test passed!")

if __name__ == "__main__":
    asyncio.run(test_basic())
EOF

python test_basic.py
```

#### 2. Test API Server

```bash
# Start the API server
cd src/agents
python -m uvicorn api.main:app --reload --port 8000

# In another terminal, test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/system-status
```

#### 3. Test Individual Agents

```python
# Create agent test script
cat > test_agents.py << 'EOF'
import asyncio
from unittest.mock import AsyncMock
from src.agents.specialized.job_matching_agent import JobMatchingAgent, UserPreferences
from src.agents.models import JobType

async def test_matching_agent():
    # Mock LLM client
    mock_llm = AsyncMock()
    
    # Create agent
    agent = JobMatchingAgent(llm_client=mock_llm)
    
    # Test data
    jobs = [{
        "title": "Python Developer",
        "company": "Test Corp",
        "skills": ["python", "django"],
        "location": "Remote"
    }]
    
    prefs = UserPreferences(
        skills=["python"],
        job_types=[JobType.REMOTE]
    )
    
    # Test matching (will use mocked LLM)
    result = await agent.match_jobs_to_preferences(jobs, prefs, False)
    print(f"Matching result: {result.get('success', False)}")

if __name__ == "__main__":
    asyncio.run(test_matching_agent())
EOF

python test_agents.py
```

## 🌐 Real-World Testing

### 1. Test with Real Company

```python
# Create real test script (requires OPENAI_API_KEY)
cat > test_real.py << 'EOF'
import asyncio
from openai import AsyncOpenAI
from src.agents.core.agent_orchestrator import JobDiscoveryOrchestrator
from src.agents.browser.browser_controller import BrowserConfig
from src.agents.models import JobDiscoveryRequest, UserPreferences, JobType

async def test_real_discovery():
    # Initialize with real LLM client
    llm_client = AsyncOpenAI()
    
    browser_config = BrowserConfig(headless=True, save_screenshots=True)
    
    # Create request
    request = JobDiscoveryRequest(
        company_name="GitHub",
        company_website="https://github.com",
        user_preferences=UserPreferences(
            skills=["python", "javascript"],
            experience_years=3,
            job_types=[JobType.REMOTE],
            minimum_match_score=0.3
        ),
        max_execution_time=60,  # Short timeout for testing
        include_ai_analysis=False,  # Faster
        extract_all_pages=False,
        max_pages_per_site=2
    )
    
    # Run discovery
    async with JobDiscoveryOrchestrator(llm_client, browser_config) as orchestrator:
        result = await orchestrator.discover_jobs(request)
        
        print(f"Success: {result.success}")
        print(f"Career pages: {result.total_career_pages}")
        print(f"Jobs extracted: {result.total_jobs_extracted}")
        print(f"Execution time: {result.execution_time:.2f}s")

if __name__ == "__main__":
    asyncio.run(test_real_discovery())
EOF

# Run with real API key
export OPENAI_API_KEY="your-key"
python test_real.py
```

### 2. Test API Integration

```bash
# Start API server
python -m uvicorn api.main:app --port 8000 &

# Test workflow
curl -X POST "http://localhost:8000/api/multi-agent-job-discovery" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Example Corp",
    "company_website": "https://example.com",
    "user_preferences": {
      "skills": ["python"],
      "experience_years": 3,
      "locations": ["remote"],
      "job_types": ["remote"],
      "minimum_match_score": 0.4
    },
    "include_ai_analysis": false,
    "max_pages_per_site": 2
  }'
```

## 🐛 Debugging Tests

### Common Issues and Solutions

#### 1. Import Errors
```bash
# Check Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Verify structure
python -c "import src.agents.models; print('✅ Imports work')"
```

#### 2. Missing Dependencies
```bash
# Install all dependencies
pip install playwright pytest pytest-asyncio httpx

# Install Playwright browsers
playwright install
```

#### 3. API Key Issues
```bash
# For unit tests (use fake keys)
export OPENAI_API_KEY="test-key-123"

# For integration tests (use real keys)
export OPENAI_API_KEY="sk-..."
```

#### 4. Browser Issues
```bash
# Install browser dependencies
playwright install-deps

# Test browser directly
python -c "
import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        print('✅ Browser works')
        await browser.close()

asyncio.run(test())
"
```

### Verbose Testing

```bash
# Run with maximum verbosity
python -m pytest tests/ -v -s --tb=long --log-cli-level=DEBUG

# Test specific function
python -m pytest tests/test_models.py::TestJobListing::test_job_listing_creation -v -s
```

### Test Coverage

```bash
# Generate detailed coverage report
python -m pytest tests/ --cov=. --cov-report=html --cov-report=term-missing

# View coverage report
open htmlcov/index.html  # macOS
# or
xdg-open htmlcov/index.html  # Linux
```

## 📊 Test Results Interpretation

### Successful Test Output
```
✅ Configuration valid: True
✅ All imports successful!
✅ Unit tests: 25 passed
✅ Agent tests: 15 passed
✅ API tests: 12 passed
✅ Coverage: 85%
```

### Common Test Failures

1. **Configuration Issues**: Check environment variables
2. **Import Errors**: Verify Python path and dependencies
3. **Mock Failures**: Update test mocks for new functionality
4. **API Timeouts**: Reduce test timeouts or mock external calls

## 🚀 Continuous Integration

### GitHub Actions Setup
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    - name: Install dependencies
      run: |
        cd src/agents
        pip install -r requirements.txt
    - name: Run tests
      run: |
        cd src/agents
        python run_tests.py all
      env:
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Local Pre-commit Hook
```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: local
    hooks:
      - id: tests
        name: Run tests
        entry: python src/agents/run_tests.py quick
        language: system
        pass_filenames: false
EOF

# Install hook
pre-commit install
```

## 📝 Writing New Tests

### Test Structure
```python
import pytest
from unittest.mock import AsyncMock, MagicMock

class TestNewFeature:
    """Test new feature functionality."""
    
    def test_basic_functionality(self):
        """Test basic functionality."""
        # Arrange
        # Act
        # Assert
        pass
    
    @pytest.mark.asyncio
    async def test_async_functionality(self, mock_llm_client):
        """Test async functionality."""
        # Use fixtures and mocks
        pass
    
    def test_error_handling(self):
        """Test error handling."""
        with pytest.raises(ValueError):
            # Test error conditions
            pass
```

### Best Practices
- Use descriptive test names
- Test both success and failure cases
- Mock external dependencies
- Use fixtures for common setup
- Keep tests independent
- Test edge cases

## 🎯 Performance Testing

### Load Testing
```python
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor

async def performance_test():
    """Test system performance with multiple requests."""
    start_time = time.time()
    
    # Simulate multiple concurrent requests
    tasks = []
    for i in range(10):
        # Create test task
        task = asyncio.create_task(test_basic_functionality())
        tasks.append(task)
    
    await asyncio.gather(*tasks)
    
    execution_time = time.time() - start_time
    print(f"10 concurrent tasks completed in {execution_time:.2f}s")

if __name__ == "__main__":
    asyncio.run(performance_test())
```

This testing guide provides comprehensive coverage for testing the multi-agent job discovery system at all levels, from unit tests to real-world integration testing.