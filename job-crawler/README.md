# Job Crawler

Automated job crawler that fetches tech startup jobs from GitHub repositories and stores them in Supabase.

## Features

- **Multi-format parsing**: Handles Markdown tables, lists, JSON files, and HTML
- **Automated scheduling**: Runs every 6 hours via GitHub Actions
- **Deduplication**: Prevents duplicate jobs using source + external ID
- **Company normalization**: Creates companies once, references in jobs
- **Error resilience**: Continues crawling even if individual jobs fail
- **Rate limiting**: Respects API limits with configurable delays

## Setup

### 1. Database Setup

Run the migration to create the required tables:

```sql
-- Apply the migration in Supabase SQL editor
-- File: supabase/migrations/001_job_crawler_schema.sql
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Service role key (not anon key)
- `GITHUB_TOKEN`: GitHub personal access token (optional, for rate limits)

### 3. Install Dependencies

```bash
npm install
```

### 4. Build Project

```bash
npm run build
```

## Usage

### Local Development

```bash
# Crawl all sources
npm run dev

# Crawl specific source
npm run dev -- --source="SimplifyJobs Summer 2025 Internships"
```

### Production

```bash
# Build and run
npm run crawl

# Run specific source
npm start -- --source="SimplifyJobs New Grad Positions"
```

## Job Sources

Currently configured sources:

1. **SimplifyJobs Summer 2025 Internships** - Markdown table format
2. **SimplifyJobs New Grad Positions** - Markdown table format  
3. **Remote in Tech** - Markdown list format
4. **Awesome Job Boards** - Markdown list format

## Architecture

### Components

- **JobCrawler**: Main orchestrator class
- **Parsers**: Format-specific parsers (Markdown tables, lists)
- **Utils**: Helper functions for normalization and extraction
- **Types**: TypeScript interfaces

### Database Schema

- **companies**: Company information
- **jobs**: Job listings with references to companies
- **job_sources**: Configuration for crawl sources
- **crawl_history**: Monitoring and audit trail

### Processing Flow

1. Fetch active job sources from database
2. For each source:
   - Parse content based on format type
   - Extract company and job information
   - Normalize and deduplicate data
   - Store in database
3. Update crawl history and statistics

## Monitoring

### Crawl History

Monitor crawl performance:

```sql
-- Recent crawls
SELECT * FROM crawl_history 
ORDER BY started_at DESC 
LIMIT 10;

-- Success rates
SELECT 
  source_id,
  COUNT(*) as total_crawls,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  AVG(jobs_inserted + jobs_updated) as avg_jobs
FROM crawl_history 
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY source_id;
```

### Job Quality

```sql
-- Jobs by source
SELECT source_repo, COUNT(*) 
FROM jobs 
WHERE is_active = true
GROUP BY source_repo;

-- Recent jobs
SELECT c.name, j.title, j.created_at
FROM jobs j
JOIN companies c ON j.company_id = c.id
WHERE j.created_at > NOW() - INTERVAL '1 day'
ORDER BY j.created_at DESC;
```

## GitHub Actions Deployment

### Setup Secrets

In your GitHub repository, add these secrets:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Service role key
- `GITHUB_TOKEN`: Personal access token (optional)

### Workflow

The crawler runs automatically every 6 hours via GitHub Actions. You can also trigger it manually from the Actions tab.

## Professional Hosting Options

### Recommended: GitHub Actions (Current)
- **Pros**: Free, integrated with repo, reliable scheduling
- **Cons**: 6-hour minimum frequency, public repos only for free

### Alternative: Cloud Functions
```bash
# AWS Lambda
serverless deploy

# Google Cloud Functions
gcloud functions deploy job-crawler --runtime nodejs18

# Vercel (for scheduled functions)
vercel deploy
```

### Alternative: VPS/Server
```bash
# Using PM2 for process management
pm2 start dist/index.js --name job-crawler --cron "0 */6 * * *"

# Using systemd timer (Linux)
systemctl enable job-crawler.timer
```

### Alternative: Kubernetes CronJob
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: job-crawler
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: job-crawler
            image: your-registry/job-crawler:latest
```

## Performance Tuning

### Rate Limiting
- Default: 5 concurrent requests, 1s delay
- Adjust `MAX_CONCURRENT_REQUESTS` and `REQUEST_DELAY_MS`

### Database Optimization
- Indexes on frequently queried columns
- Connection pooling for high-volume crawls
- Batch inserts for better performance

### Memory Usage
- Company caching reduces database queries
- Parser streaming for large files
- Garbage collection tuning for Node.js

## Troubleshooting

### Common Issues

1. **Rate limits**: Increase delays or add GitHub token
2. **Parsing errors**: Check source format changes
3. **Database timeouts**: Optimize queries or increase timeout
4. **Memory issues**: Implement streaming for large sources

### Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Test specific parser
npm run dev -- --source="SimplifyJobs Summer 2025 Internships"
```

### Error Recovery

The crawler is designed to be resilient:
- Individual job failures don't stop the crawl
- Failed sources are logged but don't affect others
- Automatic retries with exponential backoff

## Contributing

1. Add new parsers in `src/crawler/parsers.ts`
2. Update job sources in the database
3. Test with `npm run dev -- --source="New Source"`
4. Add monitoring for new sources

## License

MIT License - see LICENSE file for details.