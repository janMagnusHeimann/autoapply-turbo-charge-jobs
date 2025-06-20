# AutoApply - AI-Powered Job Application Automation

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Ready-orange.svg)](https://supabase.com/)

> **Open-source AI agent that automates job searching, application generation, and career management for software engineers.**

## 🚀 Quick Start (One Command Setup)

### Prerequisites
- **Node.js 18+** ([Download](https://nodejs.org/))
- **Python 3.8+** ([Download](https://python.org/))
- **Git** ([Download](https://git-scm.com/))

### 🚀 One-Command Setup

```bash
git clone https://github.com/your-username/autoapply-turbo-charge-jobs.git
cd autoapply-turbo-charge-jobs
./setup.sh
```

That's it! The setup script will:
1. ✅ Install all dependencies (frontend + backend)
2. ✅ Set up Supabase local development environment
3. ✅ Create database tables and seed data
4. ✅ Generate environment configuration files
5. ✅ Run tests to verify everything works

### 🖥️ Running the Application

After setup, start the services:

```bash
# Terminal 1: Frontend (React)
npm run dev
# Opens http://localhost:5173

# Terminal 2: Backend (FastAPI)
cd backend
python main.py
# Opens http://localhost:8000

# Terminal 3: AI Agent (Optional)
python tools/run_agent.py --agent career_page
```

## 🚀 Features

### 🤖 AI Agent System
- **Memory Management**: Short-term and long-term memory with pattern learning
- **Tool Execution**: Modular tool system for job search, company research, and application generation
- **Experience Learning**: Learns from successful/failed applications to improve strategies

### 📊 Job Search Automation
- **Career Page Discovery**: Automatically finds and monitors company career pages
- **Job Matching**: AI-powered job matching based on skills and preferences
- **Application Generation**: Personalized CVs and cover letters for each application

### 🔧 Developer Profile Management
- **GitHub Integration**: Automatically imports repositories and analyzes code
- **Google Scholar**: Integrates publications and research work
- **Skill Assessment**: AI-powered skill extraction and categorization

### 📈 Analytics & Tracking
- **Application History**: Track all applications with status updates
- **Success Metrics**: Monitor application success rates and improve strategies
- **Company Research**: Automated company information gathering

## 🏗️ Architecture

```
├── frontend/              # React + TypeScript frontend
├── backend/               # Python FastAPI backend
├── src/job_automation/    # AI Agent Infrastructure
│   ├── application/       # High-level services
│   ├── core/             # Domain logic (agents, memory, tools)
│   │   ├── agents/       # AI agent implementations
│   │   ├── memory/       # Memory management system
│   │   └── tools/        # Tool execution system
│   └── infrastructure/   # External dependencies
│       ├── monitoring/   # Logging and metrics
│       ├── vector_database/ # Embeddings and search
│       └── api/          # API integrations
├── data/notebooks/       # Jupyter notebooks for experimentation
├── tests/               # Comprehensive test suite
├── tools/               # Utility scripts for agent management
└── docs/                # Documentation
```

## 🔧 Configuration

### Required API Keys (Optional but Recommended)

The setup script creates environment files, but you should add your API keys:

**.env.local (Frontend):**
```bash
# Supabase (auto-configured by setup script)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=auto-generated-key

# GitHub Integration (optional)
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_GITHUB_CLIENT_SECRET=your_github_client_secret

# OpenAI (optional but recommended)
VITE_OPENAI_API_KEY=sk-your-openai-api-key
```

**backend/.env (Backend):**
```bash
# Supabase (auto-configured by setup script)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=auto-generated-key
SUPABASE_SERVICE_ROLE_KEY=auto-generated-key

# AI Agent Configuration
AGENT_LOG_LEVEL=INFO
MEMORY_MAX_SIZE=1000

# External APIs (optional)
OPENAI_API_KEY=sk-your-openai-api-key
GITHUB_TOKEN=your_github_token
```

### GitHub OAuth Setup
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:5173/auth/github/callback`
4. Add Client ID and Secret to `.env.local`

### OpenAI API Setup
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to both `.env.local` and `backend/.env`

## 📚 Usage Guide

### 1. Initial Setup
1. **Create Account**: Sign up through the web interface at http://localhost:5173
2. **Connect GitHub**: Link your GitHub account for repository analysis
3. **Add Publications**: Connect Google Scholar or manually add publications
4. **Set Preferences**: Configure job preferences (location, salary, etc.)

### 2. Job Search Automation
```bash
# Start automated job discovery
python tools/run_agent.py --agent career_page --debug

# Populate memory with job search knowledge
python tools/populate_long_term_memory.py

# Generate applications for discovered jobs
# (Available through the web interface)
```

### 3. AI Agent Management
```bash
# Create a custom agent
python tools/create_agent.py --name interview_agent --description "Handles interview preparation"

# View memory statistics
python tools/populate_long_term_memory.py --debug

# Clear specific memory categories
python tools/delete_long_term_memory.py --category companies --confirm
```

### 4. Development & Experimentation
```bash
# Launch Jupyter for experimentation
cd data/notebooks
jupyter notebook

# Run comprehensive tests
npm test              # Frontend tests
cd backend && pytest # Backend tests
cd tests && pytest   # Agent tests
```

## 🧪 Experimentation

Explore the AI agent system through Jupyter notebooks:

- **`01_data_engineering_playground.ipynb`**: Data analysis and processing
- **`02_short_term_memory.ipynb`**: Memory management experiments
- **`03_long_term_memory.ipynb`**: Pattern learning and knowledge management
- **`04_tool_calling_playground.ipynb`**: Tool development and testing

```bash
cd data/notebooks
jupyter notebook
```

## 🛠️ Development

### Adding New Features

#### 1. Create a New AI Agent
```bash
python tools/create_agent.py \
  --name job_application_agent \
  --description "Automates job applications" \
  --capabilities "application_generation" "follow_up"
```

#### 2. Add New Tools
```python
# backend/src/job_automation/core/tools/my_tool.py
from ..base_tool import BaseTool, ToolResult, ToolParameter

class MyTool(BaseTool):
    def _define_parameters(self):
        return [ToolParameter("input", "string", "Tool input", required=True)]
    
    def execute(self, **kwargs):
        # Tool implementation
        return ToolResult(success=True, data="result")
```

#### 3. Extend Memory System
```python
# Add knowledge to long-term memory
memory_manager.add_knowledge("category", "key", {"data": "value"})

# Record experiences for learning
memory_manager.add_experience("job_application", {"success": True}, "success")
```

### Running Tests
```bash
# All tests
npm test && cd backend && pytest && cd ../tests && pytest

# Specific test suites
npm test                    # Frontend tests
cd backend && pytest       # Backend API tests
cd tests && pytest         # AI agent tests

# With coverage
pytest --cov=src/job_automation tests/
```

## 📖 API Documentation

### Endpoints
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Supabase Studio**: http://localhost:54323

### AI Agent API
```python
from src.job_automation.core.memory import MemoryManager
from src.job_automation.core.tools import ToolExecutor, ToolRegistry

# Initialize components
memory = MemoryManager()
registry = ToolRegistry()
executor = ToolExecutor(registry)

# Execute tools
result = executor.execute_tool("JobSearchTool", keywords="Python")
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### 1. Fork & Clone
```bash
git clone https://github.com/your-username/autoapply-turbo-charge-jobs.git
cd autoapply-turbo-charge-jobs
```

### 2. Set Up Development Environment
```bash
./setup.sh
```

### 3. Create Feature Branch
```bash
git checkout -b feature/amazing-feature
```

### 4. Make Changes & Test
```bash
# Make your changes
npm test
cd backend && pytest
cd ../tests && pytest
```

### 5. Submit Pull Request
- Ensure all tests pass
- Add documentation for new features
- Follow the existing code style

### Development Guidelines
- **Code Style**: Use prettier for frontend, black for Python
- **Testing**: Maintain >80% test coverage
- **Documentation**: Update docs for new features
- **AI Agents**: Use the established patterns in `core/agents/`

## 🔍 Troubleshooting

### Common Issues

#### Supabase Connection Issues
```bash
# Restart Supabase
supabase stop
supabase start

# Reset database
supabase db reset
```

#### Port Conflicts
```bash
# Check what's using ports
lsof -i :5173  # Frontend
lsof -i :8000  # Backend
lsof -i :54323 # Supabase
```

#### Python Dependencies
```bash
# Use uv for faster installation
pip install uv
cd backend && uv sync
```

#### Environment Variables
```bash
# Regenerate environment files
rm .env.local backend/.env
./setup.sh
```

### Getting Help
1. **Documentation**: Check `/docs` directory
2. **Issues**: Create a GitHub issue
3. **Discussions**: Use GitHub Discussions
4. **Logs**: Check browser console and terminal output

## 🔒 Privacy & Security

### Data Handling
- **Local First**: All data stored in your local Supabase instance
- **API Keys**: Never logged or shared
- **Personal Info**: Stays within your environment
- **CV Content**: Generated on-demand, not permanently stored

### Security Best Practices
- Environment variables for sensitive data
- Input validation and sanitization
- Rate limiting to prevent abuse
- Secure database connections with RLS policies

### OpenAI API Usage
- Only sends job descriptions and your profile data
- No logging of API responses
- Configurable models and usage limits
- Cost tracking to prevent surprise bills

## 📊 Roadmap

### v1.1 - Enhanced AI (Next Release)
- [ ] **Resume Parsing**: AI-powered resume analysis and optimization
- [ ] **Interview Preparation**: Mock interviews with AI feedback
- [ ] **Cover Letter Generation**: Intelligent cover letter creation
- [ ] **Improved Job Matching**: Better algorithmic matching

### v1.2 - Integrations
- [ ] **LinkedIn Integration**: Direct job import and networking
- [ ] **Email Automation**: Automated follow-up emails
- [ ] **Calendar Integration**: Interview scheduling automation
- [ ] **ATS Detection**: Optimize for Applicant Tracking Systems

### v1.3 - Analytics & Intelligence
- [ ] **Success Rate Analytics**: Track and optimize application success
- [ ] **Market Intelligence**: Industry trends and salary analysis
- [ ] **Skill Gap Analysis**: Identify missing skills for target roles
- [ ] **Network Analysis**: LinkedIn networking automation

### v2.0 - Enterprise & Scale
- [ ] **Multi-language Support**: Support for non-English job markets
- [ ] **Team Collaboration**: Multi-user support for agencies
- [ ] **Custom Workflows**: Configurable automation workflows
- [ ] **Advanced Reporting**: Comprehensive analytics dashboard

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### What this means:
- ✅ **Use commercially**: Build and sell products using this code
- ✅ **Modify freely**: Change anything you want
- ✅ **Distribute**: Share with others
- ✅ **Private use**: Use for personal projects
- ❓ **Attribution required**: Include the original license

## 🙏 Acknowledgments

- **[Supabase](https://supabase.com)**: For the amazing backend infrastructure
- **[OpenAI](https://openai.com)**: For the incredible AI capabilities
- **[React](https://reactjs.org)**: For the frontend framework
- **[FastAPI](https://fastapi.tiangolo.com)**: For the Python backend
- **[Jupyter](https://jupyter.org)**: For the experimentation environment

---

## ⭐ Star this Project

If AutoApply helps you land your dream job, please give us a star on GitHub! It helps others discover the project and motivates us to keep improving.

**[⭐ Star on GitHub](https://github.com/your-username/autoapply-turbo-charge-jobs)**

---

**Happy job hunting! 🚀**

[Report Bug](https://github.com/your-username/autoapply-turbo-charge-jobs/issues) · [Request Feature](https://github.com/your-username/autoapply-turbo-charge-jobs/issues) · [Contribute](https://github.com/your-username/autoapply-turbo-charge-jobs/pulls)