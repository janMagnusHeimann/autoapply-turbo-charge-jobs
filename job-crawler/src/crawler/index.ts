/**
 * Main job crawler class that orchestrates the crawling process
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { JobSource, CrawlHistory, Company, Job, ParsedJob, CrawlerConfig } from '../types';
import { createParser } from './parsers';
import { normalizeCompanyName, generateExternalId, log, delay } from './utils';

export class JobCrawler {
  private supabase: SupabaseClient;
  private config: CrawlerConfig;
  private companyCache: Map<string, Company> = new Map();

  constructor(config: CrawlerConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
  }

  /**
   * Main crawl method - processes all active job sources
   */
  async crawlAll(): Promise<void> {
    log('info', 'Starting job crawl for all sources');

    try {
      const sources = await this.getActiveSources();
      log('info', `Found ${sources.length} active job sources`);

      const results = [];
      for (const source of sources) {
        try {
          const result = await this.crawlSource(source);
          results.push(result);
          
          // Add delay between sources to be respectful
          if (sources.indexOf(source) < sources.length - 1) {
            await delay(this.config.requestDelayMs);
          }
        } catch (error) {
          log('error', `Failed to crawl source ${source.name}`, { error: (error as Error).message });
        }
      }

      const totalJobs = results.reduce((sum, r) => sum + r.jobsInserted + r.jobsUpdated, 0);
      const totalCompanies = results.reduce((sum, r) => sum + r.companiesCreated, 0);
      
      log('info', 'Crawl completed', { 
        totalJobs, 
        totalCompanies, 
        sourcesProcessed: results.length 
      });

    } catch (error) {
      log('error', 'Crawl failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Crawls a specific job source
   */
  async crawlSource(source: JobSource): Promise<CrawlHistory> {
    log('info', `Starting crawl for source: ${source.name}`);

    const crawlHistory: Partial<CrawlHistory> = {
      source_id: source.id!,
      started_at: new Date().toISOString(),
      status: 'running',
      jobs_found: 0,
      jobs_inserted: 0,
      jobs_updated: 0,
      companies_created: 0
    };

    try {
      // Create crawl history record
      const { data: historyData, error: historyError } = await this.supabase
        .from('crawl_history')
        .insert(crawlHistory)
        .select()
        .single();

      if (historyError) throw historyError;
      crawlHistory.id = historyData.id;

      // Parse jobs from source
      const parser = createParser(source.type, this.extractRepoName(source.url), source.url);
      const crawlResult = await parser.parse();
      
      crawlHistory.jobs_found = crawlResult.jobs.length;
      log('info', `Found ${crawlResult.jobs.length} jobs from ${source.name}`);

      // Process each job
      for (const parsedJob of crawlResult.jobs) {
        try {
          await this.processJob(parsedJob, source.url, crawlHistory);
          await delay(100); // Small delay between job processing
        } catch (error) {
          log('warn', `Failed to process job: ${parsedJob.title} at ${parsedJob.company}`, { 
            error: (error as Error).message 
          });
        }
      }

      // Update source last crawled time
      await this.supabase
        .from('job_sources')
        .update({
          last_crawled_at: new Date().toISOString(),
          next_crawl_at: new Date(Date.now() + source.frequency_hours * 60 * 60 * 1000).toISOString()
        })
        .eq('id', source.id);

      // Complete crawl history
      crawlHistory.status = 'completed';
      crawlHistory.completed_at = new Date().toISOString();
      crawlHistory.metadata = {
        errors: crawlResult.errors,
        sourceMetadata: crawlResult.metadata
      };

      await this.supabase
        .from('crawl_history')
        .update(crawlHistory)
        .eq('id', crawlHistory.id);

      log('info', `Completed crawl for ${source.name}`, {
        jobsInserted: crawlHistory.jobs_inserted,
        jobsUpdated: crawlHistory.jobs_updated,
        companiesCreated: crawlHistory.companies_created
      });

      return crawlHistory as CrawlHistory;

    } catch (error) {
      // Mark crawl as failed
      crawlHistory.status = 'failed';
      crawlHistory.error_message = (error as Error).message;
      crawlHistory.completed_at = new Date().toISOString();

      if (crawlHistory.id) {
        await this.supabase
          .from('crawl_history')
          .update(crawlHistory)
          .eq('id', crawlHistory.id);
      }

      throw error;
    }
  }

  /**
   * Processes a single parsed job
   */
  private async processJob(parsedJob: ParsedJob, sourceUrl: string, crawlHistory: Partial<CrawlHistory>): Promise<void> {
    // Get or create company
    const company = await this.getOrCreateCompany(parsedJob.company);

    // Create job object
    const job: Partial<Job> = {
      company_id: company.id,
      title: parsedJob.title,
      description: parsedJob.description,
      location: parsedJob.location ? [parsedJob.location] : [],
      application_url: parsedJob.applicationUrl,
      source_url: sourceUrl,
      source_repo: this.extractRepoName(sourceUrl),
      external_id: parsedJob.externalId || generateExternalId(parsedJob, this.extractRepoName(sourceUrl)),
      posted_date: parsedJob.postedDate,
      tags: parsedJob.tags,
      is_active: true
    };

    if (parsedJob.salary) {
      job.salary_min = parsedJob.salary.min;
      job.salary_max = parsedJob.salary.max;
      job.salary_currency = parsedJob.salary.currency;
    }

    // Check if job already exists
    const { data: existingJob, error: checkError } = await this.supabase
      .from('jobs')
      .select('id')
      .eq('source_repo', job.source_repo)
      .eq('external_id', job.external_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingJob) {
      // Update existing job
      const { error: updateError } = await this.supabase
        .from('jobs')
        .update(job)
        .eq('id', existingJob.id);

      if (updateError) throw updateError;
      crawlHistory.jobs_updated = (crawlHistory.jobs_updated || 0) + 1;
    } else {
      // Insert new job
      const { error: insertError } = await this.supabase
        .from('jobs')
        .insert(job);

      if (insertError) throw insertError;
      crawlHistory.jobs_inserted = (crawlHistory.jobs_inserted || 0) + 1;
    }
  }

  /**
   * Gets or creates a company record
   */
  private async getOrCreateCompany(companyName: string): Promise<Company> {
    const normalizedName = normalizeCompanyName(companyName);
    
    // Check cache first
    if (this.companyCache.has(normalizedName)) {
      return this.companyCache.get(normalizedName)!;
    }

    // Check database
    const { data: existingCompany, error: checkError } = await this.supabase
      .from('companies')
      .select('*')
      .eq('name', normalizedName)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingCompany) {
      this.companyCache.set(normalizedName, existingCompany);
      return existingCompany;
    }

    // Create new company
    const newCompany: Partial<Company> = {
      name: normalizedName,
      size_category: 'startup' // Default assumption for crawled jobs
    };

    const { data: createdCompany, error: createError } = await this.supabase
      .from('companies')
      .insert(newCompany)
      .select()
      .single();

    if (createError) throw createError;

    this.companyCache.set(normalizedName, createdCompany);
    
    // Update crawl history
    const crawlHistory = await this.getCurrentCrawlHistory();
    if (crawlHistory) {
      await this.supabase
        .from('crawl_history')
        .update({ companies_created: (crawlHistory.companies_created || 0) + 1 })
        .eq('id', crawlHistory.id);
    }

    return createdCompany;
  }

  /**
   * Gets active job sources that need crawling
   */
  private async getActiveSources(): Promise<JobSource[]> {
    const { data, error } = await this.supabase
      .from('job_sources')
      .select('*')
      .eq('is_active', true)
      .order('last_crawled_at', { ascending: true, nullsFirst: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Extracts repository name from GitHub URL
   */
  private extractRepoName(url: string): string {
    const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
    return match ? match[1] : url;
  }

  /**
   * Gets the current crawl history (helper method)
   */
  private async getCurrentCrawlHistory(): Promise<CrawlHistory | null> {
    const { data, error } = await this.supabase
      .from('crawl_history')
      .select('*')
      .eq('status', 'running')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      log('warn', 'Could not find current crawl history', { error: error.message });
    }

    return data || null;
  }

  /**
   * Crawls a single source by name (useful for testing)
   */
  async crawlSourceByName(sourceName: string): Promise<CrawlHistory> {
    const { data: source, error } = await this.supabase
      .from('job_sources')
      .select('*')
      .eq('name', sourceName)
      .single();

    if (error) throw new Error(`Source not found: ${sourceName}`);
    
    return this.crawlSource(source);
  }

  /**
   * Gets crawl statistics
   */
  async getStats(): Promise<{
    totalJobs: number;
    totalCompanies: number;
    recentCrawls: number;
    lastCrawlTime?: string;
  }> {
    const [jobsResult, companiesResult, crawlsResult] = await Promise.all([
      this.supabase.from('jobs').select('id', { count: 'exact', head: true }),
      this.supabase.from('companies').select('id', { count: 'exact', head: true }),
      this.supabase
        .from('crawl_history')
        .select('started_at')
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('started_at', { ascending: false })
    ]);

    return {
      totalJobs: jobsResult.count || 0,
      totalCompanies: companiesResult.count || 0,
      recentCrawls: crawlsResult.data?.length || 0,
      lastCrawlTime: crawlsResult.data?.[0]?.started_at
    };
  }
}