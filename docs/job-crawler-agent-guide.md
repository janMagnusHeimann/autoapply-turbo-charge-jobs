# Job Crawler Implementation Agent Guidelines

## Project Overview
You are implementing an automated job crawler system that fetches tech startup jobs from GitHub repositories and stores them in a Supabase database. This system runs autonomously without user intervention.

## Architecture Requirements

### System Design
- Use GitHub Actions as the primary scheduler (runs every 6 hours)
- Implement crawler in TypeScript/Node.js
- Store data in Supabase with proper schema
- No user-facing components needed - this is a background service

### Key Components to Build
1. Supabase database schema with 4 tables (companies, jobs, job_sources, crawl_history)
2. TypeScript crawler service
3. GitHub Actions workflow for scheduling
4. Environment configuration

## Implementation Steps

### 1. Database Setup
Create these tables in Supabase:

```sql
-- Companies table with unique constraint on name
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  website TEXT,
  description TEXT,
  logo_url TEXT,
  size TEXT,
  industry TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table with composite unique constraint
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT[],
  remote_type TEXT CHECK (remote_type IN ('onsite', 'remote', 'hybrid')),
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  experience_level TEXT,
  job_type TEXT CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship')),
  application_url TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_repo TEXT NOT NULL,
  external_id TEXT,
  posted_date DATE,
  deadline DATE,
  tags TEXT[],
  requirements TEXT[],
  benefits TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_repo, external_id)
);

-- Add remaining tables (job_sources, crawl_history) and indexes
```

### 2. Project Structure
```
job-crawler/
├── src/
│   ├── crawler/
│   │   ├── index.ts        # Main crawler class
│   │   ├── parsers.ts      # Job parsing logic
│   │   └── utils.ts        # Helper functions
│   └── types.ts            # TypeScript interfaces
├── .github/
│   └── workflows/
│       └── crawl-jobs.yml  # GitHub Actions workflow
├── package.json
├── tsconfig.json
└── .env.example
```

### 3. Core Implementation Requirements

#### Crawler Features
- **Multi-format parsing**: Handle Markdown tables, JSON files, and HTML lists
- **Deduplication**: Use source_repo + external_id to prevent duplicates
- **Company normalization**: Create companies once, reference in jobs
- **Smart extraction**: Parse salaries, locations, tags from unstructured text
- **Error resilience**: Continue crawling even if individual jobs fail

#### Data Sources to Crawl
```typescript
const JOB_SOURCES = [
  {
    url: 'https://github.com/SimplifyJobs/Summer2025-Internships',
    type: 'markdown-table',
    frequency: 6 // hours
  },
  {
    url: 'https://github.com/SimplifyJobs/New-Grad-Positions',
    type: 'markdown-table',
    frequency: 6
  },
  {
    url: 'https://github.com/remoteintech/remote-jobs',
    type: 'markdown-list',
    frequency: 12
  },
  {
    url: 'https://github.com/emredurukn/awesome-job-boards',
    type: 'markdown-mixed',
    frequency: 24
  }
];
```

### 4. Parsing Patterns

#### Markdown Table Parser
```typescript
// Look for tables with headers like: Company | Role | Location | Apply
// Extract each row as a job entry
// Handle various link formats in cells
```

#### JSON Parser
```typescript
// Support both array of jobs and nested structures
// Map common field names: company/company_name, title/position/role
// Handle missing fields gracefully
```

#### List Parser
```typescript
// Detect job patterns in list items
// Common formats: "Company - Title - Location"
// Extract links from list items
```

### 5. GitHub Actions Configuration
```yaml
name: Crawl Tech Startup Jobs
on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Critical Implementation Details

### Authentication
- Use Supabase service role key (not anon key) for full database access
- Use GitHub token to avoid API rate limits
- Store all credentials as GitHub secrets

### Error Handling
- Log errors but don't stop the entire crawl
- Track failed jobs in crawl_history table
- Implement exponential backoff for retries

### Performance Optimization
- Use connection pooling for database
- Batch insert jobs where possible
- Limit concurrent API requests (suggest: 5)
- Cache company lookups during crawl session

### Data Quality
- Validate URLs before storing
- Normalize company names (trim, consistent casing)
- Parse locations into array format
- Extract technology tags from job titles

## Testing Strategy

1. **Local Testing**:
   ```bash
   npm run dev -- --source "SimplifyJobs/Summer2025-Internships"
   ```

2. **Verify Data**:
   ```sql
   -- Check recent crawls
   SELECT * FROM crawl_history ORDER BY started_at DESC LIMIT 10;
   
   -- Verify job quality
   SELECT COUNT(*), source_repo FROM jobs GROUP BY source_repo;
   ```

3. **Monitor Health**:
   - Set up alerts if crawls fail repeatedly
   - Check for stale data (jobs not updated in 7+ days)

## Code Quality Requirements

- Use TypeScript with strict mode
- Add JSDoc comments for main functions
- Handle all promise rejections
- Log important operations with timestamps
- Follow consistent error message format

## Environment Variables
```env
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_KEY=eyJ...
GITHUB_TOKEN=ghp_...
NODE_ENV=production
LOG_LEVEL=info
```

## Deployment Checklist

- [ ] Create Supabase project and run schema SQL
- [ ] Initialize Git repository
- [ ] Set up TypeScript project with dependencies
- [ ] Implement crawler with all parsers
- [ ] Add comprehensive error handling
- [ ] Create GitHub Actions workflow
- [ ] Add all secrets to GitHub repository
- [ ] Test locally with each job source
- [ ] Deploy and verify first automated run
- [ ] Set up monitoring/alerts

## Common Pitfalls to Avoid

1. **Don't use anon key** - Use service role key for full access
2. **Don't parse HTML with regex** - Use cheerio for HTML parsing
3. **Don't ignore rate limits** - Add delays between requests
4. **Don't store duplicate companies** - Always check existing first
5. **Don't fail entire crawl** - Handle individual job failures gracefully

## Success Metrics

- Jobs are crawled every 6 hours without manual intervention
- Duplicate jobs are properly deduplicated
- Company names are normalized (no duplicates like "Google" and "Google LLC")
- All major job sources are successfully parsed
- Error rate is below 5% of total jobs processed

## Additional Features (Optional)

- Add job freshness detection (mark old jobs as inactive)
- Implement change detection (only update if content changed)
- Add webhook notifications for new jobs
- Create summary statistics endpoint
- Add data export functionality

Remember: This is a background service that should run reliably without human intervention. Focus on robustness over features.