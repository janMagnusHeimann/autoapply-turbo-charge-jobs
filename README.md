# 🤖 AutoApply - AI-Powered Job Application Automation

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

**AutoApply** is an open-source AI-powered job application automation platform that helps you discover jobs, generate tailored CVs, and apply automatically to tech positions. Run everything locally with just your OpenAI API key!

## 🚀 **Quick Start (5 Minutes)**

### **Prerequisites**
- Node.js 18+ ([Download](https://nodejs.org/))
- Git ([Download](https://git-scm.com/))
- OpenAI API Key ([Get one here](https://platform.openai.com/api-keys))

### **1. Clone & Setup**
```bash
git clone https://github.com/yourusername/autoapply.git
cd autoapply
npm install
```

### **2. Configure Environment**
```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```env
VITE_OPENAI_API_KEY=sk-your-openai-key-here
```

### **3. Setup Database (Choose One)**

#### **Option A: Supabase Cloud (Recommended - Free)**
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings → API and copy your URL and anon key
4. Add to `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Run database setup:
   ```bash
   npm run db:setup
   ```

#### **Option B: Local Docker Database**
```bash
# Start local Supabase (requires Docker)
npm run db:local
# Database will be available at http://localhost:54323
```

### **4. Start the Application**
```bash
npm run dev
```

**🎉 That's it!** Open [http://localhost:5173](http://localhost:5173) and start using AutoApply!

---

## 📖 **Complete Setup Guide**

### **What You Get**
- 🌐 **Web UI**: Clean dashboard for managing jobs and applications
- 🤖 **AI Agent**: Automated job discovery and application
- 📄 **CV Generation**: Tailored resumes for each application
- 🏢 **Company Database**: Automated crawling of tech job boards
- 💰 **Cost Tracking**: Monitor OpenAI API usage
- 🔍 **Job Search**: Semi-automated job discovery per company

### **Environment Configuration**

Create `.env` from the example:
```bash
cp .env.example .env
```

**Required Variables:**
```env
# OpenAI Configuration (Required)
VITE_OPENAI_API_KEY=sk-your-openai-key-here

# Database Configuration (Choose Supabase Cloud or Local)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: For local development
VITE_SUPABASE_SERVICE_KEY=your-service-key  # For job crawler
```

### **Database Setup Options**

#### **🌟 Option 1: Supabase Cloud (Recommended)**

**Why Supabase Cloud?**
- ✅ Free tier with 500MB storage
- ✅ Automatic backups and scaling
- ✅ Built-in authentication
- ✅ Real-time subscriptions
- ✅ No local setup required

**Setup Steps:**
1. **Create Account**: Go to [supabase.com](https://supabase.com)
2. **New Project**: Click "New Project" and choose a name
3. **Get Credentials**: 
   - Go to Settings → API
   - Copy "Project URL" and "anon public" key
4. **Configure `.env`**:
   ```env
   VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
5. **Setup Database**:
   ```bash
   npm run db:setup
   ```

#### **🐳 Option 2: Local Docker Database**

**For advanced users who want everything local:**

```bash
# Start local Supabase stack
npm run db:local

# This will start:
# - PostgreSQL database
# - Supabase Studio UI
# - Authentication server
# - Storage server
```

Access points:
- **Database**: `postgresql://localhost:54322/postgres`
- **Studio UI**: [http://localhost:54323](http://localhost:54323)
- **API**: [http://localhost:54321](http://localhost:54321)

#### **🔧 Option 3: Manual Database Setup**

If you have your own PostgreSQL instance:

```bash
# Create database
createdb autoapply

# Run migrations
psql autoapply < supabase/migrations/001_job_crawler_schema.sql
psql autoapply < supabase/migrations/002_user_profiles.sql

# Update .env with your connection details
```

### **Available Scripts**

```bash
# Development
npm run dev              # Start web UI (http://localhost:5173)
npm run dev:crawler      # Start job crawler in development mode

# Database
npm run db:setup         # Setup Supabase database schema
npm run db:local         # Start local Supabase with Docker
npm run db:reset         # Reset database (caution!)
npm run db:seed          # Add sample companies

# Production
npm run build            # Build for production
npm run preview          # Preview production build
npm run start            # Start production server

# Job Crawler
npm run crawler:install  # Install crawler dependencies
npm run crawler:run      # Run job crawler once
npm run crawler:dev      # Run crawler in watch mode

# Utilities
npm run lint             # Lint code
npm run typecheck        # Check TypeScript
npm run test             # Run tests (when added)
```

---

## 🎯 **How to Use**

### **1. Initial Setup**
1. **Open the app**: [http://localhost:5173](http://localhost:5173)
2. **Sign up/Login**: Create your account
3. **Complete Profile**: Add your skills, experience, and preferences
4. **Set Job Preferences**: Industries, salary range, remote work preferences

### **2. Job Discovery**

#### **Automatic Company Database**
The system automatically crawls these job boards every 6 hours:
- SimplifyJobs Summer 2025 Internships
- SimplifyJobs New Grad Positions  
- Remote in Tech jobs
- Various tech job boards

#### **Manual Company Search**
- Go to "Company Directory"
- Click "Search Jobs" on any company
- AI will discover their career page and extract jobs

### **3. Application Modes**

#### **🤖 Fully Automated Mode**
1. Go to "AI Job Agent"
2. Click "Start Automated Agent"
3. The system will:
   - Match you with suitable companies
   - Discover available jobs
   - Generate tailored CVs
   - Submit applications automatically

#### **🎯 Semi-Automated Mode**
1. Browse "Company Directory"
2. Click "Search Jobs" on companies you like
3. Review and select specific jobs
4. AI generates tailored CV and applies

### **4. Monitoring & Cost Control**
- **Application History**: Track all applications
- **Cost Dashboard**: Monitor OpenAI API usage
- **Review Queue**: Approve applications before submission
- **Settings**: Adjust automation preferences

---

## 🔧 **Advanced Configuration**

### **OpenAI Models & Costs**

The system uses different models for different tasks:
- **Job Discovery**: GPT-4o-mini (~$0.15/1M tokens)
- **CV Generation**: GPT-4o (~$2.50/1M tokens input, $10/1M output)
- **Company Analysis**: GPT-4o-mini

**Estimated Costs:**
- Job discovery per company: ~$0.01-0.05
- CV generation per job: ~$0.10-0.30
- Full automation (10 companies): ~$2-5

### **Rate Limiting & Performance**

Configure in `.env`:
```env
# Crawler settings
MAX_CONCURRENT_REQUESTS=5
REQUEST_DELAY_MS=1000

# OpenAI settings
OPENAI_MAX_RETRIES=3
OPENAI_TIMEOUT_MS=30000
```

### **Job Crawler Configuration**

The job crawler can be customized:

```bash
# Run specific source
npm run crawler:run -- --source="SimplifyJobs Summer 2025 Internships"

# Enable debug logging
LOG_LEVEL=debug npm run crawler:run

# Custom frequency (in cron format)
CRAWLER_SCHEDULE="0 */4 * * *" npm run crawler:run
```

### **Database Customization**

Add your own job sources:
```sql
INSERT INTO job_sources (name, url, type, frequency_hours) VALUES
('Your Custom Source', 'https://github.com/username/repo', 'markdown-table', 6);
```

---

## 🏗️ **Architecture**

### **Frontend (React + TypeScript)**
- **Vite**: Fast development and building
- **Tailwind CSS**: Utility-first styling
- **Shadcn/ui**: Beautiful, accessible components
- **React Query**: Efficient data fetching
- **Zustand**: Lightweight state management

### **Backend Services**
- **Supabase**: Database, authentication, real-time
- **OpenAI API**: AI-powered job discovery and CV generation
- **Job Crawler**: Automated job board scraping

### **File Structure**
```
autoapply/
├── src/
│   ├── components/          # React components
│   │   ├── dashboard/       # Main dashboard views
│   │   └── ui/             # Reusable UI components
│   ├── services/           # Business logic
│   │   ├── aiAgentOrchestrator.ts
│   │   ├── careerPageDiscovery.ts
│   │   └── userService.ts
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utility functions
├── job-crawler/            # Standalone job crawler
│   ├── src/
│   │   ├── crawler/        # Crawler implementation
│   │   └── parsers/        # Job board parsers
│   └── .github/workflows/  # GitHub Actions
├── supabase/
│   ├── migrations/         # Database schema
│   └── config.toml        # Local Supabase config
└── docs/                   # Documentation
```

---

## 🐳 **Docker Deployment**

For easy deployment anywhere:

```bash
# Build and run with Docker
docker build -t autoapply .
docker run -p 3000:3000 --env-file .env autoapply

# Or use Docker Compose
docker-compose up -d
```

**Docker Compose includes:**
- Web application
- PostgreSQL database  
- Job crawler service
- Nginx reverse proxy

---

## 🤝 **Contributing**

We welcome contributions! Here's how to get started:

### **Development Setup**
```bash
git clone https://github.com/yourusername/autoapply.git
cd autoapply
npm install
npm run dev
```

### **Contribution Areas**
- 🔍 **New Job Board Parsers**: Add support for more job sites
- 🎨 **UI Improvements**: Enhance the user interface
- 🤖 **AI Features**: Improve job matching and CV generation
- 📱 **Mobile Support**: Better mobile experience
- 🔧 **Performance**: Optimize crawling and API usage
- 📚 **Documentation**: Improve guides and examples

### **Submitting Changes**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Code Style**
- TypeScript with strict mode
- ESLint + Prettier for formatting
- Conventional commits for messages
- Tests for new features

---

## 🔒 **Privacy & Security**

### **Data Handling**
- **Local First**: All data stored in your chosen database
- **API Keys**: Never logged or shared
- **Personal Info**: Stays within your environment
- **CV Content**: Generated on-demand, not permanently stored

### **Security Best Practices**
- Environment variables for sensitive data
- Input validation and sanitization
- Rate limiting to prevent abuse
- Secure database connections

### **OpenAI API Usage**
- Only sends job descriptions and your profile data
- No logging of API responses
- Configurable models and usage limits
- Cost tracking to prevent surprise bills

---

## 📋 **Troubleshooting**

### **Common Issues**

#### **"OpenAI API key not working"**
```bash
# Verify your key
curl -H "Authorization: Bearer $VITE_OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Check .env file format (no quotes needed)
VITE_OPENAI_API_KEY=sk-your-key-here
```

#### **"Database connection failed"**
```bash
# Check Supabase project status
curl https://your-project.supabase.co/rest/v1/

# Verify credentials in .env
npm run db:test
```

#### **"Job crawler not finding jobs"**
```bash
# Test specific source
npm run crawler:dev -- --source="SimplifyJobs Summer 2025 Internships"

# Check logs
LOG_LEVEL=debug npm run crawler:run
```

#### **"Web UI not loading"**
```bash
# Clear cache and restart
rm -rf node_modules/.vite
npm run dev

# Check port conflicts
lsof -i :5173
```

### **Debug Mode**

Enable detailed logging:
```env
LOG_LEVEL=debug
VITE_DEBUG_MODE=true
```

### **Getting Help**

1. **Check Issues**: [GitHub Issues](https://github.com/yourusername/autoapply/issues)
2. **Start Discussion**: [GitHub Discussions](https://github.com/yourusername/autoapply/discussions)
3. **Read Docs**: [Full Documentation](https://github.com/yourusername/autoapply/wiki)

---

## 📊 **Roadmap**

### **v1.1 - Enhanced AI** (Next Release)
- [ ] Better job matching algorithms
- [ ] Cover letter generation
- [ ] Interview question answering
- [ ] Salary negotiation suggestions

### **v1.2 - Integrations**
- [ ] LinkedIn job import
- [ ] Indeed/Glassdoor integration
- [ ] ATS system detection
- [ ] Email notifications

### **v1.3 - Analytics**
- [ ] Application success tracking
- [ ] Market analysis dashboard
- [ ] Skill gap recommendations
- [ ] Industry trend insights

### **v2.0 - Enterprise**
- [ ] Multi-user support
- [ ] Team collaboration features
- [ ] Advanced reporting
- [ ] Custom workflow automation

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### **What this means:**
- ✅ **Use commercially**: Build and sell products using this code
- ✅ **Modify freely**: Change anything you want
- ✅ **Distribute**: Share with others
- ✅ **Private use**: Use for personal projects
- ❓ **Attribution required**: Include the original license

---

## 🙏 **Acknowledgments**

- **[OpenAI](https://openai.com)**: For the incredible GPT models
- **[Supabase](https://supabase.com)**: For the amazing backend-as-a-service
- **[Shadcn/ui](https://ui.shadcn.com)**: For the beautiful component library
- **[SimplifyJobs](https://github.com/SimplifyJobs)**: For maintaining excellent job lists
- **Community contributors**: Everyone who makes this project better

---

## ⭐ **Star this Project**

If AutoApply helps you land your dream job, please give us a star on GitHub! It helps others discover the project and motivates us to keep improving.

**[⭐ Star on GitHub](https://github.com/yourusername/autoapply)**

---

## 📈 **Analytics & Metrics**

AutoApply includes built-in analytics to help you optimize your job search:

- **Application Success Rate**: Track which companies respond
- **Cost Per Application**: Monitor OpenAI API usage
- **Time to Response**: Measure application processing speed
- **Job Market Insights**: Understand hiring trends

All analytics are stored locally in your database - no external tracking.

---

**Happy job hunting! 🚀**

*AutoApply - Making job applications as easy as a single click.*