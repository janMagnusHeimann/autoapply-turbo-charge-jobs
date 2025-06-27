/**
 * Gemini Job Discovery Service - Frontend integration for Gemini-powered job search
 */

export interface UserPreferences {
  // Professional profile
  skills: string[];
  experience_years: number;
  experience_level: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  desired_roles: string[];
  
  // Location preferences
  locations: string[];
  job_types: ('remote' | 'hybrid' | 'onsite')[];
  willing_to_relocate: boolean;
  
  // Compensation
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  accepts_equity: boolean;
  
  // Work preferences
  company_sizes: ('startup' | 'scaleup' | 'enterprise' | 'small' | 'medium' | 'large')[];
  industries: string[];
  technologies_to_avoid: string[];
  
  // Matching weights
  skill_weight: number;
  location_weight: number;
  salary_weight: number;
  experience_weight: number;
  culture_weight: number;
}

export interface Company {
  name: string;
  website: string;
}

export interface JobListing {
  title: string;
  company: string;
  location: string;
  job_type?: 'remote' | 'hybrid' | 'onsite';
  department?: string;
  experience_level?: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  employment_type?: string;
  required_skills: string[];
  nice_to_have_skills: string[];
  experience_years_min?: number;
  experience_years_max?: number;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  equity_offered?: boolean;
  description?: string;
  application_url?: string;
  posted_date?: string;
  source?: string;
  benefits: string[];
  technologies: string[];
  discovered_at: string;
  updated_at: string;
}

export interface RankedJob {
  job: JobListing;
  match_score: number;
  skill_match_score: number;
  location_match_score: number;
  experience_match_score: number;
  salary_match_score: number;
  culture_match_score: number;
  match_explanation: string;
  missing_skills: string[];
  matching_skills: string[];
  recommendation: string;
  improvement_suggestions: string[];
  ranked_at: string;
  ranking_version: string;
}

export interface JobSearchResult {
  company: string;
  company_website?: string;
  search_timestamp: string;
  total_jobs_found: number;
  jobs_processed: number;
  top_matches: RankedJob[];
  search_queries_used: string[];
  sources_searched: string[];
  search_duration_seconds: number;
  average_match_score: number;
  jobs_above_threshold: number;
}

export interface JobSearchBatchResult {
  search_timestamp: string;
  user_preferences_summary: string;
  companies_searched: number;
  results_by_company: JobSearchResult[];
  total_jobs_found: number;
  top_matches_overall: RankedJob[];
  total_search_duration_seconds: number;
  successful_searches: number;
  failed_searches: number;
}

export interface APIResponse<T = any> {
  status: string;
  message?: string;
  data?: T;
  timestamp: string;
}

export class GeminiJobDiscoveryService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/gemini') {
    this.baseUrl = baseUrl;
  }

  /**
   * Search for jobs across multiple companies
   */
  async discoverJobs(
    companies: Company[],
    userPreferences: UserPreferences,
    topK: number = 5
  ): Promise<JobSearchBatchResult> {
    const response = await fetch(`${this.baseUrl}/search-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companies,
        user_preferences: userPreferences,
        top_k: topK,
        enable_caching: true
      })
    });

    if (!response.ok) {
      throw new Error(`Job search failed: ${response.statusText}`);
    }

    const apiResponse: APIResponse<JobSearchBatchResult> = await response.json();
    
    if (apiResponse.status !== 'success' || !apiResponse.data) {
      throw new Error(apiResponse.message || 'Job search failed');
    }

    return apiResponse.data;
  }

  /**
   * Search for jobs at a single company
   */
  async searchSingleCompany(
    companyName: string,
    companyWebsite: string,
    userPreferences: UserPreferences,
    topK: number = 10,
    useCache: boolean = true
  ): Promise<JobSearchResult> {
    const response = await fetch(`${this.baseUrl}/search-single-company`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        company: companyName,
        website: companyWebsite,
        user_preferences: userPreferences,
        top_k: topK,
        use_cache: useCache
      })
    });

    if (!response.ok) {
      throw new Error(`Single company search failed: ${response.statusText}`);
    }

    const apiResponse: APIResponse<JobSearchResult> = await response.json();
    
    if (apiResponse.status !== 'success' || !apiResponse.data) {
      throw new Error(apiResponse.message || 'Single company search failed');
    }

    return apiResponse.data;
  }

  /**
   * Analyze how well a specific job fits the user's profile
   */
  async analyzeJobFit(
    jobUrl: string,
    userPreferences: UserPreferences
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/analyze-job-fit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_url: jobUrl,
        user_preferences: userPreferences
      })
    });

    if (!response.ok) {
      throw new Error(`Job fit analysis failed: ${response.statusText}`);
    }

    const apiResponse: APIResponse = await response.json();
    
    if (apiResponse.status !== 'success' || !apiResponse.data) {
      throw new Error(apiResponse.message || 'Job fit analysis failed');
    }

    return apiResponse.data;
  }

  /**
   * Get personalized job recommendations
   */
  async getJobRecommendations(
    userPreferences: UserPreferences,
    targetCompanies?: string[],
    minMatchScore: number = 70,
    maxRecommendations: number = 20
  ): Promise<RankedJob[]> {
    const response = await fetch(`${this.baseUrl}/get-recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_preferences: userPreferences,
        target_companies: targetCompanies,
        min_match_score: minMatchScore,
        max_recommendations: maxRecommendations
      })
    });

    if (!response.ok) {
      throw new Error(`Job recommendations failed: ${response.statusText}`);
    }

    const apiResponse: APIResponse = await response.json();
    
    if (apiResponse.status !== 'success' || !apiResponse.data) {
      throw new Error(apiResponse.message || 'Job recommendations failed');
    }

    return apiResponse.data.recommendations;
  }

  /**
   * Get service statistics
   */
  async getServiceStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/stats`);

    if (!response.ok) {
      throw new Error(`Failed to get service stats: ${response.statusText}`);
    }

    const apiResponse: APIResponse = await response.json();
    
    if (apiResponse.status !== 'success' || !apiResponse.data) {
      throw new Error(apiResponse.message || 'Failed to get service stats');
    }

    return apiResponse.data;
  }

  /**
   * Clear the search cache
   */
  async clearCache(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/clear-cache`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Failed to clear cache: ${response.statusText}`);
    }

    const apiResponse: APIResponse = await response.json();
    
    if (apiResponse.status !== 'success') {
      throw new Error(apiResponse.message || 'Failed to clear cache');
    }
  }

  /**
   * Get search history
   */
  async getSearchHistory(limit?: number): Promise<JobSearchResult[]> {
    const url = new URL(`${this.baseUrl}/search-history`, window.location.origin);
    if (limit) {
      url.searchParams.set('limit', limit.toString());
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to get search history: ${response.statusText}`);
    }

    const apiResponse: APIResponse = await response.json();
    
    if (apiResponse.status !== 'success' || !apiResponse.data) {
      throw new Error(apiResponse.message || 'Failed to get search history');
    }

    return apiResponse.data.history;
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    const apiResponse: APIResponse = await response.json();
    
    if (apiResponse.status !== 'success' || !apiResponse.data) {
      throw new Error(apiResponse.message || 'Health check failed');
    }

    return apiResponse.data;
  }

  /**
   * Create default user preferences
   */
  static createDefaultUserPreferences(): UserPreferences {
    return {
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
      experience_years: 5,
      experience_level: 'senior',
      desired_roles: ['Senior Software Engineer', 'Full Stack Developer'],
      locations: ['Berlin', 'Munich', 'Remote'],
      job_types: ['remote', 'hybrid'],
      willing_to_relocate: false,
      salary_min: 70000,
      salary_max: 95000,
      salary_currency: 'EUR',
      accepts_equity: true,
      company_sizes: ['startup', 'scaleup'],
      industries: [],
      technologies_to_avoid: [],
      skill_weight: 0.35,
      location_weight: 0.20,
      salary_weight: 0.25,
      experience_weight: 0.10,
      culture_weight: 0.10
    };
  }

  /**
   * Format job match score for display
   */
  static formatMatchScore(score: number): string {
    if (score >= 80) return `Excellent (${score.toFixed(0)}%)`;
    if (score >= 60) return `Good (${score.toFixed(0)}%)`;
    if (score >= 40) return `Fair (${score.toFixed(0)}%)`;
    return `Poor (${score.toFixed(0)}%)`;
  }

  /**
   * Get match score color for UI
   */
  static getMatchScoreColor(score: number): string {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#eab308'; // yellow
    if (score >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  }
}

// Export singleton instance
export const geminiJobDiscoveryService = new GeminiJobDiscoveryService();
