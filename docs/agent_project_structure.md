# Agent Project Structure

This is the recommended structure for AI agent projects. This structure provides clear separation of concerns and follows best practices for maintainable, scalable agent development.

```
agent-project/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── ISSUE_TEMPLATE.md
├── data/
│   └── notebooks/
│       ├── 01_data_engineering_playground.ipynb
│       ├── 02_short_term_memory.ipynb
│       ├── 03_long_term_memory.ipynb
│       └── 04_tool_calling_playground.ipynb
├── src/agent_project/
│   ├── application/
│   │   ├── chat_service/
│   │   ├── add_new_agent_service/
│   │   ├── add_new_tool_service/
│   │   └── evaluation_service/
│   ├── core/
│   │   ├── agent/
│   │   ├── memory/
│   │   ├── tools/
│   │   └── utils/
│   ├── infrastructure/
│   │   ├── vector_database/
│   │   ├── monitoring/
│   │   ├── clients/
│   │   └── api/
│   └── config.py
├── tools/
│   ├── populate_long_term_memory.py
│   ├── delete_long_term_memory.py
│   ├── create_agent.py
│   ├── generate_evaluation_dataset.py
│   ├── finetune_agent_llm.py
│   └── run_agent.py
├── tests/
│   ├── test_memory.py
│   └── test_agent.py
├── .env.example
├── .python-version
├── Dockerfile
├── Makefile
├── pyproject.toml
└── static/
```

## Directory Structure Explanation

### 🔄 CI/CD Pipeline
- `.github/workflows/` - GitHub Actions for continuous integration and deployment
- Automated testing and deployment workflows

### 📊 Data & Exploration
- `data/notebooks/` - Jupyter notebooks for data exploration and experimentation
- Playground environments for testing different components

### 🏗️ Core Application (`src/agent_project/`)

#### Application Layer
- **`application/`** - High-level services and use cases
  - `chat_service/` - Handles chat interactions
  - `add_new_agent_service/` - Agent creation and management
  - `add_new_tool_service/` - Tool integration services
  - `evaluation_service/` - Agent performance evaluation

#### Core Domain
- **`core/`** - Core business logic and domain models
  - `agent/` - Agent implementation and behavior
  - `memory/` - Memory management (short-term and long-term)
  - `tools/` - Tool definitions and integrations
  - `utils/` - Shared utilities and helpers

#### Infrastructure
- **`infrastructure/`** - External dependencies and technical concerns
  - `vector_database/` - Vector storage for embeddings
  - `monitoring/` - Logging, metrics, and observability
  - `clients/` - External API clients
  - `api/` - API endpoints and routing

### 🛠️ Utility Scripts (`tools/`)
- Entry points for common operations
- Memory management utilities
- Agent training and evaluation scripts

### 🧪 Testing
- `tests/` - Unit and integration tests
- Test coverage for core functionality

### 📋 Configuration & Deployment
- `.env.example` - Environment variable template
- `Dockerfile` - Container configuration
- `Makefile` - Build and development commands
- `pyproject.toml` - Python project configuration
- `static/` - Static assets and resources

## Key Benefits

1. **Separation of Concerns** - Clear boundaries between application logic, domain models, and infrastructure
2. **Scalability** - Modular structure supports adding new agents and tools
3. **Testability** - Isolated components are easier to test
4. **Maintainability** - Organized codebase with clear responsibilities
5. **Development Workflow** - Includes CI/CD, testing, and deployment automation

## Usage Guidelines

- Keep domain logic in `core/` independent of external dependencies
- Use `application/` for orchestrating use cases
- Place infrastructure concerns in `infrastructure/`
- Maintain comprehensive tests in `tests/`
- Use notebooks in `data/` for experimentation and analysis
- Leverage `tools/` scripts for operational tasks