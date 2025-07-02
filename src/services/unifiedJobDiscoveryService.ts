/**
 * Unified Job Discovery Service
 * 
 * Integrates with the new multi-agent backend system while maintaining
 * compatibility with existing frontend patterns.
 */

export interface Company {
  id: string;
  name: string;
  website_url?: string;
}

export interface UserPreferences {
  skills?: string[];
  experience_years?: number;
  locations?: string[];
  job_types?: string[];
  salary_min?: number;
  salary_max?: number;
  preferred_industries?: string[];
  required_skills?: string[];
}

export interface JobListing {
  title: string;
  location: string;
  department?: string;
  job_type?: string;
  experience_level?: string;
  description: string;
  application_url: string;
  requirements?: string[];
  salary_range?: string;
  match_score?: number;
  match_reasoning?: string;
  matching_skills?: string[];
  location_details?: string;
}

export interface ProgressUpdate {
  session_id: string;
  progress_percentage: number;
  current_operation: string;
  stage: string;
  timestamp: string;
}

export interface JobDiscoveryResult {
  success: boolean;
  company_name: string;
  career_page_url?: string;
  total_jobs: number;
  jobs: JobListing[];
  matched_jobs: JobListing[];
  execution_time: number;
  extraction_method?: string;
  used_browser: boolean;
  agent_system_used: 'legacy' | 'new';
  workflow_progress?: any;
  error?: string;
}

export interface SystemStatus {
  status: string;
  new_agent_system_available: boolean;
  demo_mode: boolean;
  available_llm_providers: string[];
  browser_automation_enabled: boolean;
  active_sessions: number;
  timestamp: string;
}

class UnifiedJobDiscoveryService {
  private readonly API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  private readonly API_PREFIX = '/api';
  private progressCallbacks: Map<string, (progress: ProgressUpdate) => void> = new Map();
  private activePolling: Set<string> = new Set();

  /**
   * Get system status and capabilities
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const response = await fetch(`${this.API_BASE_URL}${this.API_PREFIX}/openai/health`);
      if (!response.ok) {
        throw new Error(`System status check failed: ${response.status}`);
      }
      
      const apiResponse = await response.json();
      
      if (apiResponse.status !== 'success' || !apiResponse.data) {
        throw new Error(apiResponse.message || 'Health check failed');
      }

      const healthData = apiResponse.data;
      
      // Convert OpenAI health check to system status format
      return {
        status: healthData.status === 'healthy' ? 'operational' : 'error',
        new_agent_system_available: true, // OpenAI system is available
        demo_mode: healthData.demo_mode || false,
        available_llm_providers: ['openai'],
        browser_automation_enabled: false, // OpenAI uses web search, not browser automation
        active_sessions: 0,
        timestamp: healthData.timestamp || new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get system status:', error);
      
      // Return fallback status
      return {
        status: 'error',
        new_agent_system_available: false,
        demo_mode: false,
        available_llm_providers: [],
        browser_automation_enabled: false,
        active_sessions: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute OpenAI-powered job discovery for a single company
   */
  async discoverJobsForCompany(
    company: Company,
    userPreferences?: UserPreferences,
    onProgress?: (progress: ProgressUpdate) => void
  ): Promise<JobDiscoveryResult> {
    try {
      console.log(`🚀 [UnifiedService] Starting OpenAI job discovery for ${company.name}`);
      console.log(`🔗 [UnifiedService] API_BASE_URL: ${this.API_BASE_URL}`);
      console.log(`🔗 [UnifiedService] API_PREFIX: ${this.API_PREFIX}`);
      console.log(`🔗 [UnifiedService] Full URL: ${this.API_BASE_URL}${this.API_PREFIX}/openai/search-single-company`);
      console.log('🔍 [UnifiedService] Raw userPreferences:', userPreferences);

      // Convert user preferences to OpenAI format
      const openaiUserPrefs = this.convertToOpenAIUserPreferences(userPreferences);
      console.log(`🔍 [UnifiedService] Converted user preferences:`, JSON.stringify(openaiUserPrefs, null, 2));

      // Start the discovery request using new web search endpoint
      const fullUrl = `${this.API_BASE_URL}/api/web-search-job-discovery`;
      console.log(`🚀 [UnifiedService] About to make web search request to: ${fullUrl}`);
      
      const requestBody = {
        company_id: company.name,
        company_website: company.website_url || `https://${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
        user_preferences: openaiUserPrefs,
        use_browser_automation: false  // We're using web search, not browser automation
      };
      console.log(`📤 [UnifiedService] Request body:`, JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`OpenAI job discovery failed: ${response.status} ${response.statusText}`);
      }

      const apiResponse = await response.json();
      
      if (apiResponse.status !== 'success') {
        throw new Error(apiResponse.error || 'Web search job discovery failed');
      }

      const webSearchResult = apiResponse;

      // Convert web search result to unified format
      const result: JobDiscoveryResult = {
        success: webSearchResult.total_jobs > 0,
        company_name: company.name,
        career_page_url: webSearchResult.career_page_url,
        total_jobs: webSearchResult.total_jobs,
        jobs: this.convertWebSearchJobsToUnified(webSearchResult.matched_jobs),
        matched_jobs: this.convertWebSearchJobsToUnified(webSearchResult.matched_jobs),
        execution_time: webSearchResult.execution_time,
        extraction_method: webSearchResult.extraction_method || 'web_search',
        used_browser: webSearchResult.used_browser || false,
        agent_system_used: webSearchResult.discovery_method || 'web_search_agent',
        workflow_progress: {
          queries_used: [],
          sources_searched: [],
          average_match_score: 0.7
        }
      };

      console.log(`✅ Web search job discovery completed for ${company.name}:`, {
        success: result.success,
        total_jobs: result.total_jobs,
        matched_jobs: result.matched_jobs.length,
        agent_system: result.agent_system_used,
        execution_time: result.execution_time
      });

      return result;

    } catch (error) {
      console.error(`❌ Web search job discovery failed for ${company.name}:`, error);
      
      // Return error result
      return {
        success: false,
        company_name: company.name,
        total_jobs: 0,
        jobs: [],
        matched_jobs: [],
        execution_time: 0,
        used_browser: false,
        agent_system_used: 'web_search_agent',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute job discovery for multiple companies in parallel
   */
  async discoverJobsForMultipleCompanies(
    companies: Company[],
    userPreferences?: UserPreferences,
    onProgress?: (companyName: string, progress: ProgressUpdate) => void,
    maxConcurrent: number = 3
  ): Promise<JobDiscoveryResult[]> {
    console.log(`🚀 Starting parallel job discovery for ${companies.length} companies`);

    // Process companies in batches to avoid overwhelming the system
    const results: JobDiscoveryResult[] = [];
    
    for (let i = 0; i < companies.length; i += maxConcurrent) {
      const batch = companies.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (company) => {
        try {
          return await this.discoverJobsForCompany(
            company,
            userPreferences,
            onProgress ? (progress) => onProgress(company.name, progress) : undefined
          );
        } catch (error) {
          console.error(`Job discovery failed for ${company.name}:`, error);
          return {
            success: false,
            company_name: company.name,
            total_jobs: 0,
            jobs: [],
            matched_jobs: [],
            execution_time: 0,
            used_browser: false,
            agent_system_used: 'legacy' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successfulResults = results.filter(r => r.success);
    const totalJobs = results.reduce((sum, r) => sum + r.total_jobs, 0);
    const totalMatches = results.reduce((sum, r) => sum + r.matched_jobs.length, 0);

    console.log(`✅ Parallel job discovery completed:`, {
      companies_processed: companies.length,
      successful: successfulResults.length,
      failed: companies.length - successfulResults.length,
      total_jobs: totalJobs,
      total_matches: totalMatches
    });

    return results;
  }

  /**
   * Find career page for a company
   */
  async findCareerPage(company: Company): Promise<{
    success: boolean;
    career_page_url: string;
    source: 'directory' | 'ai_discovery' | 'not_found';
    company_name: string;
  }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}${this.API_PREFIX}/find-career-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name: company.name,
          company_website: company.website_url
        })
      });

      if (!response.ok) {
        throw new Error(`Career page discovery failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Career page discovery failed for ${company.name}:`, error);
      throw error;
    }
  }

  /**
   * Verify if a career page URL is still valid
   */
  async verifyCareerPage(company: Company, careerPageUrl: string): Promise<{
    success: boolean;
    is_valid: boolean;
    confidence: number;
    reason: string;
    url: string;
    status_code?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}${this.API_PREFIX}/verify-career-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name: company.name,
          career_page_url: careerPageUrl
        })
      });

      if (!response.ok) {
        throw new Error(`Career page verification failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Career page verification failed for ${company.name}:`, error);
      throw error;
    }
  }

  /**
   * Enhanced job search with browser automation
   */
  async searchJobsWithBrowser(
    company: Company,
    careerPageUrl: string
  ): Promise<{
    success: boolean;
    jobs: JobListing[];
    total_jobs: number;
    extraction_method: string;
    used_browser: boolean;
    agent_system: string;
  }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}${this.API_PREFIX}/browser-use-job-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name: company.name,
          url: careerPageUrl
        })
      });

      if (!response.ok) {
        throw new Error(`Browser job search failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Browser job search failed for ${company.name}:`, error);
      throw error;
    }
  }

  /**
   * Advanced job matching based on user preferences
   */
  matchJobsToPreferences(
    jobs: JobListing[],
    preferences: UserPreferences
  ): JobListing[] {
    if (!preferences || jobs.length === 0) {
      return jobs;
    }

    return jobs
      .map(job => {
        let matchScore = 0;
        let matchingSkills: string[] = [];
        let matchReasons: string[] = [];

        // Skills matching
        if (preferences.skills && job.requirements) {
          const jobSkills = job.requirements.map(r => r.toLowerCase());
          const userSkills = preferences.skills.map(s => s.toLowerCase());
          
          matchingSkills = userSkills.filter(skill => 
            jobSkills.some(jobSkill => jobSkill.includes(skill) || skill.includes(jobSkill))
          );
          
          if (matchingSkills.length > 0) {
            matchScore += (matchingSkills.length / Math.max(userSkills.length, 1)) * 0.4;
            matchReasons.push(`${matchingSkills.length} matching skills`);
          }
        }

        // Location matching
        if (preferences.locations && job.location) {
          const jobLocation = job.location.toLowerCase();
          const locationMatch = preferences.locations.some(loc => 
            jobLocation.includes(loc.toLowerCase()) || 
            jobLocation.includes('remote') && loc.toLowerCase() === 'remote'
          );
          
          if (locationMatch) {
            matchScore += 0.3;
            matchReasons.push('Location match');
          }
        }

        // Job type matching
        if (preferences.job_types && job.job_type) {
          const jobType = job.job_type.toLowerCase();
          const typeMatch = preferences.job_types.some(type => 
            jobType.includes(type.toLowerCase())
          );
          
          if (typeMatch) {
            matchScore += 0.2;
            matchReasons.push('Job type match');
          }
        }

        // Experience level consideration
        if (preferences.experience_years && job.experience_level) {
          const level = job.experience_level.toLowerCase();
          let levelBonus = 0;
          
          if (preferences.experience_years >= 5 && level.includes('senior')) {
            levelBonus = 0.1;
          } else if (preferences.experience_years >= 2 && level.includes('mid')) {
            levelBonus = 0.1;
          } else if (preferences.experience_years < 2 && (level.includes('entry') || level.includes('junior'))) {
            levelBonus = 0.1;
          }
          
          matchScore += levelBonus;
          if (levelBonus > 0) {
            matchReasons.push('Experience level match');
          }
        }

        return {
          ...job,
          match_score: Math.min(matchScore, 1), // Cap at 1.0
          matching_skills: matchingSkills,
          match_reasoning: matchReasons.join(', ') || 'Basic compatibility'
        };
      })
      .filter(job => (job.match_score || 0) > 0.1) // Filter out very low matches
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0)); // Sort by match score
  }

  /**
   * Convert unified user preferences to OpenAI format
   */
  convertToOpenAIUserPreferences(userPreferences?: UserPreferences): any {
    if (!userPreferences) {
      return {
        skills: ['JavaScript', 'TypeScript', 'React'],
        experience_years: 3,
        experience_level: 'mid',
        desired_roles: ['Software Engineer', 'Developer'],
        locations: ['Remote'],
        job_types: ['remote'],
        willing_to_relocate: false,
        salary_min: 50000,
        salary_max: 80000,
        salary_currency: 'EUR',
        accepts_equity: true,
        company_sizes: ['startup'],
        industries: [],
        technologies_to_avoid: []
      };
    }

    return {
      skills: userPreferences.skills || ['JavaScript', 'TypeScript', 'React'],
      experience_years: userPreferences.experience_years || 3,
      experience_level: this.mapExperienceLevel(userPreferences.experience_years),
      desired_roles: ['Software Engineer', 'Developer', 'Frontend Developer', 'Backend Developer'],
      locations: userPreferences.locations || ['Remote'],
      job_types: this.mapJobTypes(userPreferences.job_types || ['remote']),
      willing_to_relocate: false,
      salary_min: userPreferences.salary_min || 50000,
      salary_max: userPreferences.salary_max || 100000,
      salary_currency: 'EUR',
      accepts_equity: true,
      company_sizes: ['startup'],
      industries: userPreferences.preferred_industries || [],
      technologies_to_avoid: []
    };
  }

  /**
   * Map experience years to experience level
   */
  mapExperienceLevel(years?: number): string {
    if (!years) return 'mid';
    if (years < 2) return 'entry';
    if (years < 5) return 'mid';
    if (years < 8) return 'senior';
    if (years < 12) return 'lead';
    return 'executive';
  }

  /**
   * Map job types from frontend format to backend enum values
   */
  mapJobTypes(jobTypes?: string[]): string[] {
    if (!jobTypes || jobTypes.length === 0) return ['remote'];
    
    return jobTypes.map(type => {
      const lowerType = type.toLowerCase();
      // Map common job type variations to backend enum values
      if (lowerType.includes('remote') || lowerType === 'full-time') {
        return 'remote';
      } else if (lowerType.includes('hybrid')) {
        return 'hybrid';
      } else if (lowerType.includes('onsite') || lowerType.includes('office')) {
        return 'onsite';
      } else {
        // Default fallback
        return 'remote';
      }
    });
  }

  /**
   * Convert OpenAI jobs to unified format
   */
  convertOpenAIJobsToUnified(openaiJobs: any[]): JobListing[] {
    if (!openaiJobs || !Array.isArray(openaiJobs)) {
      return [];
    }

    return openaiJobs.map(rankedJob => {
      const job = rankedJob.job || rankedJob;
      
      return {
        title: job.title || 'Software Engineer',
        location: job.location || 'Remote',
        department: job.department,
        job_type: job.job_type,
        experience_level: job.experience_level,
        description: job.description || '',
        application_url: job.application_url || '#',
        requirements: job.required_skills || [],
        salary_range: job.salary_min && job.salary_max 
          ? `${job.salary_currency || 'USD'} ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
          : undefined,
        match_score: rankedJob.match_score || 0.5,
        match_reasoning: rankedJob.match_explanation || 'Good match',
        matching_skills: rankedJob.matching_skills || [],
        location_details: job.location || 'Remote'
      };
    });
  }

  /**
   * Convert web search jobs to unified format
   */
  convertWebSearchJobsToUnified(webSearchJobs: any[]): JobListing[] {
    if (!webSearchJobs || !Array.isArray(webSearchJobs)) {
      return [];
    }

    return webSearchJobs.map(job => {
      return {
        title: job.title || 'Software Engineer',
        location: job.location || 'Remote',
        department: job.department,
        job_type: job.employment_type || job.job_type,
        experience_level: job.experience_level,
        description: job.description || job.snippet || '',
        application_url: job.application_url || job.url || '#',
        requirements: job.requirements || [],
        salary_range: job.salary_range || job.salary,
        match_score: job.match_score || 0.5,
        match_reasoning: job.reasoning || 'Good match based on web search',
        matching_skills: job.key_strengths || [],
        location_details: job.location || 'Remote'
      };
    });
  }

  /**
   * Convert user preferences from different formats to standard format
   */
  normalizeUserPreferences(userProfile: any, userPreferences: any): UserPreferences {
    return {
      skills: userPreferences?.skills || [],
      experience_years: userProfile?.years_of_experience || 0,
      locations: userPreferences?.locations || [],
      job_types: userPreferences?.job_types || ['full-time'],
      salary_min: userPreferences?.salary_min,
      salary_max: userPreferences?.salary_max,
      preferred_industries: userPreferences?.preferred_industries || [],
      required_skills: userPreferences?.required_skills || []
    };
  }

  /**
   * Enhanced automated process that maintains compatibility with existing frontend
   */
  async processAutomatedApplications(
    userId: string,
    userProfile: any,
    userPreferences: any,
    onProgress?: (update: any) => void
  ): Promise<{
    success: boolean;
    total_jobs_scraped: number;
    total_matches: JobListing[];
    generated_cvs: any[];
    companies_processed: Company[];
    results_by_company: Record<string, JobDiscoveryResult>;
    execution_time: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Starting unified automated applications process');

      // Get system status first
      const systemStatus = await this.getSystemStatus();
      console.log('System status:', systemStatus);

      // Define companies to process (you can make this configurable)
      const companies: Company[] = [
        { id: 'n26', name: 'N26', website_url: 'https://n26.com' },
        { id: 'spotify', name: 'Spotify', website_url: 'https://spotify.com' },
        { id: 'stripe', name: 'Stripe', website_url: 'https://stripe.com' },
        // Add more companies as needed
      ];

      // Normalize user preferences
      const normalizedPreferences = this.normalizeUserPreferences(userProfile, userPreferences);

      // Report initial progress
      onProgress?.({
        stage: 'discovering_careers',
        company: 'All',
        message: `Starting job discovery for ${companies.length} companies`,
        progress: 0.1,
        jobs_found: 0,
        current_operation: 'Initializing discovery process'
      });

      // Process companies in parallel
      const results = await this.discoverJobsForMultipleCompanies(
        companies,
        normalizedPreferences,
        (companyName, progress) => {
          onProgress?.({
            stage: 'discovering_careers',
            company: companyName,
            message: progress.current_operation,
            progress: 0.1 + (progress.progress_percentage / 100) * 0.6, // Scale to 10-70%
            jobs_found: 0,
            current_operation: progress.current_operation
          });
        }
      );

      // Aggregate results
      const allJobs: JobListing[] = [];
      const allMatches: JobListing[] = [];
      const resultsByCompany: Record<string, JobDiscoveryResult> = {};

      results.forEach(result => {
        resultsByCompany[result.company_name] = result;
        if (result.success) {
          allJobs.push(...result.jobs);
          allMatches.push(...result.matched_jobs);
        }
      });

      // Report job matching progress
      onProgress?.({
        stage: 'matching_jobs',
        company: 'All',
        message: `Analyzing ${allJobs.length} jobs for compatibility`,
        progress: 0.8,
        jobs_found: allJobs.length,
        current_operation: 'Matching jobs to preferences'
      });

      // Additional matching if backend didn't provide matches
      const finalMatches = allMatches.length > 0 
        ? allMatches 
        : this.matchJobsToPreferences(allJobs, normalizedPreferences);

      // Report completion
      onProgress?.({
        stage: 'completed',
        company: 'All',
        message: `Found ${allJobs.length} jobs, ${finalMatches.length} matches`,
        progress: 1.0,
        jobs_found: allJobs.length,
        current_operation: 'Process completed'
      });

      const executionTime = (Date.now() - startTime) / 1000;

      console.log('✅ Automated applications process completed:', {
        total_jobs: allJobs.length,
        total_matches: finalMatches.length,
        companies_processed: companies.length,
        successful_companies: results.filter(r => r.success).length,
        execution_time: executionTime
      });

      return {
        success: true,
        total_jobs_scraped: allJobs.length,
        total_matches: finalMatches,
        generated_cvs: [], // This would be handled by a separate CV generation service
        companies_processed: companies,
        results_by_company: resultsByCompany,
        execution_time: executionTime
      };

    } catch (error) {
      console.error('❌ Automated applications process failed:', error);
      
      const executionTime = (Date.now() - startTime) / 1000;
      
      return {
        success: false,
        total_jobs_scraped: 0,
        total_matches: [],
        generated_cvs: [],
        companies_processed: [],
        results_by_company: {},
        execution_time: executionTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a session-compatible interface for existing code
   */
  createCompatibilitySession(userId: string) {
    return {
      id: `unified_session_${Date.now()}`,
      user_id: userId,
      status: 'running',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const unifiedJobDiscoveryService = new UnifiedJobDiscoveryService();

// Export types for use in other components
export type {
  Company,
  UserPreferences,
  JobListing,
  ProgressUpdate,
  JobDiscoveryResult,
  SystemStatus
}; 