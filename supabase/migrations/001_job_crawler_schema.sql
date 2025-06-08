-- Job Crawler Database Schema
-- This migration creates tables for storing companies and jobs from crawled sources

-- Companies table with unique constraint on name
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  website TEXT,
  description TEXT,
  logo_url TEXT,
  size TEXT,
  industry TEXT[],
  headquarters TEXT,
  founded_year INTEGER,
  size_category TEXT CHECK (size_category IN ('startup', 'small', 'medium', 'large', 'enterprise')),
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

-- Job sources configuration
CREATE TABLE job_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('markdown-table', 'markdown-list', 'json', 'html')),
  frequency_hours INTEGER DEFAULT 6,
  is_active BOOLEAN DEFAULT true,
  last_crawled_at TIMESTAMPTZ,
  next_crawl_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crawl history for monitoring
CREATE TABLE crawl_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES job_sources(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('running', 'completed', 'failed')),
  jobs_found INTEGER DEFAULT 0,
  jobs_inserted INTEGER DEFAULT 0,
  jobs_updated INTEGER DEFAULT 0,
  companies_created INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_jobs_company_id ON jobs(company_id);
CREATE INDEX idx_jobs_is_active ON jobs(is_active);
CREATE INDEX idx_jobs_source_repo ON jobs(source_repo);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_crawl_history_source_id ON crawl_history(source_id);
CREATE INDEX idx_crawl_history_started_at ON crawl_history(started_at);

-- Insert initial job sources
INSERT INTO job_sources (name, url, type, frequency_hours) VALUES
('SimplifyJobs Summer 2025 Internships', 'https://github.com/SimplifyJobs/Summer2025-Internships', 'markdown-table', 6),
('SimplifyJobs New Grad Positions', 'https://github.com/SimplifyJobs/New-Grad-Positions', 'markdown-table', 6),
('Remote in Tech', 'https://github.com/remoteintech/remote-jobs', 'markdown-list', 12),
('Awesome Job Boards', 'https://github.com/emredurukn/awesome-job-boards', 'markdown-list', 24);

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_sources_updated_at BEFORE UPDATE ON job_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();