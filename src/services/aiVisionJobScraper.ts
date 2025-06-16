import { chromium, Browser, Page } from 'playwright';
import { OpenAI } from 'openai';
import type { JobListing } from './jobScrapingAgent';
import type { Company } from './realCareerPageDiscovery';

export interface VisionAnalysisResult {
  action: 'click_element' | 'scroll_page' | 'extract_jobs' | 'navigate_next' | 'complete';
  element?: {
    selector?: string;
    text?: string;
    coordinates?: [number, number];
    description?: string;
  };
  jobs?: Partial<JobListing>[];
  reasoning?: string;
  confidence?: number;
  next_steps?: string[];
}

export interface AIVisionScrapingResult {
  success: boolean;
  jobs: JobListing[];
  total_found: number;
  career_page_url: string;
  scraping_method: 'ai_vision';
  steps_taken: string[];
  screenshots?: string[];
  error?: string;
  metadata: {
    scraped_at: string;
    processing_time_ms: number;
    confidence_score: number;
    ai_model_used: string;
  };
}

/**
 * AI Vision-powered job scraper that can navigate any website like a human
 * Uses Playwright for browser automation + OpenAI GPT-4 Vision for intelligent navigation
 */
export class AIVisionJobScraper {
  private openai: OpenAI;
  private browser: Browser | null = null;
  private debugMode: boolean = false;

  constructor(debugMode = false) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Required for AI Vision scraping.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
    
    this.debugMode = debugMode;
  }

  /**
   * Main entry point: Scrape jobs using AI vision from any company website
   */
  async scrapeJobsWithVision(
    companyUrl: string, 
    company: Company, 
    maxSteps = 10
  ): Promise<AIVisionScrapingResult> {
    const startTime = Date.now();
    const stepsTaken: string[] = [];
    const screenshots: string[] = [];
    
    try {
      // Initialize browser
      await this.initializeBrowser();
      const page = await this.browser!.newPage();
      
      // Configure page
      await this.configurePage(page);
      
      console.log(`🤖 AI Vision: Starting intelligent job scraping for ${company.name}`);
      stepsTaken.push(`Navigate to homepage: ${companyUrl}`);
      
      // Step 1: Navigate to company homepage
      await page.goto(companyUrl, { waitUntil: 'networkidle' });
      await this.waitAndStabilize(page);
      
      let screenshot = await this.takeScreenshot(page);
      if (this.debugMode) screenshots.push(screenshot);
      
      // Step 2: AI-guided navigation to find jobs
      let currentStep = 0;
      let allJobs: JobListing[] = [];
      
      while (currentStep < maxSteps) {
        currentStep++;
        
        console.log(`🔍 AI Vision Step ${currentStep}: Analyzing page...`);
        
        // Get fresh screenshot
        screenshot = await this.takeScreenshot(page);
        if (this.debugMode) screenshots.push(screenshot);
        
        // AI analyzes current page and decides next action
        const analysis = await this.analyzePageWithAI(
          screenshot, 
          company, 
          currentStep,
          stepsTaken
        );
        
        console.log(`🧠 AI Decision: ${analysis.action} - ${analysis.reasoning}`);
        stepsTaken.push(`Step ${currentStep}: ${analysis.action} - ${analysis.reasoning}`);
        
        // Execute AI's decision
        const result = await this.executeAIDecision(page, analysis);
        
        if (analysis.action === 'extract_jobs' && analysis.jobs) {
          // Convert partial jobs to full JobListings
          const extractedJobs = this.processExtractedJobs(
            analysis.jobs, 
            company, 
            page.url()
          );
          allJobs.push(...extractedJobs);
          console.log(`✅ AI Vision: Extracted ${extractedJobs.length} jobs`);
        }
        
        if (analysis.action === 'complete') {
          console.log(`🎉 AI Vision: Completed scraping with ${allJobs.length} jobs found`);
          break;
        }
        
        // Wait for page to stabilize after action
        await this.waitAndStabilize(page);
      }
      
      await this.cleanup();
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        jobs: allJobs,
        total_found: allJobs.length,
        career_page_url: page.url(),
        scraping_method: 'ai_vision',
        steps_taken: stepsTaken,
        screenshots: this.debugMode ? screenshots : undefined,
        metadata: {
          scraped_at: new Date().toISOString(),
          processing_time_ms: processingTime,
          confidence_score: allJobs.length > 0 ? 0.9 : 0.3,
          ai_model_used: 'gpt-4o'
        }
      };
      
    } catch (error) {
      await this.cleanup();
      console.error('❌ AI Vision scraping failed:', error);
      
      return {
        success: false,
        jobs: [],
        total_found: 0,
        career_page_url: companyUrl,
        scraping_method: 'ai_vision',
        steps_taken: stepsTaken,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          scraped_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startTime,
          confidence_score: 0.0,
          ai_model_used: 'gpt-4o'
        }
      };
    }
  }

  /**
   * Send screenshot to GPT-4 Vision for intelligent analysis
   */
  private async analyzePageWithAI(
    screenshot: string, 
    company: Company, 
    stepNumber: number,
    previousSteps: string[]
  ): Promise<VisionAnalysisResult> {
    
    const systemPrompt = `You are an expert web navigator specializing in finding job listings on company websites.

Your task: Navigate to and extract job listings for ${company.name}.

Current step: ${stepNumber}
Previous steps taken: ${previousSteps.join('; ')}

Analyze the screenshot and decide the next best action:

1. **click_element**: If you see links/buttons for "Careers", "Jobs", "Work with us", "Join us", etc.
2. **scroll_page**: If you need to see more content on the current page
3. **extract_jobs**: If you can see job listings that need to be extracted
4. **navigate_next**: If there's pagination or "Load more" for additional jobs
5. **complete**: If you've found all available jobs or can't find any career section

For **click_element**: Describe exactly what to click (text content, location)
For **extract_jobs**: Extract all visible job information in structured format

Always provide reasoning for your decision and confidence level (0.0-1.0).

Respond in JSON format:
{
  "action": "click_element|scroll_page|extract_jobs|navigate_next|complete",
  "element": {
    "text": "exact text of element to click",
    "description": "description of where element is located",
    "coordinates": [x, y] // if you can estimate
  },
  "jobs": [
    {
      "title": "Job Title",
      "description": "Job description...",
      "location": "Location",
      "employment_type": "full-time",
      "remote_type": "hybrid",
      "experience_level": "mid",
      "requirements": ["req1", "req2"],
      "technologies": ["tech1", "tech2"]
    }
  ],
  "reasoning": "Why this action makes sense",
  "confidence": 0.9,
  "next_steps": ["what to do after this step"]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2000,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${screenshot}`,
                  detail: "high"
                }
              }
            ]
          }
        ]
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from AI vision model');
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as VisionAnalysisResult;
      } else {
        throw new Error('Invalid JSON response from AI');
      }
      
    } catch (error) {
      console.error('❌ AI Vision analysis failed:', error);
      
      // Fallback decision
      return {
        action: 'complete',
        reasoning: 'AI analysis failed, ending scraping',
        confidence: 0.1
      };
    }
  }

  /**
   * Execute the action decided by AI
   */
  private async executeAIDecision(page: Page, analysis: VisionAnalysisResult): Promise<void> {
    try {
      switch (analysis.action) {
        case 'click_element':
          if (analysis.element?.text) {
            // Try to find and click element by text
            await this.clickElementByText(page, analysis.element.text);
          } else if (analysis.element?.coordinates) {
            // Click by coordinates if provided
            await page.mouse.click(analysis.element.coordinates[0], analysis.element.coordinates[1]);
          }
          break;
          
        case 'scroll_page':
          await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight * 0.8);
          });
          break;
          
        case 'navigate_next':
          if (analysis.element?.text) {
            await this.clickElementByText(page, analysis.element.text);
          }
          break;
          
        case 'extract_jobs':
        case 'complete':
          // No action needed, jobs extracted in main loop
          break;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to execute AI decision: ${analysis.action}`, error);
    }
  }

  /**
   * Smart element clicking that tries multiple strategies
   */
  private async clickElementByText(page: Page, text: string): Promise<void> {
    const strategies = [
      // Exact text match
      `text="${text}"`,
      // Case insensitive
      `text="${text}" >> nth(0)`,
      // Partial match
      `text*="${text}"`,
      // Inside links
      `a:has-text("${text}")`,
      // Inside buttons
      `button:has-text("${text}")`,
      // Generic clickable elements
      `[role="button"]:has-text("${text}")`,
      // Navigation links
      `nav a:has-text("${text}")`,
      // Menu items
      `[class*="menu"] a:has-text("${text}")`,
      // Header links
      `header a:has-text("${text}")`
    ];

    for (const selector of strategies) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          await element.click();
          console.log(`✅ Successfully clicked: ${text} using selector: ${selector}`);
          return;
        }
      } catch (error) {
        // Try next strategy
        continue;
      }
    }
    
    console.warn(`⚠️ Could not find clickable element with text: ${text}`);
  }

  /**
   * Convert AI-extracted job data to full JobListing objects
   */
  private processExtractedJobs(
    partialJobs: Partial<JobListing>[], 
    company: Company, 
    currentUrl: string
  ): JobListing[] {
    return partialJobs.map((job, index) => ({
      id: `${company.id}-ai-vision-${Date.now()}-${index}`,
      company_id: company.id,
      company_name: company.name,
      title: job.title || 'Job Title Not Found',
      description: job.description || 'No description available',
      requirements: job.requirements || [],
      nice_to_have: job.nice_to_have || [],
      responsibilities: job.responsibilities || [],
      location: job.location || 'Location not specified',
      employment_type: job.employment_type || 'full-time',
      remote_type: job.remote_type || 'on-site',
      experience_level: job.experience_level || 'mid',
      application_url: this.enhanceApplicationUrl(job.application_url, job.title, currentUrl, company.name),
      posted_date: job.posted_date || new Date().toISOString(),
      technologies: job.technologies || [],
      benefits: job.benefits || [],
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      currency: job.currency,
      department: job.department,
      team_size: job.team_size,
      company_stage: job.company_stage,
      application_deadline: job.application_deadline
    }));
  }

  /**
   * Initialize browser with optimal settings
   */
  private async initializeBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: !this.debugMode, // Show browser in debug mode
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
  }

  /**
   * Configure page with human-like settings
   */
  private async configurePage(page: Page): Promise<void> {
    // Set realistic viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    );
    
    // Block unnecessary resources for faster loading
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'media', 'font'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  /**
   * Take high-quality screenshot for AI analysis
   */
  private async takeScreenshot(page: Page): Promise<string> {
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false, // Only visible area for faster processing
      quality: 80
    });
    
    return screenshot.toString('base64');
  }

  /**
   * Wait for page to stabilize after navigation/interaction
   */
  private async waitAndStabilize(page: Page): Promise<void> {
    try {
      // Wait for network to be mostly idle
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      
      // Small delay for dynamic content
      await page.waitForTimeout(1000);
      
      // Wait for any lazy-loaded content
      await page.evaluate(() => {
        return new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve(undefined);
          } else {
            window.addEventListener('load', () => resolve(undefined));
          }
        });
      });
    } catch (error) {
      // Continue even if stabilization fails
      console.warn('⚠️ Page stabilization timeout, continuing...');
    }
  }

  /**
   * Enhanced application URL processing for AI Vision results
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
      // Lever: https://jobs.lever.co/company/position-id/apply
      return `${careerPageUrl}/${titleSlug}/apply`;
    } else if (baseUrl.includes('greenhouse.io')) {
      // Greenhouse: https://boards.greenhouse.io/company/jobs/job-id
      return `${careerPageUrl}/jobs/${titleSlug}`;
    } else if (baseUrl.includes('smartrecruiters.com')) {
      // SmartRecruiters: https://jobs.smartrecruiters.com/Company/job-id
      return `${careerPageUrl}/${titleSlug}`;
    } else if (baseUrl.includes('workable.com')) {
      // Workable: https://apply.workable.com/company/j/job-id
      return `${careerPageUrl}/j/${titleSlug}`;
    } else if (baseUrl.includes('bamboohr.com')) {
      // BambooHR: https://company.bamboohr.com/jobs/view.php?id=job-id
      return `${careerPageUrl}/view.php?id=${titleSlug}`;
    } else if (baseUrl.includes('jobvite.com')) {
      // Jobvite: https://company.jobvite.com/careers/job/job-id
      return `${careerPageUrl}/job/${titleSlug}`;
    }
    
    // Generic company website patterns
    if (baseUrl.includes('/careers') || baseUrl.includes('/jobs')) {
      return `${careerPageUrl}/apply/${titleSlug}`;
    }
    
    // Create application URL based on common patterns
    try {
      const baseDomain = careerPageUrl.replace(/\/[^\/]*$/, ''); // Remove trailing path
      return `${baseDomain}/careers/apply/${titleSlug}`;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean up browser resources
   */
  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Singleton instance
export const aiVisionJobScraper = new AIVisionJobScraper(false);