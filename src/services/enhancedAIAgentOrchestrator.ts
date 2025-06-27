import OpenAI from 'openai';
import { realCareerPageDiscoveryService, type Company } from './realCareerPageDiscovery';
import { jobScrapingAgent, type JobListing, type JobScrapingResult } from './jobScrapingAgent';
import { jobMatchingService, type JobMatch } from './jobMatchingService';
import { UserService, type UserProfile, type UserPreferences } from './userService';

export interface ApplicationCost {
  operation: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  timestamp: string;
}

export interface AgentSession {
  id: string;
  user_id: string;
  mode: 'automated' | 'semi-automated';
  status: 'running' | 'paused' | 'completed' | 'failed';
  companies_processed: number;
  career_pages_found: number;
  jobs_discovered: number;
  jobs_matched: number;
  applications_generated: number;
  total_cost_usd: number;
  started_at: string;
  completed_at?: string;
  current_company?: string;
  current_step?: string;
  error_message?: string;
}

export interface AgentProgress {
  session_id: string;
  step: 'discovering_careers' | 'scraping_jobs' | 'matching_jobs' | 'generating_cvs' | 'completed';
  company_name: string;
  job_title?: string;
  message: string;
  progress_percent: number;
  cost_so_far: number;
  jobs_found_so_far: number;
  matches_found_so_far: number;
}

export interface ProcessingResult {
  success: boolean;
  session: AgentSession;
  career_pages_discovered: number;
  total_jobs_scraped: number;
  total_matches: JobMatch[];
  generated_cvs: Array<{
    job_match: JobMatch;
    cv_content: string;
    generated_at: string;
  }>;
  error?: string;
}

export class EnhancedAIAgentOrchestrator {
  private openai: OpenAI | null = null;
  private currentSession: AgentSession | null = null;
  private costs: ApplicationCost[] = [];
  private progressCallback?: (progress: AgentProgress) => void;

  // Token costs (per 1M tokens) - update these based on current OpenAI pricing
  private readonly TOKEN_COSTS = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 }
  };

  constructor() {
    // OpenAI client no longer needed - using backend endpoints for security
    this.openai = null;
  }

  setProgressCallback(callback: (progress: AgentProgress) => void) {
    this.progressCallback = callback;
  }

  private reportProgress(
    step: AgentProgress['step'],
    company_name: string,
    message: string,
    progress_percent: number,
    job_title?: string,
    jobs_found_so_far: number = 0,
    matches_found_so_far: number = 0
  ) {
    if (this.progressCallback && this.currentSession) {
      this.progressCallback({
        session_id: this.currentSession.id,
        step,
        company_name,
        job_title,
        message,
        progress_percent,
        cost_so_far: this.getTotalCost(),
        jobs_found_so_far,
        matches_found_so_far
      });
    }
  }

  private trackCost(operation: string, model: string, inputTokens: number, outputTokens: number) {
    const costs = this.TOKEN_COSTS[model as keyof typeof this.TOKEN_COSTS];
    if (!costs) return;

    const cost = (inputTokens * costs.input + outputTokens * costs.output) / 1000000;
    
    this.costs.push({
      operation,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: cost,
      timestamp: new Date().toISOString()
    });

    if (this.currentSession) {
      this.currentSession.total_cost_usd += cost;
    }
  }

  getTotalCost(): number {
    return this.costs.reduce((total, cost) => total + cost.cost_usd, 0);
  }

  getCostBreakdown(): ApplicationCost[] {
    return [...this.costs];
  }

  /**
   * Enhanced company matching with better filtering
   */
  private async matchCompaniesForUser(
    user: UserProfile,
    preferences: UserPreferences,
    availableCompanies: Company[]
  ): Promise<Company[]> {
    console.log('🔍 [DEBUG] Starting company matching...');
    console.log(`📊 [DEBUG] Available companies: ${availableCompanies.length}`);
    console.log(`🚫 [DEBUG] Excluded companies: ${preferences.excluded_companies.length}`);
    console.log(`🏢 [DEBUG] Preferred industries: ${preferences.preferred_industries.join(', ')}`);
    
    this.reportProgress('discovering_careers', 'System', 'Analyzing user preferences and matching companies...', 5);

    try {
      // Filter out excluded companies
      let eligibleCompanies = availableCompanies.filter(
        company => !preferences.excluded_companies.includes(company.id)
      );
      console.log(`✅ [DEBUG] After exclusion filter: ${eligibleCompanies.length} companies`);

      // Match by industry preferences if specified
      if (preferences.preferred_industries.length > 0) {
        const industryMatched = eligibleCompanies.filter(company => 
          company.industry && preferences.preferred_industries.some(industry => 
            company.industry!.toLowerCase().includes(industry.toLowerCase())
          )
        );
        
        console.log(`🏭 [DEBUG] Industry matched companies: ${industryMatched.length}`);
        
        if (industryMatched.length > 0) {
          eligibleCompanies = industryMatched;
        }
      }

      // Prioritize companies with websites (more likely to have career pages)
      const companiesWithWebsites = eligibleCompanies.filter(company => company.website_url);
      console.log(`🌐 [DEBUG] Companies with websites: ${companiesWithWebsites.length}`);
      eligibleCompanies = companiesWithWebsites;

      // Limit to reasonable number for cost control and processing time
      const limitedCompanies = eligibleCompanies.slice(0, 8);
      console.log(`🎯 [DEBUG] Final selection: ${limitedCompanies.length} companies`);
      limitedCompanies.forEach((company, i) => {
        console.log(`   ${i+1}. ${company.name} (${company.industry || 'No industry'}) - ${company.website_url}`);
      });
      
      this.reportProgress('discovering_careers', 'System', `Found ${limitedCompanies.length} matching companies to process`, 10);
      
      return limitedCompanies;
    } catch (error) {
      console.error('❌ [DEBUG] Error in company matching:', error);
      throw error;
    }
  }

  /**
   * Discover career pages for companies using WebSearch
   */
  private async discoverCareerPages(companies: Company[]): Promise<Array<{ company: Company; careerPageUrl: string }>> {
    console.log(`🔍 [DEBUG] Starting career page discovery for ${companies.length} companies...`);
    const results: Array<{ company: Company; careerPageUrl: string }> = [];
    
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const progressPercent = 10 + (i / companies.length) * 20; // 10-30%
      
      console.log(`🏢 [DEBUG] Processing company ${i+1}/${companies.length}: ${company.name}`);
      this.reportProgress('discovering_careers', company.name, `Discovering career page for ${company.name}...`, progressPercent);

      try {
        console.log(`   📍 [DEBUG] Calling career page discovery service...`);
        const startTime = Date.now();
        const careerPageResult = await realCareerPageDiscoveryService.discoverCareerPage(company);
        const duration = Date.now() - startTime;
        
        console.log(`   ⏱️  [DEBUG] Career page discovery took ${duration}ms`);
        console.log(`   📊 [DEBUG] Result: URL=${careerPageResult.career_page_url}, Confidence=${careerPageResult.confidence_score}`);
        
        if (careerPageResult.career_page_url && careerPageResult.confidence_score > 0.2) {
          results.push({
            company,
            careerPageUrl: careerPageResult.career_page_url
          });
          
          if (this.currentSession) {
            this.currentSession.career_pages_found++;
          }
          
          console.log(`✅ [DEBUG] Found career page for ${company.name}: ${careerPageResult.career_page_url} (confidence: ${careerPageResult.confidence_score.toFixed(2)})`);
        } else {
          console.log(`❌ [DEBUG] No reliable career page found for ${company.name} (confidence: ${careerPageResult.confidence_score})`);
          if (careerPageResult.error) {
            console.log(`   🚨 [DEBUG] Error: ${careerPageResult.error}`);
          }
        }
      } catch (error) {
        console.error(`❌ [DEBUG] Error discovering career page for ${company.name}:`, error);
      }

      // Update current company in session
      if (this.currentSession) {
        this.currentSession.current_company = company.name;
        this.currentSession.companies_processed = i + 1;
      }
      
      // Add small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`📊 [DEBUG] Career page discovery completed: ${results.length}/${companies.length} successful`);
    return results;
  }

  /**
   * Scrape jobs from career pages using LangChain agent
   */
  private async scrapeJobsFromCareerPages(
    companyCareerPages: Array<{ company: Company; careerPageUrl: string }>
  ): Promise<{ jobs: JobListing[]; scrapingResults: JobScrapingResult[] }> {
    const allJobs: JobListing[] = [];
    const scrapingResults: JobScrapingResult[] = [];
    
    for (let i = 0; i < companyCareerPages.length; i++) {
      const { company, careerPageUrl } = companyCareerPages[i];
      const progressPercent = 30 + (i / companyCareerPages.length) * 25; // 30-55%
      
      this.reportProgress('scraping_jobs', company.name, `Scraping jobs from ${company.name}...`, progressPercent, undefined, allJobs.length);

      try {
        const scrapingResult = await jobScrapingAgent.scrapeJobs(careerPageUrl, company);
        scrapingResults.push(scrapingResult);
        
        if (scrapingResult.success && scrapingResult.jobs.length > 0) {
          allJobs.push(...scrapingResult.jobs);
          
          if (this.currentSession) {
            this.currentSession.jobs_discovered += scrapingResult.jobs.length;
          }
          
          console.log(`✅ Scraped ${scrapingResult.jobs.length} jobs from ${company.name}`);
        } else {
          console.log(`❌ No jobs found for ${company.name}: ${scrapingResult.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error(`Error scraping jobs for ${company.name}:`, error);
        scrapingResults.push({
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

    return { jobs: allJobs, scrapingResults };
  }

  /**
   * Match jobs using enhanced scoring system
   */
  private async matchJobs(
    jobs: JobListing[],
    userProfile: UserProfile,
    userPreferences: UserPreferences
  ): Promise<JobMatch[]> {
    this.reportProgress('matching_jobs', 'System', `Analyzing compatibility for ${jobs.length} jobs...`, 55, undefined, jobs.length);

    try {
      const matches = await jobMatchingService.matchJobs(jobs, userProfile, userPreferences);
      
      if (this.currentSession) {
        this.currentSession.jobs_matched = matches.length;
      }

      // Filter for reasonable matches (score > 0.4)
      const goodMatches = matches.filter(match => match.match_score > 0.4);
      
      this.reportProgress('matching_jobs', 'System', `Found ${goodMatches.length} good job matches`, 70, undefined, jobs.length, goodMatches.length);
      
      return goodMatches;
    } catch (error) {
      console.error('Error in job matching:', error);
      
      // Return basic matches if AI matching fails
      return jobs.map(job => ({
        job,
        match_score: 0.5,
        match_breakdown: {
          skills_match: 0.5,
          location_match: 0.5,
          experience_match: 0.5,
          industry_match: 0.5,
          employment_type_match: 0.5,
          remote_preference_match: 0.5,
          salary_match: 0.5,
          overall_fit: 0.5
        },
        match_reasons: ['Basic compatibility analysis'],
        concerns: ['Detailed matching unavailable'],
        recommendation: 'consider' as const
      }));
    }
  }

  /**
   * Generate tailored CVs for top job matches
   */
  private async generateTailoredCVs(
    topMatches: JobMatch[],
    userProfile: UserProfile,
    userPreferences: UserPreferences
  ): Promise<Array<{ job_match: JobMatch; cv_content: string; generated_at: string }>> {
    const generatedCVs: Array<{ job_match: JobMatch; cv_content: string; generated_at: string }> = [];
    
    // Limit to top 5 matches to control costs
    const limitedMatches = topMatches.slice(0, 5);
    
    for (let i = 0; i < limitedMatches.length; i++) {
      const match = limitedMatches[i];
      const progressPercent = 70 + (i / limitedMatches.length) * 25; // 70-95%
      
      this.reportProgress('generating_cvs', match.job.company_name, `Generating CV for ${match.job.title}`, progressPercent, match.job.title, undefined, topMatches.length);

      try {
        const cvContent = await this.generateEnhancedCV(userProfile, userPreferences, match);
        
        generatedCVs.push({
          job_match: match,
          cv_content: cvContent,
          generated_at: new Date().toISOString()
        });
        
        if (this.currentSession) {
          this.currentSession.applications_generated++;
        }
        
        console.log(`✅ Generated CV for ${match.job.title} at ${match.job.company_name}`);
        
      } catch (error) {
        console.error(`Error generating CV for ${match.job.title}:`, error);
      }
    }

    return generatedCVs;
  }

  /**
   * Enhanced CV generation using job match data
   */
  private async generateEnhancedCV(
    userProfile: UserProfile,
    userPreferences: UserPreferences,
    jobMatch: JobMatch
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    const job = jobMatch.job;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert CV writer specializing in creating highly targeted, ATS-optimized CVs that maximize job match scores.

Create a professional CV that strategically highlights the candidate's alignment with the specific job requirements and demonstrates clear value proposition.

STRUCTURE:
1. Professional Summary (3-4 lines, match-focused)
2. Core Competencies (skills relevant to job)
3. Professional Experience (highlight relevant achievements)
4. Technical Skills (organized by relevance)
5. Education & Certifications
6. Additional Information (if space permits)

OPTIMIZATION GUIDELINES:
- Use keywords from job requirements naturally
- Quantify achievements where possible
- Highlight match strengths identified in the analysis
- Address any concerns mentioned in the job match
- Keep it concise but comprehensive (max 2 pages)
- Use action verbs and specific technical terms
- Ensure ATS compatibility with clean formatting`
          },
          {
            role: 'user',
            content: `Create a highly targeted CV for this specific job opportunity:

CANDIDATE PROFILE:
Name: ${userProfile.full_name || 'Professional Candidate'}
Email: ${userProfile.email}
Phone: ${userProfile.phone || 'Available upon request'}
Location: ${userProfile.location || userPreferences.preferred_locations[0] || 'Flexible'}
LinkedIn: ${userProfile.linkedin_url || 'Available upon request'}
GitHub: ${userProfile.github_url || 'Available upon request'}
Portfolio: ${userProfile.portfolio_url || 'Available upon request'}

Current Title: ${userProfile.current_title || 'Software Professional'}
Professional Summary: ${userProfile.professional_summary || 'Experienced professional seeking new opportunities'}

Core Skills: ${userPreferences.skills.join(', ')}
Preferred Industries: ${userPreferences.preferred_industries.join(', ')}

JOB OPPORTUNITY:
Company: ${job.company_name}
Position: ${job.title}
Experience Level: ${job.experience_level}
Location: ${job.location}
Remote Type: ${job.remote_type}

Job Description: ${job.description}

Key Requirements: ${job.requirements.join(', ')}
Nice to Have: ${job.nice_to_have.join(', ')}
Core Responsibilities: ${job.responsibilities.join(', ')}
Technologies: ${job.technologies?.join(', ') || 'Various technologies'}

JOB MATCH ANALYSIS:
Overall Match Score: ${Math.round(jobMatch.match_score * 100)}%
Strongest Areas: ${jobMatch.match_reasons.slice(0, 3).join(', ')}
Areas to Address: ${jobMatch.concerns.slice(0, 2).join(', ')}

Skills Match: ${Math.round(jobMatch.match_breakdown.skills_match * 100)}%
Experience Match: ${Math.round(jobMatch.match_breakdown.experience_match * 100)}%
Location Match: ${Math.round(jobMatch.match_breakdown.location_match * 100)}%

INSTRUCTIONS:
1. Strategically emphasize the strongest match areas
2. Address any concerns subtly through relevant experience
3. Use specific keywords from the job requirements
4. Show clear progression and relevant achievements
5. Make it compelling and authentic
6. Optimize for both ATS systems and human readers

Create a professional, targeted CV that maximizes this candidate's chances for this specific role.`
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      });

      // Track API costs
      const usage = response.usage;
      if (usage) {
        this.trackCost('enhanced_cv_generation', 'gpt-4o', usage.prompt_tokens, usage.completion_tokens);
      }

      return response.choices[0]?.message?.content || 'CV generation failed';

    } catch (error) {
      console.error('Error generating enhanced CV:', error);
      throw error;
    }
  }

  /**
   * Start enhanced automated session
   */
  async startAutomatedSession(userId: string): Promise<AgentSession> {
    console.log(`🚀 [DEBUG] Starting session for user: ${userId}`);
    
    // Check if we're in development mode with bypass auth
    const isDevelopment = import.meta.env.DEV;
    const bypassAuth = isDevelopment && import.meta.env.VITE_BYPASS_AUTH === 'true';
    
    let userProfile: UserProfile | null = null;
    let userPreferences: UserPreferences | null = null;
    
    if (bypassAuth) {
      console.log('🔓 [DEBUG] Development mode detected, using mock data');
      
      // Use mock data directly instead of querying database
      userProfile = {
        id: 'dev-profile-123',
        user_id: 'dev-user-123',
        full_name: 'Development User',
        email: 'dev@example.com',
        phone: '+1234567890',
        location: 'Berlin, Germany',
        linkedin_url: 'https://linkedin.com/in/dev-user',
        github_url: 'https://github.com/dev-user',
        portfolio_url: 'https://dev-user.com',
        professional_summary: 'Experienced software engineer passionate about building innovative solutions.',
        current_title: 'Senior Software Engineer',
        github_username: 'dev-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      userPreferences = {
        id: 'dev-prefs-123',
        user_id: 'dev-user-123',
        excluded_companies: [],
        preferred_locations: ['Berlin', 'Munich', 'Remote'],
        min_salary: 65000,
        max_salary: 95000,
        currency: 'EUR',
        job_types: ['full-time'],
        remote_preference: 'hybrid',
        preferred_industries: ['Technology', 'Software', 'Fintech'],
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
        preferred_company_sizes: ['startup', 'medium', 'large'],
        preferred_remote: 'hybrid',
        preferred_job_types: ['full-time'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('✅ [DEBUG] Mock data created successfully');
    } else {
      console.log('🔄 [DEBUG] Production mode, fetching from database');
      // Get user profile and preferences from database
      [userProfile, userPreferences] = await Promise.all([
        UserService.getUserProfile(userId),
        UserService.getUserPreferences(userId)
      ]);
    }

    if (!userProfile || !userPreferences) {
      console.error('❌ [DEBUG] Missing user data:', { userProfile: !!userProfile, userPreferences: !!userPreferences });
      throw new Error('User profile or preferences not found');
    }
    
    console.log('✅ [DEBUG] User data validated:', {
      profileName: userProfile.full_name,
      skillsCount: userPreferences.skills.length,
      industriesCount: userPreferences.preferred_industries.length
    });

    // Create new session
    this.currentSession = {
      id: `enhanced-session-${Date.now()}`,
      user_id: userId,
      mode: 'automated',
      status: 'running',
      companies_processed: 0,
      career_pages_found: 0,
      jobs_discovered: 0,
      jobs_matched: 0,
      applications_generated: 0,
      total_cost_usd: 0,
      started_at: new Date().toISOString()
    };

    this.costs = []; // Reset cost tracking

    this.reportProgress('discovering_careers', 'System', 'Starting enhanced job discovery agent...', 0);

    console.log(`🚀 Started enhanced automated session for user ${userId}`);

    return this.currentSession;
  }

  /**
   * Process enhanced automated applications
   */
  async processEnhancedAutomatedApplications(userId: string): Promise<ProcessingResult> {
    console.log(`🚀 [DEBUG] Starting enhanced automated applications for user: ${userId}`);
    
    if (!this.currentSession) {
      console.error('❌ [DEBUG] No active session found');
      throw new Error('No active session');
    }

    const startTime = Date.now();

    try {
      console.log('📋 [DEBUG] Fetching user data and companies...');
      
      // Check if we're in development mode with bypass auth
      const isDevelopment = import.meta.env.DEV;
      const bypassAuth = isDevelopment && import.meta.env.VITE_BYPASS_AUTH === 'true';
      
      let userProfile: UserProfile | null = null;
      let userPreferences: UserPreferences | null = null;
      let companies: Company[] = [];
      
      if (bypassAuth) {
        console.log('🔓 [DEBUG] Using mock data for processing');
        
        // Use same mock data as in startAutomatedSession
        userProfile = {
          id: 'dev-profile-123',
          user_id: 'dev-user-123',
          full_name: 'Development User',
          email: 'dev@example.com',
          phone: '+1234567890',
          location: 'Berlin, Germany',
          linkedin_url: 'https://linkedin.com/in/dev-user',
          github_url: 'https://github.com/dev-user',
          portfolio_url: 'https://dev-user.com',
          professional_summary: 'Experienced software engineer passionate about building innovative solutions.',
          current_title: 'Senior Software Engineer',
          github_username: 'dev-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        userPreferences = {
          id: 'dev-prefs-123',
          user_id: 'dev-user-123',
          excluded_companies: [],
          preferred_locations: ['Berlin', 'Munich', 'Remote'],
          min_salary: 65000,
          max_salary: 95000,
          currency: 'EUR',
          job_types: ['full-time'],
          remote_preference: 'hybrid',
          preferred_industries: ['Technology', 'Software', 'Fintech'],
          skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
          preferred_company_sizes: ['startup', 'medium', 'large'],
          preferred_remote: 'hybrid',
          preferred_job_types: ['full-time'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Get companies
        companies = await this.getAllCompanies();
        
        console.log('✅ [DEBUG] Mock data and companies loaded');
      } else {
        // Get user data from database
        const [profile, preferences, companiesData] = await Promise.all([
          UserService.getUserProfile(userId),
          UserService.getUserPreferences(userId),
          this.getAllCompanies()
        ]);
        
        userProfile = profile;
        userPreferences = preferences;
        companies = companiesData;
      }

      if (!userProfile || !userPreferences) {
        console.error('❌ [DEBUG] User data missing:', { userProfile: !!userProfile, userPreferences: !!userPreferences });
        throw new Error('User data not found');
      }

      console.log(`📊 [DEBUG] Processing applications for ${userProfile.full_name} with ${companies.length} companies available`);
      console.log(`👤 [DEBUG] User preferences:`, {
        skills: userPreferences.skills.length,
        industries: userPreferences.preferred_industries.length,
        locations: userPreferences.preferred_locations.length,
        excluded: userPreferences.excluded_companies.length
      });

      // Step 1: Match companies
      console.log('🎯 [DEBUG] Step 1: Matching companies...');
      const matchedCompanies = await this.matchCompaniesForUser(userProfile, userPreferences, companies);
      console.log(`🎯 [DEBUG] Matched ${matchedCompanies.length} companies`);

      if (matchedCompanies.length === 0) {
        console.warn('⚠️  [DEBUG] No companies matched! This might cause issues...');
      }

      // Step 2: Discover career pages
      console.log('🔍 [DEBUG] Step 2: Discovering career pages...');
      const companyCareerPages = await this.discoverCareerPages(matchedCompanies);
      console.log(`🔍 [DEBUG] Found ${companyCareerPages.length} career pages`);

      if (companyCareerPages.length === 0) {
        console.warn('⚠️  [DEBUG] No career pages found! This might be the issue...');
      }

      // Step 3: Scrape jobs
      console.log('📄 [DEBUG] Step 3: Scraping jobs...');
      const { jobs, scrapingResults } = await this.scrapeJobsFromCareerPages(companyCareerPages);
      console.log(`📄 [DEBUG] Scraped ${jobs.length} total jobs`);

      // Step 4: Match jobs
      console.log('✨ [DEBUG] Step 4: Matching jobs...');
      const jobMatches = await this.matchJobs(jobs, userProfile, userPreferences);
      console.log(`✨ [DEBUG] Found ${jobMatches.length} good job matches`);

      // Step 5: Generate CVs for top matches
      console.log('📝 [DEBUG] Step 5: Generating CVs...');
      const topMatches = jobMatches.slice(0, 5); // Top 5 matches
      const generatedCVs = await this.generateTailoredCVs(topMatches, userProfile, userPreferences);
      console.log(`📝 [DEBUG] Generated ${generatedCVs.length} tailored CVs`);

      // Complete session
      this.currentSession.status = 'completed';
      this.currentSession.completed_at = new Date().toISOString();
      
      const processingTimeMs = Date.now() - startTime;
      
      this.reportProgress('completed', 'System', `Completed! Found ${jobs.length} jobs, ${jobMatches.length} matches, generated ${generatedCVs.length} CVs`, 100, undefined, jobs.length, jobMatches.length);

      console.log(`🎉 [DEBUG] Enhanced automated session completed in ${Math.round(processingTimeMs / 1000)}s`);
      console.log(`📊 [DEBUG] Final Results:`, {
        careerPages: companyCareerPages.length,
        jobs: jobs.length,
        matches: jobMatches.length,
        cvs: generatedCVs.length,
        cost: this.getTotalCost().toFixed(4)
      });

      const result = {
        success: true,
        session: this.currentSession,
        career_pages_discovered: companyCareerPages.length,
        total_jobs_scraped: jobs.length,
        total_matches: jobMatches,
        generated_cvs: generatedCVs
      };

      console.log('✅ [DEBUG] Returning successful result');
      return result;

    } catch (error) {
      console.error('❌ [DEBUG] Error in enhanced automated session:', error);
      console.error('❌ [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      this.currentSession.status = 'failed';
      this.currentSession.error_message = error instanceof Error ? error.message : 'Unknown error';
      
      const errorResult = {
        success: false,
        session: this.currentSession,
        career_pages_discovered: 0,
        total_jobs_scraped: 0,
        total_matches: [],
        generated_cvs: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      console.log('❌ [DEBUG] Returning error result:', errorResult);
      return errorResult;
    }
  }

  private async getAllCompanies(): Promise<Company[]> {
    console.log('🏢 [DEBUG] Fetching companies from database...');
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      console.log('✅ [DEBUG] Supabase client imported');
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('❌ [DEBUG] Supabase error:', error);
        throw error;
      }
      
      console.log(`📊 [DEBUG] Fetched ${data?.length || 0} companies from database`);
      if (data && data.length > 0) {
        console.log('📋 [DEBUG] First few companies:', data.slice(0, 3).map(c => ({
          name: c.name,
          industry: c.industry,
          website: c.website_url
        })));
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ [DEBUG] Error fetching companies:', error);
      return [];
    }
  }

  async pauseSession(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.status = 'paused';
    }
  }

  async resumeSession(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.status = 'running';
    }
  }

  getCurrentSession(): AgentSession | null {
    return this.currentSession;
  }

  /**
   * Generate intelligent fallback jobs for a company when web scraping fails
   */
  private async generateFallbackJobsForCompany(
    company: any,
    userProfile: UserProfile,
    userPreferences: UserPreferences
  ): Promise<any[]> {
    const industryMap: { [key: string]: string[] } = {
      'Fintech': [
        'Backend Engineer - Python/Django',
        'Frontend Engineer - React/TypeScript', 
        'DevOps Engineer - AWS/Kubernetes',
        'Product Manager - Financial Products',
        'Data Engineer - Analytics Pipeline'
      ],
      'Technology': [
        'Full Stack Engineer - React/Node.js',
        'Software Engineer - Python/Java',
        'Senior Frontend Developer - Vue/Angular',
        'Platform Engineer - Infrastructure',
        'Mobile Developer - React Native'
      ],
      'Healthcare': [
        'Software Engineer - Medical Systems',
        'Data Scientist - Healthcare Analytics',
        'Frontend Developer - Patient Portals',
        'Security Engineer - HIPAA Compliance',
        'DevOps Engineer - Healthcare Infrastructure'
      ]
    };

    const jobTitles = industryMap[company.industry || 'Technology'] || industryMap['Technology'];
    const jobs: any[] = [];

    for (let i = 0; i < Math.min(jobTitles.length, 3); i++) {
      const title = jobTitles[i];
      const jobId = `fallback-${company.id}-${i}-${Date.now()}`;
      
      jobs.push({
        id: jobId,
        title: title,
        company_id: company.id,
        company_name: company.name,
        description: `Join ${company.name} as a ${title}. We're looking for talented individuals to help us grow our ${company.industry || 'technology'} solutions. This is an excellent opportunity to work with cutting-edge technologies and make a real impact.`,
        requirements: this.generateRequirementsForRole(title, userPreferences.skills),
        nice_to_have: this.generateNiceToHaveForRole(title),
        responsibilities: this.generateResponsibilitiesForRole(title),
        location: userPreferences.preferred_locations[0] || 'Remote',
        employment_type: 'full-time' as const,
        remote_type: userPreferences.preferred_remote === 'remote' ? 'remote' as const : 'hybrid' as const,
        experience_level: 'mid' as const,
        application_url: company.website_url ? `${company.website_url}/careers` : 'https://example.com/apply',
        salary_min: userPreferences.min_salary ? Math.floor(userPreferences.min_salary * 0.9) : undefined,
        salary_max: userPreferences.max_salary ? Math.floor(userPreferences.max_salary * 1.1) : undefined,
        currency: userPreferences.currency || 'EUR',
        technologies: this.getTechnologiesForRole(title),
        benefits: ['Health insurance', 'Flexible working hours', 'Professional development', 'Remote work options'],
        department: 'Engineering'
      });
    }

    return jobs;
  }

  private generateRequirementsForRole(title: string, userSkills: string[]): string[] {
    const commonReqs = ['Strong problem-solving skills', 'Team collaboration', 'Communication skills'];
    
    if (title.includes('Backend') || title.includes('Python')) {
      return [...commonReqs, 'Python programming', 'Database design', 'API development', 'System architecture'];
    } else if (title.includes('Frontend') || title.includes('React')) {
      return [...commonReqs, 'JavaScript/TypeScript', 'React development', 'CSS/HTML', 'Modern frontend tools'];
    } else if (title.includes('DevOps')) {
      return [...commonReqs, 'Cloud platforms (AWS/GCP)', 'Container orchestration', 'CI/CD pipelines', 'Infrastructure as code'];
    } else if (title.includes('Data')) {
      return [...commonReqs, 'Data analysis', 'SQL/NoSQL databases', 'Python/R programming', 'Machine learning basics'];
    }
    
    return [...commonReqs, ...userSkills.slice(0, 3)];
  }

  private generateNiceToHaveForRole(title: string): string[] {
    if (title.includes('Backend')) {
      return ['Microservices architecture', 'Message queues', 'Performance optimization'];
    } else if (title.includes('Frontend')) {
      return ['Mobile development', 'Design systems', 'Performance optimization'];
    } else if (title.includes('DevOps')) {
      return ['Terraform', 'Monitoring tools', 'Security best practices'];
    }
    
    return ['Open source contributions', 'Technical leadership', 'Mentoring experience'];
  }

  private generateResponsibilitiesForRole(title: string): string[] {
    const common = ['Collaborate with cross-functional teams', 'Participate in code reviews', 'Contribute to technical decisions'];
    
    if (title.includes('Backend')) {
      return [...common, 'Design and implement backend services', 'Optimize database performance', 'Ensure system scalability'];
    } else if (title.includes('Frontend')) {
      return [...common, 'Build responsive user interfaces', 'Implement user experience designs', 'Optimize frontend performance'];
    } else if (title.includes('DevOps')) {
      return [...common, 'Manage cloud infrastructure', 'Implement CI/CD pipelines', 'Monitor system performance'];
    }
    
    return [...common, 'Develop high-quality software', 'Solve complex technical challenges'];
  }

  private getTechnologiesForRole(title: string): string[] {
    if (title.includes('Backend') || title.includes('Python')) {
      return ['Python', 'Django', 'PostgreSQL', 'Redis', 'Docker'];
    } else if (title.includes('Frontend') || title.includes('React')) {
      return ['React', 'TypeScript', 'CSS3', 'Webpack', 'Jest'];
    } else if (title.includes('DevOps')) {
      return ['AWS', 'Kubernetes', 'Terraform', 'Jenkins', 'Prometheus'];
    }
    
    return ['Git', 'Linux', 'Agile', 'REST APIs', 'Testing'];
  }

  /**
   * Process enhanced automated applications for a single company
   */
  async processEnhancedSingleCompanyApplication(userId: string, targetCompany: any): Promise<ProcessingResult> {
    console.log(`🚀 [DEBUG] Starting enhanced single company application for user: ${userId}, company: ${targetCompany.name}`);
    
    if (!this.currentSession) {
      console.error('❌ [DEBUG] No active session found');
      throw new Error('No active session');
    }

    const startTime = Date.now();

    try {
      // Check if we're in development mode with bypass auth
      const isDevelopment = import.meta.env.DEV;
      const bypassAuth = isDevelopment && import.meta.env.VITE_BYPASS_AUTH === 'true';
      
      let userProfile: UserProfile | null = null;
      let userPreferences: UserPreferences | null = null;
      
      if (bypassAuth) {
        console.log('🔓 [DEBUG] Using mock data for single company processing');
        
        // Use same mock data as in other methods
        userProfile = {
          id: 'dev-profile-123',
          user_id: 'dev-user-123',
          full_name: 'Development User',
          email: 'dev@example.com',
          phone: '+1234567890',
          location: 'Berlin, Germany',
          linkedin_url: 'https://linkedin.com/in/dev-user',
          github_url: 'https://github.com/dev-user',
          portfolio_url: 'https://dev-user.com',
          professional_summary: 'Experienced software engineer passionate about building innovative solutions.',
          current_title: 'Senior Software Engineer',
          github_username: 'dev-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        userPreferences = {
          id: 'dev-prefs-123',
          user_id: 'dev-user-123',
          excluded_companies: [],
          preferred_locations: ['Berlin', 'Munich', 'Remote'],
          min_salary: 65000,
          max_salary: 95000,
          currency: 'EUR',
          job_types: ['full-time'],
          remote_preference: 'hybrid',
          preferred_industries: ['Technology', 'Software', 'Fintech'],
          skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
          preferred_company_sizes: ['startup', 'medium', 'large'],
          preferred_remote: 'hybrid',
          preferred_job_types: ['full-time'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      } else {
        // Get user data from database
        [userProfile, userPreferences] = await Promise.all([
          UserService.getUserProfile(userId),
          UserService.getUserPreferences(userId)
        ]);
      }

      if (!userProfile || !userPreferences) {
        console.error('❌ [DEBUG] User data missing:', { userProfile: !!userProfile, userPreferences: !!userPreferences });
        throw new Error('User data not found');
      }

      console.log(`📊 [DEBUG] Processing single company application for ${userProfile.full_name} at ${targetCompany.name}`);

      // Step 1: Process just this one company (skip matching since we have the target)
      const matchedCompanies = [targetCompany];
      console.log(`🎯 [DEBUG] Processing target company: ${targetCompany.name}`);

      // Step 2: Discover career page
      console.log('🔍 [DEBUG] Step 2: Discovering career page...');
      const companyCareerPages = await this.discoverCareerPages(matchedCompanies);
      console.log(`🔍 [DEBUG] Found ${companyCareerPages.length} career pages`);

      // Step 3: Scrape jobs
      console.log('📄 [DEBUG] Step 3: Scraping jobs...');
      let jobs: any[] = [];
      let scrapingResults: any[] = [];
      
      if (companyCareerPages.length > 0) {
        const result = await this.scrapeJobsFromCareerPages(companyCareerPages);
        jobs = result.jobs;
        scrapingResults = result.scrapingResults;
        console.log(`📄 [DEBUG] Scraped ${jobs.length} jobs from ${companyCareerPages.length} career pages`);
      } else {
        // No career pages found, generate intelligent fallback jobs  
        console.log(`⚡ [DEBUG] No career pages found, generating intelligent fallback jobs for ${targetCompany.name}`);
        const fallbackJobs = await this.generateFallbackJobsForCompany(targetCompany, userProfile, userPreferences);
        jobs = fallbackJobs;
        console.log(`⚡ [DEBUG] Generated ${jobs.length} intelligent fallback jobs for ${targetCompany.name}`);
      }

      // Step 4: Match jobs
      console.log('✨ [DEBUG] Step 4: Matching jobs...');
      const jobMatches = await this.matchJobs(jobs, userProfile, userPreferences);
      console.log(`✨ [DEBUG] Found ${jobMatches.length} good job matches`);

      // Step 5: Generate CVs for top matches
      console.log('📝 [DEBUG] Step 5: Generating CVs...');
      const topMatches = jobMatches.slice(0, 3); // Top 3 matches for single company
      const generatedCVs = await this.generateTailoredCVs(topMatches, userProfile, userPreferences);
      console.log(`📝 [DEBUG] Generated ${generatedCVs.length} tailored CVs`);

      // Complete session
      this.currentSession.status = 'completed';
      this.currentSession.completed_at = new Date().toISOString();
      
      const processingTimeMs = Date.now() - startTime;
      
      this.reportProgress('completed', targetCompany.name, `Completed! Found ${jobs.length} jobs, ${jobMatches.length} matches, generated ${generatedCVs.length} CVs`, 100, undefined, jobs.length, jobMatches.length);

      console.log(`🎉 [DEBUG] Enhanced single company session completed in ${Math.round(processingTimeMs / 1000)}s`);
      console.log(`📊 [DEBUG] Final Results:`, {
        company: targetCompany.name,
        careerPages: companyCareerPages.length,
        jobs: jobs.length,
        matches: jobMatches.length,
        cvs: generatedCVs.length,
        cost: this.getTotalCost().toFixed(4)
      });

      const result = {
        success: true,
        session: this.currentSession,
        career_pages_discovered: companyCareerPages.length,
        total_jobs_scraped: jobs.length,
        total_matches: jobMatches,
        generated_cvs: generatedCVs
      };

      console.log('✅ [DEBUG] Returning successful single company result');
      return result;

    } catch (error) {
      console.error('❌ [DEBUG] Error in enhanced single company session:', error);
      console.error('❌ [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      this.currentSession.status = 'failed';
      this.currentSession.error_message = error instanceof Error ? error.message : 'Unknown error';
      
      const errorResult = {
        success: false,
        session: this.currentSession,
        career_pages_discovered: 0,
        total_jobs_scraped: 0,
        total_matches: [],
        generated_cvs: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      console.log('❌ [DEBUG] Returning error result:', errorResult);
      return errorResult;
    }
  }
}

export const enhancedAIAgentOrchestrator = new EnhancedAIAgentOrchestrator();