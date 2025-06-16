import type { Company } from '@/components/dashboard/CompanyDirectory';
import type { JobOpportunity } from './autonomousJobAgent';

interface ScrapingResult {
  success: boolean;
  jobs: JobOpportunity[];
  careerPageUrl?: string;
  error?: string;
  scrapingSteps: string[];
}

interface ParsedJobElement {
  title: string;
  url: string;
  location?: string;
  department?: string;
  type?: string;
  description?: string;
}

/**
 * Real Web Scraper with LLM-Powered Navigation
 * Implements actual HTTP requests and HTML parsing for job discovery
 */
export class RealJobScraper {
  private openai: any;
  private isOpenAIConfigured: boolean;

  constructor() {
    this.isOpenAIConfigured = !!import.meta.env.VITE_OPENAI_API_KEY;
    if (this.isOpenAIConfigured) {
      // Dynamically import OpenAI to avoid errors if not configured
      import('openai').then(({ default: OpenAI }) => {
        this.openai = new OpenAI({
          apiKey: import.meta.env.VITE_OPENAI_API_KEY,
          dangerouslyAllowBrowser: true
        });
      });
    }
  }

  /**
   * Main entry point: Scrape real jobs from company career page
   */
  async scrapeCompanyJobs(company: Company, userProfile?: any): Promise<ScrapingResult> {
    const steps: string[] = [];
    
    try {
      steps.push('🔍 Starting real job discovery process...');
      
      // Step 1: Find the actual career page
      const careerPageResult = await this.findCareerPage(company);
      if (!careerPageResult.success) {
        return {
          success: false,
          jobs: [],
          error: careerPageResult.error,
          scrapingSteps: [...steps, careerPageResult.error || 'Failed to find career page']
        };
      }

      steps.push(`📄 Found career page: ${careerPageResult.url}`);

      // Step 2: Fetch and analyze the career page
      const pageContent = await this.fetchPageContent(careerPageResult.url!);
      if (!pageContent.success) {
        return {
          success: false,
          jobs: [],
          error: pageContent.error,
          scrapingSteps: [...steps, pageContent.error || 'Failed to fetch page content']
        };
      }

      steps.push('🤖 Analyzing page structure with LLM...');

      // Step 3: Use LLM to analyze page structure and find job listings
      const jobElements = await this.extractJobElements(pageContent.html!, careerPageResult.url!, company);
      
      if (jobElements.length === 0) {
        steps.push('❌ No job listings found on career page');
        return {
          success: false,
          jobs: [],
          error: 'No job listings found',
          scrapingSteps: steps
        };
      }

      steps.push(`✅ Found ${jobElements.length} job listings`);

      // Step 4: Navigate to individual job pages and extract detailed information
      const detailedJobs: JobOpportunity[] = [];
      
      for (let i = 0; i < Math.min(jobElements.length, 5); i++) { // Limit to 5 jobs
        const jobElement = jobElements[i];
        steps.push(`📋 Extracting details for: ${jobElement.title}`);
        
        const detailedJob = await this.extractJobDetails(jobElement, company, careerPageResult.url!);
        if (detailedJob) {
          detailedJobs.push(detailedJob);
        }
      }

      steps.push(`🎉 Successfully scraped ${detailedJobs.length} real job opportunities`);

      return {
        success: true,
        jobs: detailedJobs,
        careerPageUrl: careerPageResult.url,
        scrapingSteps: steps
      };

    } catch (error) {
      console.error('Real job scraping error:', error);
      return {
        success: false,
        jobs: [],
        error: error instanceof Error ? error.message : 'Unknown scraping error',
        scrapingSteps: [...steps, 'Error occurred during scraping process']
      };
    }
  }

  /**
   * Step 1: Find the company's career page using multiple strategies
   */
  private async findCareerPage(company: Company): Promise<{ success: boolean; url?: string; error?: string }> {
    const baseUrl = company.website_url || `https://${company.name.toLowerCase().replace(/\s+/g, '')}.com`;
    
    // Common career page patterns to try
    const careerPatterns = [
      '/careers',
      '/jobs',
      '/opportunities',
      '/join-us',
      '/work-with-us',
      '/hiring',
      '/open-positions',
      '/career',
      '/job-openings'
    ];

    // Try each pattern
    for (const pattern of careerPatterns) {
      const testUrl = `${baseUrl.replace(/\/$/, '')}${pattern}`;
      
      console.log(`🔍 Testing career page URL: ${testUrl}`);
      
      try {
        // Use our proxy to check if the URL exists and contains job content
        const contentCheck = await this.fetchPageContent(testUrl, false);
        if (contentCheck.success && contentCheck.html) {
          // Check if the page contains job-related content
          const lowerHtml = contentCheck.html.toLowerCase();
          const hasJobContent = (
            lowerHtml.includes('job') || 
            lowerHtml.includes('career') || 
            lowerHtml.includes('position') || 
            lowerHtml.includes('engineer') ||
            lowerHtml.includes('developer') ||
            lowerHtml.includes('opening')
          );
          
          if (hasJobContent) {
            console.log(`✅ Found valid career page: ${testUrl}`);
            return { success: true, url: testUrl };
          } else {
            console.log(`❌ Page exists but no job content found: ${testUrl}`);
          }
        } else {
          console.log(`❌ Failed to fetch ${testUrl}: ${contentCheck.error}`);
        }
      } catch (error) {
        console.log(`❌ Error testing ${testUrl}:`, error);
        continue;
      }
    }

    // If basic patterns fail, use LLM to predict career page URL
    if (this.isOpenAIConfigured && this.openai) {
      try {
        const prediction = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a web navigation expert. Given a company name and website, predict the most likely career page URL. Return ONLY the URL, nothing else."
            },
            {
              role: "user",
              content: `Company: ${company.name}\nWebsite: ${baseUrl}\nCareer page URL:`
            }
          ],
          max_tokens: 100,
          temperature: 0.1
        });

        const predictedUrl = prediction.choices[0]?.message?.content?.trim();
        if (predictedUrl && predictedUrl.startsWith('http')) {
          const contentCheck = await this.fetchPageContent(predictedUrl, true);
          if (contentCheck.success) {
            return { success: true, url: predictedUrl };
          }
        }
      } catch (error) {
        console.error('LLM career page prediction failed:', error);
      }
    }

    return { 
      success: false, 
      error: `Could not find career page for ${company.name}. Tried common patterns: ${careerPatterns.join(', ')}` 
    };
  }

  /**
   * Step 2: Fetch page content with proper error handling
   */
  private async fetchPageContent(url: string, headOnly = false): Promise<{ success: boolean; html?: string; error?: string }> {
    try {
      console.log(`🔍 Attempting to fetch: ${url}`);
      
      // Make actual HTTP request through proxy server
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, headOnly })
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Fetch failed: ${response.status} - ${errorText}`);
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      const responseData = await response.json();
      
      if (!responseData.success) {
        console.error(`❌ Scraping failed: ${responseData.error}`);
        return { 
          success: false, 
          error: responseData.error || 'Unknown scraping error' 
        };
      }

      console.log(`✅ Successfully fetched ${responseData.html?.length || 0} characters`);
      return { success: true, html: responseData.html };

    } catch (error) {
      console.error(`💥 Fetch error for ${url}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch page content' 
      };
    }
  }

  /**
   * Step 3: Use LLM to extract job elements from HTML
   */
  private async extractJobElements(html: string, careerPageUrl: string, company: Company): Promise<ParsedJobElement[]> {
    if (!this.isOpenAIConfigured || !this.openai) {
      // Fallback: Basic HTML parsing without LLM
      return this.basicJobExtraction(html, careerPageUrl);
    }

    try {
      // Clean and truncate HTML for LLM processing
      const cleanedHtml = this.cleanHtmlForLLM(html);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert web scraper. Analyze the provided HTML from a career page and extract job listings.

TASK: Find all job opportunities on this page and return them as a JSON array.

For each job, extract:
- title: Job title/position name
- url: Link to the job posting (make absolute URLs)
- location: Job location if available
- department: Department/team if available  
- type: Full-time/Part-time/Contract if available
- description: Brief description if available

IMPORTANT:
- Only return jobs relevant to software engineering, development, or technical roles
- Make URLs absolute by prepending the base domain if they're relative
- Return valid JSON array only, no other text
- If no relevant jobs found, return empty array []

EXAMPLE OUTPUT:
[
  {
    "title": "Senior Software Engineer",
    "url": "https://company.com/careers/senior-software-engineer",
    "location": "Berlin, Germany",
    "department": "Engineering",
    "type": "Full-time"
  }
]`
          },
          {
            role: "user", 
            content: `Career page URL: ${careerPageUrl}\nCompany: ${company.name}\n\nHTML to analyze:\n${cleanedHtml}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return [];

      try {
        const jobs = JSON.parse(content);
        return Array.isArray(jobs) ? jobs : [];
      } catch (parseError) {
        console.error('Failed to parse LLM job extraction response:', parseError);
        return this.basicJobExtraction(html, careerPageUrl);
      }

    } catch (error) {
      console.error('LLM job extraction failed:', error);
      return this.basicJobExtraction(html, careerPageUrl);
    }
  }

  /**
   * Step 4: Extract detailed job information
   */
  private async extractJobDetails(jobElement: ParsedJobElement, company: Company, baseUrl: string): Promise<JobOpportunity | null> {
    try {
      // Fetch the individual job page
      const jobPageContent = await this.fetchPageContent(jobElement.url);
      
      let description = jobElement.description || '';
      let requirements: string[] = [];
      let salaryRange: string | undefined;

      // If we successfully fetched the job page, extract more details
      if (jobPageContent.success && jobPageContent.html) {
        const detailedInfo = await this.extractDetailedJobInfo(jobPageContent.html, jobElement.title);
        description = detailedInfo.description || description;
        requirements = detailedInfo.requirements;
        salaryRange = detailedInfo.salaryRange;
      }

      // Calculate confidence score based on available information
      const confidenceScore = this.calculateConfidenceScore(jobElement, description, requirements);

      const job: JobOpportunity = {
        id: `real-${company.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: jobElement.title,
        company: company.name,
        location: jobElement.location || company.headquarters || 'Location not specified',
        url: jobElement.url,
        description: description || `${jobElement.title} position at ${company.name}`,
        requirements,
        salary_range: salaryRange,
        confidence_score: confidenceScore,
        type: jobElement.type,
        department: jobElement.department,
        source: 'real_scraping'
      };

      return job;

    } catch (error) {
      console.error(`Failed to extract details for job: ${jobElement.title}`, error);
      return null;
    }
  }

  /**
   * Use LLM to extract detailed information from job page
   */
  private async extractDetailedJobInfo(html: string, jobTitle: string): Promise<{
    description?: string;
    requirements: string[];
    salaryRange?: string;
  }> {
    if (!this.isOpenAIConfigured || !this.openai) {
      return { requirements: [] };
    }

    try {
      const cleanedHtml = this.cleanHtmlForLLM(html);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Extract job details from this job posting HTML. Return a JSON object with:
- description: Main job description (2-3 sentences)
- requirements: Array of key requirements/qualifications
- salaryRange: Salary range if mentioned

Return only valid JSON, no other text.`
          },
          {
            role: "user",
            content: `Job Title: ${jobTitle}\n\nHTML:\n${cleanedHtml}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (content) {
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Failed to extract detailed job info:', error);
    }

    return { requirements: [] };
  }

  /**
   * Fallback job extraction without LLM
   */
  private basicJobExtraction(html: string, baseUrl: string): ParsedJobElement[] {
    const jobs: ParsedJobElement[] = [];
    
    // Simple regex patterns to find job-related links
    const jobPatterns = [
      /<a[^>]*href=['"](.*?)['"][^>]*>.*?(engineer|developer|software|technical|frontend|backend|fullstack|devops).*?<\/a>/gi,
      /<a[^>]*href=['"](.*?)['"][^>]*>.*?(job|position|role|career|opportunity).*?<\/a>/gi
    ];

    for (const pattern of jobPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && jobs.length < 10) {
        const [fullMatch, href, keyword] = match;
        const title = this.extractTextFromHTML(fullMatch);
        
        if (title && href && this.isRelevantJob(title)) {
          const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
          
          jobs.push({
            title: title.trim(),
            url: absoluteUrl,
            location: undefined,
            description: `${title} position`
          });
        }
      }
    }

    return jobs;
  }

  /**
   * Helper methods
   */
  private cleanHtmlForLLM(html: string): string {
    // Remove scripts, styles, and comments
    let cleaned = html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<!--.*?-->/gs, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Truncate if too long
    if (cleaned.length > 8000) {
      cleaned = cleaned.substring(0, 8000) + '...';
    }

    return cleaned;
  }

  private extractTextFromHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  private isRelevantJob(title: string): boolean {
    const relevantKeywords = [
      'engineer', 'developer', 'software', 'technical', 'programming',
      'frontend', 'backend', 'fullstack', 'devops', 'data', 'ai', 'ml'
    ];
    
    const lowerTitle = title.toLowerCase();
    return relevantKeywords.some(keyword => lowerTitle.includes(keyword));
  }

  private calculateConfidenceScore(jobElement: ParsedJobElement, description: string, requirements: string[]): number {
    let score = 0.5; // Base score for real scraping
    
    if (jobElement.location) score += 0.1;
    if (jobElement.department) score += 0.1;
    if (description && description.length > 50) score += 0.2;
    if (requirements.length > 0) score += 0.1;
    if (jobElement.url && jobElement.url.includes('apply')) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  /**
   * Mock career page HTML for demonstration
   */
  private getMockCareerPageHTML(url: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><title>Careers</title></head>
    <body>
      <div class="jobs-container">
        <div class="job-listing">
          <h3><a href="/careers/senior-software-engineer">Senior Software Engineer</a></h3>
          <p>Location: Berlin, Germany</p>
          <p>Department: Engineering</p>
          <p>Type: Full-time</p>
        </div>
        <div class="job-listing">
          <h3><a href="/careers/frontend-developer">Frontend Developer</a></h3>
          <p>Location: Remote</p>
          <p>Department: Product</p>
          <p>Type: Full-time</p>
        </div>
        <div class="job-listing">
          <h3><a href="/careers/devops-engineer">DevOps Engineer</a></h3>
          <p>Location: Berlin, Germany</p>
          <p>Department: Infrastructure</p>
          <p>Type: Full-time</p>
        </div>
      </div>
    </body>
    </html>`;
  }
}

export const realJobScraper = new RealJobScraper();