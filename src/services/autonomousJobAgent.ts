import { OpenAI } from 'openai';
import { realJobScraper } from './realJobScraper';

// Types for our agent system
export interface Company {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  size_category: string | null;
  website_url: string | null;
  headquarters: string | null;
  founded_year: number | null;
}

export interface UserProfile {
  name: string;
  title: string;
  experience_years: number;
  skills: string[];
  preferred_locations: string[];
  salary_expectations?: {
    min: number;
    max: number;
    currency: string;
  };
}

export interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location?: string;
  url: string;
  description?: string;
  requirements?: string[];
  salary_range?: string;
  posting_date?: string;
  confidence_score: number; // How well it matches the user profile
  type?: string; // Full-time, Part-time, etc.
  department?: string;
  source?: 'real_scraping' | 'ai_generated' | 'api' | 'fallback';
}

export interface AgentResult {
  success: boolean;
  jobs: JobOpportunity[];
  career_page_url?: string;
  error?: string;
  search_steps: string[];
}

class AutonomousJobAgent {
  private openai: OpenAI;

  constructor() {
    // Initialize OpenAI client - you'll need to set VITE_OPENAI_API_KEY in your environment
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('VITE_OPENAI_API_KEY not found. The autonomous agent will use fallback mode.');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey || 'fallback',
      dangerouslyAllowBrowser: true // Only for demo purposes
    });
  }

  /**
   * Main entry point for autonomous job discovery with real web scraping
   */
  async discoverAndApplyToJobs(company: Company, userProfile: UserProfile): Promise<AgentResult> {
    const searchSteps: string[] = [];
    
    try {
      searchSteps.push(`🚀 Starting enhanced job discovery for ${company.name}...`);
      
      // Step 1: Try real web scraping first
      searchSteps.push('🔍 Attempting real web scraping of career page...');
      const realScrapingResult = await realJobScraper.scrapeCompanyJobs(company, userProfile);
      
      console.log('Real scraping result:', realScrapingResult);
      
      if (realScrapingResult.success && realScrapingResult.jobs.length > 0) {
        // Real scraping succeeded!
        searchSteps.push(...realScrapingResult.scrapingSteps);
        searchSteps.push(`✅ Real scraping successful: Found ${realScrapingResult.jobs.length} actual job postings`);
        
        return {
          success: true,
          jobs: realScrapingResult.jobs,
          career_page_url: realScrapingResult.careerPageUrl,
          search_steps: searchSteps
        };
      }
      
      // Step 2: Real scraping failed, fall back to AI generation
      searchSteps.push(`⚠️ Real scraping failed: ${realScrapingResult.error || 'Unknown error'}`);
      searchSteps.push('🤖 Falling back to AI-generated jobs...');
      if (realScrapingResult.scrapingSteps) {
        searchSteps.push(...realScrapingResult.scrapingSteps);
      }
      
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        searchSteps.push('❌ No OpenAI API key found, using demo mode...');
        return this.createFallbackResult(company, userProfile, searchSteps);
      }

      // Step 3: AI-powered job generation
      const careerPageResult = await this.findCareerPage(company);
      const careerPageUrl = careerPageResult.success ? careerPageResult.url! : 
        (company.website_url ? `${company.website_url}/careers` : `https://${company.name.toLowerCase().replace(/\s+/g, '')}.com/careers`);
      
      searchSteps.push(`🤖 Generating AI-powered job opportunities for ${company.name}...`);
      const aiJobsResult = await this.searchJobOpportunities(company, userProfile, careerPageUrl);

      if (aiJobsResult.success) {
        // Mark jobs as AI-generated
        const aiJobs = aiJobsResult.jobs.map(job => ({
          ...job,
          source: 'ai_generated' as const
        }));
        
        searchSteps.push(`🎭 Generated ${aiJobs.length} AI-powered job opportunities`);
        searchSteps.push('💡 Note: These are AI-generated positions based on company profile');
        
        return {
          success: true,
          jobs: aiJobs,
          career_page_url: careerPageUrl,
          search_steps: searchSteps
        };
      }

      // Step 4: Ultimate fallback
      return this.createFallbackResult(company, userProfile, searchSteps);

    } catch (error) {
      console.error('Enhanced job discovery error:', error);
      return {
        success: false,
        jobs: [],
        error: `Enhanced discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        search_steps: searchSteps
      };
    }
  }

  /**
   * Use OpenAI web search to find the company's career page
   */
  private async findCareerPage(company: Company): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const searchQuery = `${company.name} careers jobs page site:${this.extractDomain(company.website_url)}`;
      
      // For now, let's use a simple approach without web search tools since the API format is changing
      // We'll simulate the search and return a constructed career page URL
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a web research assistant specialized in finding company career pages. 
            Your task is to predict the most likely URL for a company's careers/jobs page based on their main website.
            
            Common patterns for career pages:
            - /careers
            - /jobs  
            - /join-us
            - /work-with-us
            - /positions
            - /opportunities
            
            Always respond with a JSON object containing:
            - "career_url": the predicted direct URL to the careers page
            - "confidence": a number between 0-1 indicating confidence
            - "reasoning": brief explanation of why this is likely the career page`
          },
          {
            role: "user", 
            content: `Predict the career page URL for ${company.name}. 
            Company website: ${company.website_url}
            Company info: ${company.description}
            
            Based on the website URL, what is the most likely careers page URL?`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const responseContent = response.choices[0].message.content;
      
      if (!responseContent) {
        return { success: false, error: "No response from AI agent" };
      }

      // Try to extract JSON from the response
      const jsonMatch = responseContent.match(/\{.*\}/s);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          if (result.career_url && result.confidence > 0.7) {
            return { success: true, url: result.career_url };
          }
        } catch (parseError) {
          // Fall back to URL extraction
        }
      }

      // Fallback: Extract any URL from the response
      const urlMatch = responseContent.match(/https?:\/\/[^\s)]+/);
      if (urlMatch) {
        return { success: true, url: urlMatch[0] };
      }

      return { success: false, error: "Could not find career page URL" };

    } catch (error) {
      console.error('Error finding career page:', error);
      return { 
        success: false, 
        error: `Failed to search for career page: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Search for specific job opportunities at the company
   */
  private async searchJobOpportunities(
    company: Company, 
    userProfile: UserProfile, 
    careerPageUrl: string
  ): Promise<{ success: boolean; jobs: JobOpportunity[]; error?: string }> {
    try {
      const searchQuery = `${company.name} software engineer developer jobs positions Berlin ${userProfile.skills.slice(0, 3).join(' ')}`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a job search specialist. Create realistic software engineering job listings for the specified company.
            
            Focus on roles that match:
            - Software engineering, development, or technical positions
            - ${userProfile.skills.join(', ')} skills
            - ${userProfile.preferred_locations.join(' or ')} locations
            - ${userProfile.experience_years} years experience level
            
            Create 1-3 realistic job listings as a JSON array, each containing:
            - "title": job title (e.g., "Software Engineer", "Backend Developer")
            - "url": constructed application URL based on career page
            - "location": job location 
            - "description": brief job description (1-2 sentences)
            - "requirements": array of 3-5 key requirements
            - "confidence_score": 0-1 score for profile match
            - "salary_range": estimated salary range for the location
            
            Make the jobs realistic for the company industry and location.`
          },
          {
            role: "user",
            content: `Create realistic software engineering jobs for ${company.name}. 
            Company: ${company.name} - ${company.description}
            Industry: ${company.industry}
            Location: ${company.headquarters}
            Career page: ${careerPageUrl}
            
            User profile:
            - Experience: ${userProfile.experience_years} years
            - Skills: ${userProfile.skills.join(', ')}
            - Preferred locations: ${userProfile.preferred_locations.join(', ')}
            
            Create jobs that would realistically exist at this company.`
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const responseContent = response.choices[0].message.content;
      
      if (!responseContent) {
        return { success: false, jobs: [], error: "No response from AI agent" };
      }

      // Parse the JSON response
      try {
        const result = JSON.parse(responseContent);
        
        // Handle both array and object with jobs array
        const jobs = Array.isArray(result) ? result : (result.jobs || [result]);
        
        // Convert to our JobOpportunity format
        const formattedJobs: JobOpportunity[] = jobs.map((job: any, index: number) => ({
          id: `${company.id}-job-${index}`,
          title: job.title || 'Software Engineer',
          company: company.name,
          location: job.location || company.headquarters || 'Remote',
          url: job.url || careerPageUrl,
          description: job.description || 'Software engineering position',
          requirements: job.requirements || [],
          salary_range: job.salary_range || undefined,
          confidence_score: job.confidence_score || 0.8,
          source: 'ai_generated'
        }));

        return { success: true, jobs: formattedJobs };
      } catch (parseError) {
        console.error('Error parsing jobs JSON:', parseError);
      }

      // Fallback: Create a mock job based on the company info
      const fallbackJob: JobOpportunity = {
        id: `${company.id}-job-0`,
        title: 'Software Engineer',
        company: company.name,
        location: company.headquarters || 'Berlin, Germany',
        url: careerPageUrl,
        description: `Software engineering position at ${company.name}`,
        requirements: ['Programming experience', 'Problem-solving skills'],
        confidence_score: 0.7,
        source: 'ai_generated'
      };

      return { success: true, jobs: [fallbackJob] };

    } catch (error) {
      console.error('Error searching job opportunities:', error);
      return { 
        success: false, 
        jobs: [], 
        error: `Failed to search for jobs: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string | null): string {
    if (!url) return '';
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Create a fallback result when OpenAI API is not available
   */
  private createFallbackResult(company: Company, userProfile: UserProfile, searchSteps: string[]): AgentResult {
    searchSteps.push('🔧 OpenAI API not configured - using demo mode');
    searchSteps.push(`🔍 Simulating search for ${company.name} career opportunities...`);
    
    // Create a realistic career page URL
    const careerPageUrl = company.website_url 
      ? `${company.website_url}/careers`
      : `https://${company.name.toLowerCase().replace(/\s+/g, '')}.com/careers`;
    
    searchSteps.push(`✅ Predicted career page: ${careerPageUrl}`);
    searchSteps.push(`🎯 Generating realistic job opportunities...`);

    // Create realistic jobs based on company info
    const jobs: JobOpportunity[] = [];

    // Base job for software engineering
    jobs.push({
      id: `${company.id}-job-0`,
      title: 'Software Engineer',
      company: company.name,
      location: company.headquarters || 'Berlin, Germany',
      url: `${careerPageUrl}#software-engineer`,
      description: `Join our engineering team to build innovative ${company.industry} solutions using modern technologies.`,
      requirements: [
        `${userProfile.experience_years}+ years of software development experience`,
        'Proficiency in JavaScript, TypeScript, or Python',
        'Experience with modern web frameworks',
        'Strong problem-solving skills',
        'Team collaboration experience'
      ],
      salary_range: company.headquarters?.includes('Berlin') ? '€60,000 - €80,000' : '€70,000 - €90,000',
      confidence_score: 0.85,
      source: 'fallback'
    });

    // Add a senior position if user has enough experience
    if (userProfile.experience_years >= 3) {
      jobs.push({
        id: `${company.id}-job-1`,
        title: 'Senior Backend Developer',
        company: company.name,
        location: company.headquarters || 'Berlin, Germany',
        url: `${careerPageUrl}#senior-backend-developer`,
        description: `Lead backend development initiatives and mentor junior developers in our ${company.industry} platform.`,
        requirements: [
          '3+ years of backend development experience',
          'Experience with Node.js, Python, or Go',
          'Database design and optimization',
          'API design and microservices',
          'Leadership and mentoring skills'
        ],
        salary_range: company.headquarters?.includes('Berlin') ? '€70,000 - €95,000' : '€80,000 - €105,000',
        confidence_score: 0.82,
        source: 'fallback'
      });
    }

    searchSteps.push(`🎉 Generated ${jobs.length} realistic job opportunities`);
    searchSteps.push('💡 Demo mode - Add your OpenAI API key for real web search');

    return {
      success: true,
      jobs: jobs,
      career_page_url: careerPageUrl,
      search_steps: searchSteps
    };
  }

  /**
   * Create a simple mock user profile for testing
   */
  static createMockProfile(): UserProfile {
    return {
      name: 'Alex Schmidt',
      title: 'Software Engineer',
      experience_years: 3,
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS'],
      preferred_locations: ['Berlin', 'Munich', 'Remote'],
      salary_expectations: {
        min: 65000,
        max: 85000,
        currency: 'EUR'
      }
    };
  }
}

// Export singleton instance
export const autonomousJobAgent = new AutonomousJobAgent();
export default AutonomousJobAgent;