import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import type { Company } from './realCareerPageDiscovery';

export interface JobListing {
  id: string;
  title: string;
  company_id: string;
  company_name: string;
  description: string;
  requirements: string[];
  nice_to_have: string[];
  responsibilities: string[];
  location: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance';
  remote_type: 'on-site' | 'remote' | 'hybrid';
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  experience_level: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  application_url: string;
  posted_date?: string;
  application_deadline?: string;
  benefits?: string[];
  technologies?: string[];
  department?: string;
  team_size?: string;
  company_stage?: string;
}

export interface JobScrapingResult {
  success: boolean;
  jobs: JobListing[];
  total_found: number;
  career_page_url: string;
  scraping_method: 'direct' | 'api' | 'fallback';
  error?: string;
  metadata: {
    scraped_at: string;
    processing_time_ms: number;
    confidence_score: number;
  };
}

export class JobScrapingAgent {
  private llm: ChatOpenAI;
  private cache: Map<string, { result: JobScrapingResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please set VITE_OPENAI_API_KEY environment variable.');
    }

    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-4o',
      temperature: 0.1,
      maxTokens: 4000,
    });
  }

  private getCacheKey(careerPageUrl: string, companyId: string): string {
    return `${companyId}-${careerPageUrl}`;
  }

  private getCachedResult(careerPageUrl: string, companyId: string): JobScrapingResult | null {
    const cacheKey = this.getCacheKey(careerPageUrl, companyId);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
      return cached.result;
    }
    
    if (cached) {
      this.cache.delete(cacheKey);
    }
    
    return null;
  }

  private setCachedResult(careerPageUrl: string, companyId: string, result: JobScrapingResult): void {
    const cacheKey = this.getCacheKey(careerPageUrl, companyId);
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Fetch career page content using the proxy server
   */
  private async fetchCareerPageContent(url: string, company: Company): Promise<string> {
    console.log(`🌐 Fetching content via proxy from ${url} for ${company.name}...`);
    
    try {
      // Use the FastAPI backend for fetching content
      const response = await fetch('http://localhost:8000/api/fetch-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url
        })
      });

      if (!response.ok) {
        throw new Error(`Backend server error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`Content fetch failed: ${result.error}`);
      }

      const html = result.html;
      console.log(`✅ Successfully fetched ${html.length} characters via proxy`);

      // Clean and extract text content from HTML
      const textContent = this.extractTextFromHTML(html);
      
      if (textContent.length < 500) {
        throw new Error('Career page content is too short or empty');
      }

      return textContent;

    } catch (error) {
      console.error(`❌ Proxy fetch failed for ${url}:`, error);
      throw error;
    }
  }

  private extractTextFromHTML(html: string): string {
    // Remove scripts, styles, and other non-content elements
    const cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

    // Convert HTML to text while preserving structure
    const textContent = cleanHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(div|p|h[1-6]|section|article|ul|ol|li)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    return textContent;
  }

  private generateFallbackContent(company: Company, careerUrl: string): string {
    console.log(`⚠️ Generating fallback content for ${company.name} since web scraping failed`);
    
    // This is a last resort - try to make it somewhat realistic based on company data
    const industryJobs = this.getIndustrySpecificJobs(company.industry || 'Technology');
    const timestamp = new Date().toISOString();
    
    return `
FALLBACK CONTENT - WEB SCRAPING FAILED
Career Opportunities at ${company.name}
Scraped from: ${careerUrl}
Generated: ${timestamp}

${industryJobs}

Note: This content was generated as a fallback because the career page could not be accessed.
The system attempted to scrape: ${careerUrl}
`;
  }

  private getIndustrySpecificJobs(industry: string): string {
    const jobTemplates: { [key: string]: string[] } = {
      'Technology': [
        'Software Engineer - Full Stack\nLocation: Remote/Hybrid\nRequirements: JavaScript, TypeScript, React, Node.js\nExperience: 2-5 years',
        'DevOps Engineer\nLocation: On-site/Remote\nRequirements: AWS, Docker, Kubernetes, CI/CD\nExperience: 3-6 years',
        'Product Manager\nLocation: Hybrid\nRequirements: Product strategy, user research, analytics\nExperience: 4-7 years'
      ],
      'Fintech': [
        'Backend Engineer - Python\nLocation: Berlin/Remote\nRequirements: Python, Django, PostgreSQL, financial systems\nExperience: 3-6 years',
        'Risk Analyst\nLocation: On-site\nRequirements: Risk modeling, compliance, financial analysis\nExperience: 2-5 years',
        'Security Engineer\nLocation: Hybrid\nRequirements: Cybersecurity, penetration testing, compliance\nExperience: 4-8 years'
      ],
      'Healthcare': [
        'Health Data Analyst\nLocation: Remote\nRequirements: Healthcare analytics, HIPAA compliance, SQL\nExperience: 2-4 years',
        'Medical Software Developer\nLocation: On-site\nRequirements: Healthcare systems, HL7, medical devices\nExperience: 3-7 years'
      ]
    };

    const jobs = jobTemplates[industry] || jobTemplates['Technology'];
    return jobs.join('\n\n');
  }

  /**
   * Create a LangChain pipeline to parse job listings from career page content
   */
  private createJobParsingChain() {
    const prompt = PromptTemplate.fromTemplate(`
You are an expert job listing parser. Your task is to extract structured job information from career page content.

Parse the following career page content and extract all job listings. For each job, extract:

1. Job title
2. Detailed job description
3. Required qualifications/skills (requirements)
4. Nice-to-have qualifications (nice_to_have)
5. Job responsibilities
6. Location (city, country, or "Remote")
7. Employment type (full-time, part-time, contract, internship, freelance)
8. Remote work type (on-site, remote, hybrid)
9. Experience level (entry, mid, senior, lead, executive)
10. Application URL or process
11. Technologies/skills mentioned
12. Department/team
13. Salary range if mentioned
14. Benefits if mentioned
15. Posted date if available
16. Application deadline if available

Company Context:
- Company Name: {company_name}
- Industry: {company_industry}
- Website: {company_website}

Career Page Content:
{content}

Return a JSON object with the following structure:
{{
  "jobs": [
    {{
      "title": "Job Title",
      "description": "Full job description",
      "requirements": ["requirement 1", "requirement 2"],
      "nice_to_have": ["nice to have 1", "nice to have 2"],
      "responsibilities": ["responsibility 1", "responsibility 2"],
      "location": "City, Country or Remote",
      "employment_type": "full-time",
      "remote_type": "hybrid",
      "experience_level": "mid",
      "application_url": "https://...",
      "technologies": ["tech1", "tech2"],
      "department": "Engineering",
      "salary_min": 80000,
      "salary_max": 120000,
      "currency": "USD",
      "benefits": ["benefit1", "benefit2"],
      "posted_date": "2025-01-08",
      "application_deadline": "2025-02-08",
      "team_size": "5-10 people",
      "company_stage": "Series B"
    }}
  ],
  "metadata": {{
    "total_jobs_found": 5,
    "parsing_confidence": 0.9,
    "page_type": "career_page",
    "has_application_links": true
  }}
}}

Important:
- Only extract real job listings, not company descriptions or general information
- If a field is not available, omit it or use null
- Be precise with employment_type and remote_type classifications
- Extract all technical skills and technologies mentioned
- Include salary information only if explicitly stated
- Make sure application_url is a valid URL or describe the application process
- Estimate experience level based on requirements and responsibilities
`);

    const parser = new JsonOutputParser();

    return RunnableSequence.from([
      prompt,
      this.llm,
      parser
    ]);
  }

  /**
   * Scrape jobs from a career page URL using proxy server
   */
  async scrapeJobs(careerPageUrl: string, company: Company): Promise<JobScrapingResult> {
    const startTime = Date.now();
    
    // Check cache first
    const cached = this.getCachedResult(careerPageUrl, company.id);
    if (cached) {
      console.log(`📋 Using cached job data for ${company.name}`);
      return cached;
    }

    try {
      console.log(`🔍 Scraping jobs from ${company.name} career page: ${careerPageUrl}`);

      // Try the new proxy-based job scraping first
      try {
        const proxyResult = await this.scrapeJobsViaProxy(careerPageUrl, company);
        if (proxyResult.success && proxyResult.jobs.length > 0) {
          console.log(`✅ Successfully scraped ${proxyResult.jobs.length} jobs via proxy`);
          this.setCachedResult(careerPageUrl, company.id, proxyResult);
          return proxyResult;
        }
      } catch (proxyError) {
        console.warn(`⚠️ Proxy scraping failed, falling back to AI parsing:`, proxyError);
      }

      // Fallback to AI-based parsing
      const content = await this.fetchCareerPageContent(careerPageUrl, company);
      
      if (!content || content.length < 100) {
        throw new Error('Career page content is too short or empty');
      }

      // Step 2: Parse jobs using LangChain
      const parsingChain = this.createJobParsingChain();
      
      const parsed = await parsingChain.invoke({
        company_name: company.name,
        company_industry: company.industry || 'Unknown',
        company_website: company.website_url || 'Unknown',
        content: content.slice(0, 15000) // Limit content to avoid token limits
      });

      // Step 3: Process and validate results
      const jobs: JobListing[] = [];
      if (parsed?.jobs && Array.isArray(parsed.jobs)) {
        for (let i = 0; i < parsed.jobs.length; i++) {
          const job = parsed.jobs[i];
          if (job.title && job.description) {
            jobs.push({
              id: `${company.id}-job-${i}-${Date.now()}`,
              company_id: company.id,
              company_name: company.name,
              title: job.title,
              description: job.description,
              requirements: Array.isArray(job.requirements) ? job.requirements : [],
              nice_to_have: Array.isArray(job.nice_to_have) ? job.nice_to_have : [],
              responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
              location: job.location || 'Not specified',
              employment_type: job.employment_type || 'full-time',
              remote_type: job.remote_type || 'on-site',
              experience_level: job.experience_level || 'mid',
              application_url: this.enhanceApplicationUrl(job.application_url, job.title, careerPageUrl, company.name),
              salary_min: job.salary_min,
              salary_max: job.salary_max,
              currency: job.currency,
              posted_date: job.posted_date,
              application_deadline: job.application_deadline,
              benefits: Array.isArray(job.benefits) ? job.benefits : [],
              technologies: Array.isArray(job.technologies) ? job.technologies : [],
              department: job.department,
              team_size: job.team_size,
              company_stage: job.company_stage
            });
          }
        }
      }

      const processingTime = Date.now() - startTime;
      
      const result: JobScrapingResult = {
        success: jobs.length > 0,
        jobs,
        total_found: jobs.length,
        career_page_url: careerPageUrl,
        scraping_method: 'direct',
        metadata: {
          scraped_at: new Date().toISOString(),
          processing_time_ms: processingTime,
          confidence_score: parsed?.metadata?.parsing_confidence || 0.8
        }
      };

      // Cache the result
      this.setCachedResult(careerPageUrl, company.id, result);
      
      console.log(`✅ Successfully scraped ${jobs.length} jobs from ${company.name} in ${processingTime}ms`);
      return result;

    } catch (error) {
      console.error(`❌ Error scraping jobs for ${company.name}:`, error);
      
      const errorResult: JobScrapingResult = {
        success: false,
        jobs: [],
        total_found: 0,
        career_page_url: careerPageUrl,
        scraping_method: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown scraping error',
        metadata: {
          scraped_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startTime,
          confidence_score: 0.0
        }
      };

      return errorResult;
    }
  }

  /**
   * Scrape jobs using the proxy server's dedicated job scraping endpoint
   */
  private async scrapeJobsViaProxy(careerPageUrl: string, company: Company): Promise<JobScrapingResult> {
    try {
      // First try Browser Use automation for best results
      console.log(`🚀 Starting with Browser Use automation for ${company.name}`);
      const browserUseResult = await this.scrapeJobsViaBrowserUse(careerPageUrl, company);
      if (browserUseResult.success && browserUseResult.jobs.length > 0) {
        console.log(`✅ Browser Use found ${browserUseResult.jobs.length} jobs, using that result`);
        return browserUseResult;
      }
      
      // Fallback to AI Vision scraping
      console.log(`⚠️ Browser Use found no jobs, falling back to AI Vision`);
      const aiVisionResult = await this.scrapeJobsViaAIVision(careerPageUrl, company);
      if (aiVisionResult.success && aiVisionResult.jobs.length > 0) {
        console.log(`✅ AI Vision found ${aiVisionResult.jobs.length} jobs, using that result`);
        return aiVisionResult;
      }
      
      // Final fallback to traditional FastAPI scraping
      console.log(`⚠️ AI Vision found no jobs, falling back to traditional scraping`);
      const response = await fetch('http://localhost:8000/api/scrape-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          careerPageUrl: careerPageUrl,
          companyName: company.name
        })
      });

      if (!response.ok) {
        throw new Error(`Proxy server error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`Proxy job scraping failed: ${result.error}`);
      }

      return result as JobScrapingResult;

    } catch (error) {
      console.error(`❌ Proxy job scraping failed:`, error);
      throw error;
    }
  }

  /**
   * Scrape jobs using Browser Use automation for intelligent website navigation
   */
  private async scrapeJobsViaBrowserUse(careerPageUrl: string, company: Company): Promise<JobScrapingResult> {
    try {
      console.log(`🤖 Attempting Browser Use scraping for ${company.name}...`);
      
      const response = await fetch('http://localhost:8000/api/browser-use-job-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: company.name,
          careerPageUrl: careerPageUrl,
          keywords: ["Software Engineer", "Developer", "Full Stack", "Frontend", "Backend", "React", "TypeScript"],
          location: "Remote",
          experience_level: "Mid-level",
          remote_only: true,
          max_results: 15
        })
      });

      if (!response.ok) {
        throw new Error(`Browser Use proxy error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`Browser Use scraping failed: ${result.error || 'Unknown error'}`);
      }

      // Parse the result to extract top 5 matching jobs
      let jobs: Job[] = [];
      let totalFound = 0;

      try {
        console.log('🔍 Browser Use result structure:', result);
        
        // Handle direct result with jobs array
        let jobsData = null;
        if (result.result && result.result.jobs) {
          jobsData = result.result.jobs;
        } else if (Array.isArray(result.jobs)) {
          jobsData = result.jobs;
        } else if (typeof result.result === 'string') {
          // Try parsing if it's a JSON string
          try {
            const parsed = JSON.parse(result.result);
            if (parsed.jobs) jobsData = parsed.jobs;
          } catch (e) {
            console.warn('Failed to parse result string as JSON');
          }
        }

        if (jobsData && Array.isArray(jobsData)) {
          console.log(`✅ Found ${jobsData.length} jobs from Browser Use`);
          
          jobs = jobsData.slice(0, 5).map((job: any, index: number) => ({
            title: job.title || `Position ${index + 1}`,
            company: company.name,
            location: job.location || job.remote_status || 'Location not specified',
            employment_type: job.employment_type || 'Full-time',
            remote_type: job.remote_status || (job.location && job.location.toLowerCase().includes('remote') ? 'Remote' : 'On-site'),
            application_url: job.application_url || careerPageUrl,
            description: job.description_summary || job.description || 'No description available',
            requirements: Array.isArray(job.key_requirements) ? job.key_requirements : [],
            benefits: [],
            salary_range: job.salary_range || null,
            // Add relevance score for sorting
            relevance_score: job.relevance_score || 5.0
          }));
          
          // Sort by relevance score (highest first)
          jobs.sort((a: any, b: any) => (b.relevance_score || 5) - (a.relevance_score || 5));
          
          totalFound = jobs.length;
          console.log(`🎯 Processed ${totalFound} jobs with application URLs`);
        } else {
          console.warn('⚠️ No jobs array found in Browser Use result');
        }
      } catch (parseError) {
        console.error('❌ Error parsing Browser Use result:', parseError);
        console.log('Raw result:', result);
      }

      return {
        success: true,
        total_found: totalFound,
        jobs: jobs,
        scraping_method: 'browser_use_automation',
        error_message: null
      };

    } catch (error) {
      console.error(`❌ Browser Use scraping failed:`, error);
      throw error;
    }
  }

  /**
   * Scrape jobs using AI Vision for intelligent website navigation (fallback)
   */
  private async scrapeJobsViaAIVision(careerPageUrl: string, company: Company): Promise<JobScrapingResult> {
    try {
      console.log(`🤖 Attempting AI Vision scraping for ${company.name}...`);
      
      const response = await fetch('http://localhost:8000/api/scrape-jobs-ai-vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          careerPageUrl: careerPageUrl,
          companyName: company.name,
          debugMode: false // Set to true for visual debugging
        })
      });

      if (!response.ok) {
        throw new Error(`AI Vision proxy error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`AI Vision scraping failed: ${result.error}`);
      }

      return result as JobScrapingResult;

    } catch (error) {
      console.error(`❌ AI Vision scraping failed:`, error);
      throw error;
    }
  }

  /**
   * Scrape jobs from multiple companies
   */
  async scrapeMultipleCompanies(companies: Array<{company: Company; careerPageUrl: string}>): Promise<JobScrapingResult[]> {
    const results: JobScrapingResult[] = [];
    
    for (const { company, careerPageUrl } of companies) {
      try {
        const result = await this.scrapeJobs(careerPageUrl, company);
        results.push(result);
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        results.push({
          success: false,
          jobs: [],
          total_found: 0,
          career_page_url: careerPageUrl,
          scraping_method: 'fallback',
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            scraped_at: new Date().toISOString(),
            processing_time_ms: 0,
            confidence_score: 0.0
          }
        });
      }
    }
    
    return results;
  }

  /**
   * Get comprehensive job scraping statistics
   */
  getScrapingStats(): {
    cached_results: number;
    cache_hit_rate: string;
    total_companies_processed: number;
    average_jobs_per_company: number;
  } {
    const cacheSize = this.cache.size;
    // This is a simplified version - in production you'd track more detailed stats
    
    return {
      cached_results: cacheSize,
      cache_hit_rate: '0%', // Would need to track hits vs misses
      total_companies_processed: cacheSize,
      average_jobs_per_company: 0 // Would calculate from actual data
    };
  }

  /**
   * Enhanced application URL processing
   */
  private enhanceApplicationUrl(aiProvidedUrl: string | undefined, jobTitle: string | undefined, careerPageUrl: string, companyName: string): string {
    // If AI provided a valid application URL, validate and use it
    if (aiProvidedUrl && aiProvidedUrl !== careerPageUrl) {
      const url = aiProvidedUrl.toLowerCase();
      
      // Check if it's likely a direct application URL
      const applicationIndicators = [
        'apply', 'application', 'job-application', '/apply/',
        'greenhouse.io', 'lever.co', 'workable.com', 'smartrecruiters.com',
        'jobvite.com', 'bamboohr.com'
      ];
      
      for (const indicator of applicationIndicators) {
        if (url.includes(indicator)) {
          // Ensure it's a full URL
          try {
            return aiProvidedUrl.startsWith('http') ? aiProvidedUrl : new URL(aiProvidedUrl, careerPageUrl).href;
          } catch (error) {
            console.warn(`Invalid URL from AI: ${aiProvidedUrl}`);
            break;
          }
        }
      }
    }
    
    // If no valid URL from AI, construct one based on job board patterns
    const constructedUrl = this.constructJobApplicationUrl(careerPageUrl, jobTitle, companyName);
    if (constructedUrl) {
      return constructedUrl;
    }
    
    // Final fallback - use career page with apply suffix
    return `${careerPageUrl}/apply`;
  }

  /**
   * Construct job application URL based on job board patterns
   */
  private constructJobApplicationUrl(careerPageUrl: string, jobTitle: string | undefined, companyName: string): string | null {
    const baseUrl = careerPageUrl.toLowerCase();
    const titleSlug = jobTitle ? jobTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') : 'position';
    
    // Job board specific patterns
    if (baseUrl.includes('lever.co')) {
      return `${careerPageUrl}/${titleSlug}/apply`;
    } else if (baseUrl.includes('greenhouse.io')) {
      return `${careerPageUrl}/jobs/${titleSlug}`;
    } else if (baseUrl.includes('smartrecruiters.com')) {
      return `${careerPageUrl}/${titleSlug}`;
    } else if (baseUrl.includes('workable.com')) {
      return `${careerPageUrl}/j/${titleSlug}`;
    } else if (baseUrl.includes('bamboohr.com')) {
      return `${careerPageUrl}/view.php?id=${titleSlug}`;
    } else if (baseUrl.includes('jobvite.com')) {
      return `${careerPageUrl}/job/${titleSlug}`;
    }
    
    // Generic company website patterns
    if (baseUrl.includes('/careers') || baseUrl.includes('/jobs')) {
      return `${careerPageUrl}/apply/${titleSlug}`;
    }
    
    // Create application URL based on common patterns
    try {
      const baseDomain = careerPageUrl.replace(/\/[^\/]*$/, '');
      return `${baseDomain}/careers/apply/${titleSlug}`;
    } catch (error) {
      return null;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export const jobScrapingAgent = new JobScrapingAgent();