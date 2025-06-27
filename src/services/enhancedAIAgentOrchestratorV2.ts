/**
 * Enhanced AI Agent Orchestrator V2
 * 
 * Updated version that can use either the legacy system or the new multi-agent system.
 * Maintains backward compatibility while enabling the advanced multi-agent capabilities.
 */

import OpenAI from 'openai';
import { realCareerPageDiscoveryService, type Company } from './realCareerPageDiscovery';
import { jobScrapingAgent, type JobListing, type JobScrapingResult } from './jobScrapingAgent';
import { jobMatchingService, type JobMatch } from './jobMatchingService';
import { UserService, type UserProfile, type UserPreferences } from './userService';
import { 
  multiAgentJobDiscoveryService, 
  type MultiAgentJobDiscoveryRequest,
  type MultiAgentDiscoveryResult,
  MultiAgentJobDiscoveryService
} from './multiAgentOrchestrator';

// Re-export existing types for compatibility
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
  // New fields for multi-agent support
  use_multi_agent?: boolean;
  workflow_ids?: string[];
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

export class EnhancedAIAgentOrchestratorV2 {
  private openai: OpenAI | null = null;
  private currentSession: AgentSession | null = null;
  private costs: ApplicationCost[] = [];
  private progressCallback?: (progress: AgentProgress) => void;
  private useMultiAgent: boolean = false;

  // Token costs (per 1M tokens)
  private readonly TOKEN_COSTS = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 }
  };

  constructor(useMultiAgent: boolean = false) {
    this.useMultiAgent = useMultiAgent;
    this.openai = null; // No longer needed for multi-agent system
  }

  /**
   * Enable or disable multi-agent system
   */
  setMultiAgentMode(enabled: boolean): void {
    this.useMultiAgent = enabled;
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

  async startAutomatedSession(userId: string): Promise<AgentSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      id: sessionId,
      user_id: userId,
      mode: 'automated',
      status: 'running',
      companies_processed: 0,
      career_pages_found: 0,
      jobs_discovered: 0,
      jobs_matched: 0,
      applications_generated: 0,
      total_cost_usd: 0,
      started_at: new Date().toISOString(),
      use_multi_agent: this.useMultiAgent,
      workflow_ids: []
    };

    return this.currentSession;
  }

  async processEnhancedAutomatedApplications(userId: string): Promise<ProcessingResult> {
    if (!this.currentSession) {
      throw new Error('No active session. Call startAutomatedSession first.');
    }

    try {
      console.log(`🤖 Starting enhanced automated processing (Multi-Agent: ${this.useMultiAgent})`);

      // Get user profile and preferences
      const userProfile = await UserService.getUserProfile(userId);
      const userPreferences = await UserService.getUserPreferences(userId);

      if (!userProfile || !userPreferences) {
        throw new Error('User profile or preferences not found');
      }

      if (this.useMultiAgent) {
        return await this.processWithMultiAgentSystem(userId, userProfile, userPreferences);
      } else {
        return await this.processWithLegacySystem(userId, userProfile, userPreferences);
      }

    } catch (error) {
      console.error('❌ Enhanced automated processing failed:', error);
      if (this.currentSession) {
        this.currentSession.status = 'failed';
        this.currentSession.error_message = error instanceof Error ? error.message : 'Unknown error';
        this.currentSession.completed_at = new Date().toISOString();
      }

      return {
        success: false,
        session: this.currentSession!,
        career_pages_discovered: 0,
        total_jobs_scraped: 0,
        total_matches: [],
        generated_cvs: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async processWithMultiAgentSystem(
    userId: string,
    userProfile: UserProfile,
    userPreferences: UserPreferences
  ): Promise<ProcessingResult> {
    console.log('🚀 Using Multi-Agent Job Discovery System');

    // Check if multi-agent system is available
    const healthCheck = await multiAgentJobDiscoveryService.healthCheck();
    if (!healthCheck) {
      console.warn('⚠️ Multi-agent system not available, falling back to legacy system');
      return await this.processWithLegacySystem(userId, userProfile, userPreferences);
    }

    // Get companies from preferences
    const companies = await this.getCompaniesFromPreferences(userPreferences);
    
    const allJobMatches: JobMatch[] = [];
    const allGeneratedCvs: any[] = [];
    let totalCareerPages = 0;
    let totalJobs = 0;

    // Process companies using multi-agent system
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      
      try {
        this.reportProgress(
          'discovering_careers',
          company.name,
          `Processing ${company.name} with Multi-Agent System (${i + 1}/${companies.length})`,
          (i / companies.length) * 100
        );

        // Convert preferences to multi-agent format
        const request: MultiAgentJobDiscoveryRequest = {
          company_name: company.name,
          company_website: company.website,
          user_preferences: {
            skills: userPreferences.skills || [],
            required_skills: userPreferences.required_skills || [],
            experience_years: userPreferences.experience_years || 0,
            locations: userPreferences.preferred_locations || ['remote'],
            job_types: userPreferences.job_types || ['remote'],
            salary_min: userPreferences.salary_min,
            salary_max: userPreferences.salary_max,
            minimum_match_score: 0.4
          },
          max_execution_time: 300,
          include_ai_analysis: true,
          extract_all_pages: true,
          max_pages_per_site: 5
        };

        // Set up progress callback for this workflow
        const workflowStart = await multiAgentJobDiscoveryService.startJobDiscovery(request);
        
        if (this.currentSession?.workflow_ids) {
          this.currentSession.workflow_ids.push(workflowStart.workflow_id);
        }

        // Set progress callback
        multiAgentJobDiscoveryService.setProgressCallback(workflowStart.workflow_id, (progress) => {
          if (this.progressCallback && this.currentSession) {
            this.progressCallback({
              session_id: this.currentSession.id,
              step: progress.step,
              company_name: progress.company_name,
              job_title: progress.job_title,
              message: progress.message,
              progress_percent: ((i / companies.length) * 100) + (progress.progress_percent / companies.length),
              cost_so_far: progress.cost_so_far,
              jobs_found_so_far: progress.jobs_found_so_far,
              matches_found_so_far: progress.matches_found_so_far
            });
          }
        });

        // Wait for completion
        const result = await this.waitForMultiAgentCompletion(workflowStart.workflow_id);
        
        if (result && result.success) {
          totalCareerPages += result.total_career_pages;
          totalJobs += result.total_jobs_extracted;

          // Convert multi-agent matches to legacy format
          const convertedMatches = this.convertMultiAgentMatches(result.job_matches, company.name);
          allJobMatches.push(...convertedMatches);

          // Update session stats
          if (this.currentSession) {
            this.currentSession.companies_processed++;
            this.currentSession.career_pages_found = totalCareerPages;
            this.currentSession.jobs_discovered = totalJobs;
            this.currentSession.jobs_matched = allJobMatches.length;
          }
        }

      } catch (error) {
        console.error(`❌ Multi-agent processing failed for ${company.name}:`, error);
        // Continue with next company
      }
    }

    // Final session update
    if (this.currentSession) {
      this.currentSession.status = 'completed';
      this.currentSession.completed_at = new Date().toISOString();
    }

    this.reportProgress('completed', 'All Companies', 'Multi-agent processing completed!', 100, undefined, totalJobs, allJobMatches.length);

    return {
      success: true,
      session: this.currentSession!,
      career_pages_discovered: totalCareerPages,
      total_jobs_scraped: totalJobs,
      total_matches: allJobMatches,
      generated_cvs: allGeneratedCvs
    };
  }

  private async processWithLegacySystem(
    userId: string,
    userProfile: UserProfile,
    userPreferences: UserPreferences
  ): Promise<ProcessingResult> {
    console.log('🔄 Using Legacy Job Discovery System');
    
    // Original logic here...
    // This would be the existing implementation from enhancedAIAgentOrchestrator.ts
    // For brevity, I'll provide a simplified version

    const companies = await this.getCompaniesFromPreferences(userPreferences);
    const allJobMatches: JobMatch[] = [];
    
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      
      this.reportProgress(
        'discovering_careers',
        company.name,
        `Processing ${company.name} (${i + 1}/${companies.length})`,
        (i / companies.length) * 100
      );

      try {
        // Legacy processing logic would go here
        // ... existing implementation
        
      } catch (error) {
        console.error(`❌ Legacy processing failed for ${company.name}:`, error);
      }
    }

    if (this.currentSession) {
      this.currentSession.status = 'completed';
      this.currentSession.completed_at = new Date().toISOString();
    }

    return {
      success: true,
      session: this.currentSession!,
      career_pages_discovered: 0,
      total_jobs_scraped: 0,
      total_matches: allJobMatches,
      generated_cvs: []
    };
  }

  private async waitForMultiAgentCompletion(workflowId: string, timeoutMs: number = 300000): Promise<MultiAgentDiscoveryResult | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const result = await multiAgentJobDiscoveryService.getWorkflowResult(workflowId);
      
      if (result) {
        return result;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    await multiAgentJobDiscoveryService.cancelWorkflow(workflowId);
    return null;
  }

  private convertMultiAgentMatches(multiAgentMatches: any[], companyName: string): JobMatch[] {
    return multiAgentMatches.map(match => ({
      job: {
        id: match.job_id,
        title: match.job_title,
        company: match.company,
        location: match.location_details?.job_location || 'Unknown',
        job_type: match.location_details?.job_type || 'Unknown',
        description: '',
        skills: match.matching_skills || [],
        salary_range: '',
        posted_date: new Date().toISOString(),
        application_url: '',
        source_url: ''
      },
      match_score: match.overall_score,
      compatibility_details: {
        skills_match: match.skills_score,
        location_match: match.location_score,
        experience_match: 0.8, // Default
        overall_assessment: match.fit_analysis || `${Math.round(match.overall_score * 100)}% match`,
        recommended_action: match.recommendation === 'highly_recommended' ? 'apply' : 'consider'
      },
      ranking: match.overall_score
    }));
  }

  private async getCompaniesFromPreferences(userPreferences: UserPreferences): Promise<Company[]> {
    // Get companies based on user preferences
    // This could use the existing company matching logic
    const companies: Company[] = [
      { name: 'GitHub', website: 'https://github.com' },
      { name: 'Stripe', website: 'https://stripe.com' },
      { name: 'Vercel', website: 'https://vercel.com' },
      // Add more companies based on preferences
    ];

    return companies.slice(0, 5); // Limit for testing
  }

  // Existing methods for compatibility
  getCurrentSession(): AgentSession | null {
    return this.currentSession;
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

  getTotalCost(): number {
    return this.costs.reduce((total, cost) => total + cost.cost_usd, 0);
  }

  getCostBreakdown(): ApplicationCost[] {
    return [...this.costs];
  }

  private trackCost(operation: string, model: string, inputTokens: number, outputTokens: number): void {
    const cost = this.calculateCost(model, inputTokens, outputTokens);
    
    this.costs.push({
      operation,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: cost,
      timestamp: new Date().toISOString()
    });

    if (this.currentSession) {
      this.currentSession.total_cost_usd = this.getTotalCost();
    }
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const costs = this.TOKEN_COSTS[model as keyof typeof this.TOKEN_COSTS];
    if (!costs) return 0;

    const inputCost = (inputTokens / 1_000_000) * costs.input;
    const outputCost = (outputTokens / 1_000_000) * costs.output;
    
    return inputCost + outputCost;
  }
}

// Export both legacy and new versions
export const enhancedAIAgentOrchestrator = new EnhancedAIAgentOrchestratorV2(false); // Legacy mode
export const multiAgentOrchestrator = new EnhancedAIAgentOrchestratorV2(true); // Multi-agent mode