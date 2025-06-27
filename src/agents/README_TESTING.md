# 🧪 How to Test the Multi-Agent Job Discovery System

## 🚀 Quick Start (5 minutes)

### 1. Setup and Basic Test
```bash
cd src/agents

# Run setup script
python setup_testing.py

# Run quick tests
python run_tests.py quick
```

### 2. Test Individual Components
```bash
# Test data models (fastest)
python run_tests.py unit

# Test agent functionality  
python run_tests.py agents

# Test API endpoints
python run_tests.py api
```

### 3. Run All Tests
```bash
# Complete test suite with coverage
python run_tests.py all
```

## 📋 Testing Checklist

### ✅ Basic Setup (Required)
- [ ] Python 3.9+ installed
- [ ] Dependencies installed: `pip install pydantic fastapi pytest`
- [ ] Environment variables set: `export ENVIRONMENT=test`
- [ ] Basic imports working: `python -c "from models import JobListing"`

### ✅ Unit Tests (No API keys needed)
```bash
# Test core functionality
python -m pytest tests/test_models.py -v
python -m pytest tests/test_agents.py -v
```

### ✅ API Tests (No API keys needed)
```bash
# Test REST endpoints with mocks
python -m pytest tests/test_api.py -v
```

### ✅ Integration Tests (Requires OpenAI API key)
```bash
export OPENAI_API_KEY="your-real-openai-key"
python run_tests.py integration
```

## 🔧 Testing Modes Explained

### 1. **Quick Tests** (`python run_tests.py quick`)
- **Time**: ~30 seconds
- **What**: Basic functionality, models, core logic
- **Requires**: No API keys
- **Best for**: Development, CI/CD

### 2. **Unit Tests** (`python run_tests.py unit`)
- **Time**: ~1 minute  
- **What**: Individual component testing
- **Requires**: No API keys
- **Best for**: Testing specific changes

### 3. **Agent Tests** (`python run_tests.py agents`)
- **Time**: ~2 minutes
- **What**: Agent behavior and coordination
- **Requires**: No API keys (uses mocks)
- **Best for**: Testing agent logic

### 4. **API Tests** (`python run_tests.py api`)
- **Time**: ~1 minute
- **What**: REST API endpoints
- **Requires**: No API keys (uses mocks)
- **Best for**: Testing web interface

### 5. **All Tests** (`python run_tests.py all`)
- **Time**: ~5 minutes
- **What**: Complete test suite + coverage
- **Requires**: No API keys for most tests
- **Best for**: Release validation

### 6. **Integration Tests** (`python run_tests.py integration`)
- **Time**: ~10 minutes
- **What**: Real API calls, browser automation
- **Requires**: OpenAI API key, internet
- **Best for**: End-to-end validation

## 🛠️ Manual Testing

### Test 1: Basic Functionality
```python
# Create test_basic.py
from models import UserPreferences, JobType

prefs = UserPreferences(
    skills=["python", "javascript"],
    experience_years=3,
    job_types=[JobType.REMOTE]
)

print(f"✅ Created preferences: {prefs.skills}")
```

### Test 2: API Server
```bash
# Start server
python -m uvicorn api.main:app --port 8000

# Test in another terminal
curl http://localhost:8000/health
```

### Test 3: Real Job Discovery (Requires API key)
```python
# Create test_real.py
import asyncio
from openai import AsyncOpenAI
from core.agent_orchestrator import JobDiscoveryOrchestrator
from models import JobDiscoveryRequest, UserPreferences, JobType

async def test_real():
    llm_client = AsyncOpenAI()  # Uses OPENAI_API_KEY
    
    request = JobDiscoveryRequest(
        company_name="GitHub",
        company_website="https://github.com",
        user_preferences=UserPreferences(
            skills=["python"],
            job_types=[JobType.REMOTE]
        ),
        max_execution_time=60
    )
    
    async with JobDiscoveryOrchestrator(llm_client) as orchestrator:
        result = await orchestrator.discover_jobs(request)
        print(f"Success: {result.success}")

asyncio.run(test_real())
```

## 🐛 Troubleshooting

### Import Errors
```bash
# Fix Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Or install in development mode
pip install -e .
```

### Missing Dependencies
```bash
# Install all testing dependencies
pip install pytest pytest-asyncio pytest-mock httpx

# For browser testing
pip install playwright
playwright install
```

### API Key Issues
```bash
# For unit tests (fake key)
export OPENAI_API_KEY="test-key-123"

# For integration tests (real key)
export OPENAI_API_KEY="sk-proj-..."
```

### Browser Issues
```bash
# Install system dependencies
playwright install-deps

# Test browser works
python -c "
import asyncio
from playwright.async_api import async_playwright
async def test():
    async with async_playwright() as p:
        await p.chromium.launch()
        print('Browser OK')
asyncio.run(test())
"
```

## 📊 Understanding Test Results

### ✅ Success Output
```
✅ Configuration valid: True
✅ All imports successful!
========================= test session starts =========================
tests/test_models.py::TestJobListing::test_job_listing_creation PASSED
tests/test_agents.py::TestCareerDiscoveryAgent::test_agent_initialization PASSED
========================= 25 passed in 10.5s =========================
✅ All tests completed successfully!
```

### ❌ Common Failures

1. **Import Error**: Missing dependencies
   ```bash
   pip install pydantic fastapi
   ```

2. **API Key Error**: Set environment variable
   ```bash
   export OPENAI_API_KEY="your-key"
   ```

3. **Browser Error**: Install Playwright
   ```bash
   pip install playwright
   playwright install
   ```

## 🚀 Production Testing

### Performance Test
```python
import asyncio
import time

async def performance_test():
    start = time.time()
    
    # Run 10 concurrent job matching operations
    tasks = []
    for i in range(10):
        task = asyncio.create_task(run_job_matching())
        tasks.append(task)
    
    await asyncio.gather(*tasks)
    
    print(f"10 operations completed in {time.time() - start:.2f}s")

asyncio.run(performance_test())
```

### Load Test API
```bash
# Install wrk or similar
brew install wrk  # macOS

# Test API performance
wrk -t4 -c100 -d30s http://localhost:8000/health
```

### Memory Test
```python
import psutil
import os

def memory_test():
    process = psutil.Process(os.getpid())
    
    print(f"Memory before: {process.memory_info().rss / 1024 / 1024:.1f} MB")
    
    # Run heavy operations
    run_multiple_workflows()
    
    print(f"Memory after: {process.memory_info().rss / 1024 / 1024:.1f} MB")

memory_test()
```

## 📈 Test Coverage

### Generate Coverage Report
```bash
python -m pytest tests/ --cov=. --cov-report=html
open htmlcov/index.html
```

### Coverage Goals
- **Models**: > 95% (easy to test)
- **Agents**: > 80% (complex business logic)
- **API**: > 90% (critical user interface)
- **Overall**: > 85%

## 🔄 Continuous Testing

### Pre-commit Hook
```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
echo "
repos:
  - repo: local
    hooks:
      - id: tests
        name: Run quick tests
        entry: python src/agents/run_tests.py quick
        language: system
        pass_filenames: false
" > .pre-commit-config.yaml

pre-commit install
```

### GitHub Actions
```yaml
# .github/workflows/test.yml
name: Test
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
```

## 🎯 Next Steps

1. **Start with Quick Tests**: `python run_tests.py quick`
2. **Fix any failures**: Check dependencies and environment
3. **Run Full Suite**: `python run_tests.py all`
4. **Test with Real API**: Set `OPENAI_API_KEY` and run integration tests
5. **Test in Production**: Deploy and run load tests

## 📞 Getting Help

- **Check logs**: Tests run with detailed logging
- **Read test output**: Error messages are descriptive
- **Check TESTING_GUIDE.md**: Comprehensive troubleshooting
- **Run setup again**: `python setup_testing.py`

The system is designed to work even without API keys for basic testing, making it easy to validate functionality during development.