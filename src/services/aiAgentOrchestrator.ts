import OpenAI from 'openai';
import { careerPageDiscoveryService, type CareerPageResult, type Company } from './careerPageDiscovery';
import { UserService, type UserProfile, type UserPreferences } from './userService';

export interface JobListing {
  id: string;
  title: string;
  company_id: string;
  description: string;
  requirements: string[];
  location: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'internship';
  salary_min?: number;
  salary_max?: number;
  application_url: string;
  posted_date: string;
}

export interface JobMatch {
  job: JobListing;
  company: Company;
  match_score: number;
  match_reasons: string[];
}

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
  applications_submitted: number;
  total_cost_usd: number;
  started_at: string;
  completed_at?: string;
  current_company?: string;
  current_job?: string;
  error_message?: string;
}

export interface AgentProgress {
  session_id: string;
  step: 'matching' | 'discovering' | 'parsing' | 'generating' | 'applying' | 'completed';
  company_name: string;
  job_title?: string;
  message: string;
  progress_percent: number;
  cost_so_far: number;
}

export class AIAgentOrchestrator {
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
    // No longer need OpenAI client - using backend endpoints for security
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
    job_title?: string
  ) {
    if (this.progressCallback && this.currentSession) {
      this.progressCallback({
        session_id: this.currentSession.id,
        step,
        company_name,
        job_title,
        message,
        progress_percent,
        cost_so_far: this.getTotalCost()
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

  async matchCompaniesForUser(
    user: UserProfile,
    preferences: UserPreferences,
    availableCompanies: Company[]
  ): Promise<Company[]> {
    this.reportProgress('matching', 'System', 'Analyzing user preferences and matching companies...', 10);

    // Filter out excluded companies
    const eligibleCompanies = availableCompanies.filter(
      company => !preferences.excluded_companies.includes(company.id)
    );

    // Simple matching algorithm based on preferences
    const matchedCompanies = eligibleCompanies.filter(company => {
      // Match by industry preferences
      if (preferences.preferred_industries.length > 0) {
        return company.industry && preferences.preferred_industries.includes(company.industry);
      }
      return true;
    });

    // Limit to reasonable number for cost control
    const limitedCompanies = matchedCompanies.slice(0, 10);
    
    this.reportProgress('matching', 'System', `Found ${limitedCompanies.length} matching companies`, 20);
    
    return limitedCompanies;
  }

  async discoverJobsForCompany(company: Company): Promise<JobListing[]> {
    this.reportProgress('discovering', company.name, 'Discovering available jobs...', 30);

    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    // First get the career page
    const careerPageResult = await careerPageDiscoveryService.discoverCareerPage(company);
    
    if (!careerPageResult.career_page_url) {
      this.reportProgress('discovering', company.name, 'No career page found', 40);
      return [];
    }

    // Use OpenAI to parse job listings from the career page
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a job listing parser. Visit the career page and extract available job listings.

Return a JSON array of jobs with this structure:
{
  "jobs": [
    {
      "title": "Software Engineer",
      "description": "Brief job description",
      "requirements": ["requirement1", "requirement2"],
      "location": "City, Country",
      "employment_type": "full-time",
      "application_url": "https://...",
      "posted_date": "2025-01-08"
    }
  ]
}

Focus on technical roles and provide accurate application URLs.`
          },
          {
            role: 'user',
            content: `Parse job listings from ${company.name}'s career page: ${careerPageResult.career_page_url}`
          }
        ],
        temperature: 0.3
      });

      // Track API costs
      const usage = response.usage;
      if (usage) {
        this.trackCost('job_discovery', 'gpt-4o-mini', usage.prompt_tokens, usage.completion_tokens);
      }

      const content = response.choices[0]?.message?.content;
      if (!content) return [];

      // Parse JSON response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const jobs = parsed.jobs || [];
          
          // Convert to our JobListing format
          const jobListings: JobListing[] = jobs.map((job: any, index: number) => ({
            id: `${company.id}-job-${index}`,
            title: job.title,
            company_id: company.id,
            description: job.description,
            requirements: job.requirements || [],
            location: job.location,
            employment_type: job.employment_type || 'full-time',
            application_url: job.application_url,
            posted_date: job.posted_date || new Date().toISOString().split('T')[0]
          }));

          this.reportProgress('discovering', company.name, `Found ${jobListings.length} available jobs`, 50);
          return jobListings;
        }
      } catch (parseError) {
        console.warn('Failed to parse job listings:', parseError);
      }

      this.reportProgress('discovering', company.name, 'Could not parse job listings', 45);
      return [];

    } catch (error) {
      console.error('Error discovering jobs:', error);
      this.reportProgress('discovering', company.name, 'Error discovering jobs', 40);
      return [];
    }
  }

  async generateTailoredCV(
    user: UserProfile,
    preferences: UserPreferences,
    job: JobListing,
    company: Company
  ): Promise<string> {
    this.reportProgress('generating', company.name, `Generating tailored CV for ${job.title}`, 60, job.title);

    if (!this.openai) {
      throw new Error('OpenAI not configured');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert CV writer. Create a tailored CV that matches the job requirements while highlighting the candidate's relevant experience and skills.

Format the CV as clean, professional text that can be used in job applications.

Structure:
1. Professional Summary (2-3 lines)
2. Key Skills (relevant to the job)
3. Professional Experience
4. Education
5. Additional Relevant Information

Make it ATS-friendly and highlight keywords from the job description.`
          },
          {
            role: 'user',
            content: `Create a tailored CV for:

CANDIDATE PROFILE:
Name: ${user.full_name || 'Professional Candidate'}
Email: ${user.email}
Skills: ${preferences.skills.join(', ')}
Preferred Industries: ${preferences.preferred_industries.join(', ')}

JOB DETAILS:
Company: ${company.name}
Position: ${job.title}
Requirements: ${job.requirements.join(', ')}
Description: ${job.description}

Create a compelling CV that matches this specific role.`
          }
        ],
        temperature: 0.7
      });

      // Track API costs
      const usage = response.usage;
      if (usage) {
        this.trackCost('cv_generation', 'gpt-4o', usage.prompt_tokens, usage.completion_tokens);
      }

      const cvContent = response.choices[0]?.message?.content || '';
      this.reportProgress('generating', company.name, 'CV generated successfully', 70, job.title);
      
      return cvContent;

    } catch (error) {
      console.error('Error generating CV:', error);
      this.reportProgress('generating', company.name, 'Error generating CV', 65, job.title);
      throw error;
    }
  }

  async startAutomatedSession(userId: string): Promise<AgentSession> {
    // Get user profile and preferences
    const [userProfile, userPreferences] = await Promise.all([
      UserService.getUserProfile(userId),
      UserService.getUserPreferences(userId)
    ]);

    if (!userProfile || !userPreferences) {
      throw new Error('User profile or preferences not found');
    }

    // Create new session
    this.currentSession = {
      id: `session-${Date.now()}`,
      user_id: userId,
      mode: 'automated',
      status: 'running',
      companies_processed: 0,
      applications_submitted: 0,
      total_cost_usd: 0,
      started_at: new Date().toISOString()
    };

    this.costs = []; // Reset cost tracking

    this.reportProgress('matching', 'System', 'Starting automated job application agent...', 0);

    return this.currentSession;
  }

  async processAutomatedApplications(userId: string): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    try {
      // Get user data
      const [userProfile, userPreferences, companies] = await Promise.all([
        UserService.getUserProfile(userId),
        UserService.getUserPreferences(userId),
        this.getAllCompanies()
      ]);

      if (!userProfile || !userPreferences) {
        throw new Error('User data not found');
      }

      // Match companies
      const matchedCompanies = await this.matchCompaniesForUser(userProfile, userPreferences, companies);

      // Process each company
      for (let i = 0; i < matchedCompanies.length; i++) {
        const company = matchedCompanies[i];
        this.currentSession.current_company = company.name;

        try {
          // Discover jobs
          const jobs = await this.discoverJobsForCompany(company);
          
          // Apply to suitable jobs
          for (const job of jobs.slice(0, 2)) { // Limit to 2 jobs per company
            this.currentSession.current_job = job.title;
            
            // Generate tailored CV
            const cv = await this.generateTailoredCV(userProfile, userPreferences, job, company);
            
            // TODO: Implement actual application submission
            this.reportProgress('applying', company.name, `Applying to ${job.title}`, 80 + (i / matchedCompanies.length) * 15, job.title);
            
            // Simulate application submission delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.currentSession.applications_submitted++;
          }

          this.currentSession.companies_processed++;
          
        } catch (error) {
          console.error(`Error processing company ${company.name}:`, error);
          // Continue with next company
        }
      }

      // Complete session
      this.currentSession.status = 'completed';
      this.currentSession.completed_at = new Date().toISOString();
      
      this.reportProgress('completed', 'System', 'Automated application session completed', 100);

    } catch (error) {
      console.error('Error in automated session:', error);
      this.currentSession.status = 'failed';
      this.currentSession.error_message = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private async getAllCompanies(): Promise<Company[]> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching companies:', error);
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
}

export const aiAgentOrchestrator = new AIAgentOrchestrator();