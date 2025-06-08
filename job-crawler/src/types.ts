/**
 * TypeScript interfaces for the job crawler system
 */

export interface Company {
  id?: string;
  name: string;
  website?: string;
  description?: string;
  logo_url?: string;
  size?: string;
  industry?: string[];
  headquarters?: string;
  founded_year?: number;
  size_category?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  created_at?: string;
  updated_at?: string;
}

export interface Job {
  id?: string;
  company_id?: string;
  title: string;
  description?: string;
  location?: string[];
  remote_type?: 'onsite' | 'remote' | 'hybrid';
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  experience_level?: string;
  job_type?: 'full-time' | 'part-time' | 'contract' | 'internship';
  application_url: string;
  source_url: string;
  source_repo: string;
  external_id?: string;
  posted_date?: string;
  deadline?: string;
  tags?: string[];
  requirements?: string[];
  benefits?: string[];
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface JobSource {
  id?: string;
  name: string;
  url: string;
  type: 'markdown-table' | 'markdown-list' | 'json' | 'html';
  frequency_hours: number;
  is_active: boolean;
  last_crawled_at?: string;
  next_crawl_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CrawlHistory {
  id?: string;
  source_id: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'completed' | 'failed';
  jobs_found: number;
  jobs_inserted: number;
  jobs_updated: number;
  companies_created: number;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface ParsedJob {
  company: string;
  title: string;
  location?: string;
  applicationUrl: string;
  description?: string;
  externalId?: string;
  postedDate?: string;
  tags?: string[];
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
}

export interface CrawlResult {
  jobs: ParsedJob[];
  errors: string[];
  metadata: {
    sourceUrl: string;
    sourceRepo: string;
    crawledAt: string;
    totalFound: number;
    successfullyParsed: number;
  };
}

export interface CrawlerConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  githubToken?: string;
  maxConcurrentRequests: number;
  requestDelayMs: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}