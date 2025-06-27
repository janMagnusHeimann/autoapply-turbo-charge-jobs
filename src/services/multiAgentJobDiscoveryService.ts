/**
 * Multi-Agent Job Discovery Service
 * 
 * Implements the multi-agent workflow:
 * 1. Check if career page URL exists for company
 * 2. Use AI agent to find career page if missing  
 * 3. Use AI agent to verify existing URLs are still valid
 * 4. Use AI agent to scrape jobs matching user requirements
 */

export interface WorkflowStep {
  step: 'career_page_discovery' | 'career_page_verification' | 'job_scraping' | 'job_matching';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message: string;
}

export interface JobDiscoveryResult {
  company_name: string;
  steps: WorkflowStep[];
  career_page_url: string | null;
  jobs: JobListing[];
  total_jobs: number;
  success: boolean;
}

export interface JobListing {
  title: string;
  location: string;
  department: string;
  job_type: string;
  experience_level: string;
  description: string;
  application_url: string;
  requirements: string[];
  salary_range?: string;
}

export interface Company {
  id: string;
  name: string;
  website_url?: string;
}

export interface UserRequirements {
  preferred_locations?: string[];
  min_salary?: number;
  max_salary?: number;
  job_types?: string[];
  skills?: string[];
  experience_level?: string;
}

export class MultiAgentJobDiscoveryService {
  private readonly API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  /**
   * Execute the complete multi-agent workflow for a company
   */
  async discoverJobs(
    company: Company,
    userRequirements?: UserRequirements,
    onProgress?: (step: WorkflowStep) => void
  ): Promise<JobDiscoveryResult> {
    try {
      console.log(`🚀 Starting multi-agent job discovery for ${company.name}`);

      const response = await fetch(`${this.API_BASE_URL}/api/multi-agent-job-discovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: company.name,  // Use company name instead of UUID
          company_website: company.website_url,
          // user_id will be handled by the backend for now
        })
      });

      if (!response.ok) {
        throw new Error(`Multi-agent job discovery failed: ${response.status} ${response.statusText}`);
      }

      const result: JobDiscoveryResult = await response.json();

      // Call progress callback for each step if provided
      if (onProgress && result.steps) {
        result.steps.forEach(step => {
          onProgress(step);
        });
      }

      console.log(`✅ Multi-agent job discovery completed for ${company.name}:`, {
        career_page_found: !!result.career_page_url,
        jobs_found: result.total_jobs,
        success: result.success
      });

      return result;

    } catch (error) {
      console.error(`❌ Multi-agent job discovery failed for ${company.name}:`, error);
      throw error;
    }
  }

  /**
   * Find career page URL for a company using AI agent
   */
  async findCareerPage(company: Company): Promise<{
    success: boolean;
    career_page_url: string;
    source: 'directory' | 'ai_discovery';
    company_name: string;
  }> {
    try {
      console.log(`🔍 Finding career page for ${company.name}`);

      const response = await fetch(`${this.API_BASE_URL}/api/find-career-page`, {
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
        throw new Error(`Career page discovery failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Career page found for ${company.name}: ${result.career_page_url} (${result.source})`);

      return result;

    } catch (error) {
      console.error(`❌ Career page discovery failed for ${company.name}:`, error);
      throw error;
    }
  }

  /**
   * Verify if a career page URL is still valid using AI agent
   */
  async verifyCareerPage(company: Company, careerPageUrl: string): Promise<{
    success: boolean;
    is_valid: boolean;
    confidence: number;
    reason: string;
    url: string;
    status_code?: number;
    error?: string;
    suggested_action?: string;
  }> {
    try {
      console.log(`🔍 Verifying career page for ${company.name}: ${careerPageUrl}`);

      const response = await fetch(`${this.API_BASE_URL}/api/verify-career-page`, {
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
        throw new Error(`Career page verification failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Career page verification completed for ${company.name}:`, {
        is_valid: result.is_valid,
        confidence: result.confidence,
        reason: result.reason
      });

      return result;

    } catch (error) {
      console.error(`❌ Career page verification failed for ${company.name}:`, error);
      throw error;
    }
  }

  /**
   * Get human-readable step descriptions with browser automation support
   */
  getStepDescription(step: WorkflowStep): string {
    const stepDescriptions = {
      career_page_discovery: 'Finding career page URL',
      career_page_verification: 'Verifying career page URL',
      job_scraping: 'Scraping jobs from career page',
      job_matching: 'Analyzing job compatibility'
    };

    const statusEmojis = {
      pending: '⏳',
      in_progress: '🔄',
      completed: '✅',
      failed: '❌'
    };

    // Enhanced messages for browser automation
    let message = step.message;
    if (step.step === 'job_scraping') {
      if (message.includes('browser automation')) {
        message = message.replace('Scraping jobs', '🤖 Using browser automation to scrape jobs');
      } else if (message.includes('static')) {
        message = message.replace('Scraping jobs', '🌐 Using static scraping for jobs');
      }
    }

    return `${statusEmojis[step.status]} ${stepDescriptions[step.step]}: ${message}`;
  }

  /**
   * Filter jobs based on user requirements
   */
  filterJobsByRequirements(jobs: JobListing[], requirements: UserRequirements): JobListing[] {
    return jobs.filter(job => {
      // Location filter
      if (requirements.preferred_locations && requirements.preferred_locations.length > 0) {
        const matchesLocation = requirements.preferred_locations.some(location =>
          job.location.toLowerCase().includes(location.toLowerCase()) ||
          location.toLowerCase() === 'remote' && job.location.toLowerCase().includes('remote')
        );
        if (!matchesLocation) return false;
      }

      // Job type filter
      if (requirements.job_types && requirements.job_types.length > 0) {
        const matchesJobType = requirements.job_types.some(type =>
          job.job_type.toLowerCase().includes(type.toLowerCase())
        );
        if (!matchesJobType) return false;
      }

      // Experience level filter
      if (requirements.experience_level) {
        const jobLevel = job.experience_level.toLowerCase();
        const requiredLevel = requirements.experience_level.toLowerCase();
        
        // Simple level matching - could be enhanced with more sophisticated logic
        if (!jobLevel.includes(requiredLevel)) return false;
      }

      // Skills filter - check if job requirements mention user skills
      if (requirements.skills && requirements.skills.length > 0) {
        const jobText = (job.description + ' ' + job.requirements.join(' ')).toLowerCase();
        const hasMatchingSkills = requirements.skills.some(skill =>
          jobText.includes(skill.toLowerCase())
        );
        if (!hasMatchingSkills) return false;
      }

      return true;
    });
  }

  /**
   * Calculate job relevance score based on user requirements
   */
  calculateJobRelevance(job: JobListing, requirements: UserRequirements): number {
    let score = 0;
    let maxScore = 0;

    // Location match (weight: 0.2)
    maxScore += 0.2;
    if (requirements.preferred_locations && requirements.preferred_locations.length > 0) {
      const matchesLocation = requirements.preferred_locations.some(location =>
        job.location.toLowerCase().includes(location.toLowerCase()) ||
        location.toLowerCase() === 'remote' && job.location.toLowerCase().includes('remote')
      );
      if (matchesLocation) score += 0.2;
    }

    // Skills match (weight: 0.4)
    maxScore += 0.4;
    if (requirements.skills && requirements.skills.length > 0) {
      const jobText = (job.description + ' ' + job.requirements.join(' ')).toLowerCase();
      const matchingSkills = requirements.skills.filter(skill =>
        jobText.includes(skill.toLowerCase())
      );
      score += (matchingSkills.length / requirements.skills.length) * 0.4;
    }

    // Experience level match (weight: 0.2)
    maxScore += 0.2;
    if (requirements.experience_level) {
      const jobLevel = job.experience_level.toLowerCase();
      const requiredLevel = requirements.experience_level.toLowerCase();
      if (jobLevel.includes(requiredLevel)) score += 0.2;
    }

    // Job type match (weight: 0.2)
    maxScore += 0.2;
    if (requirements.job_types && requirements.job_types.length > 0) {
      const matchesJobType = requirements.job_types.some(type =>
        job.job_type.toLowerCase().includes(type.toLowerCase())
      );
      if (matchesJobType) score += 0.2;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }
}

export const multiAgentJobDiscoveryService = new MultiAgentJobDiscoveryService();