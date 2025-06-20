/**
 * Secure Career Page Service
 * Frontend service that calls the secure backend API for career page discovery
 */

import { toast } from "sonner";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

export interface CompanyData {
  id: string;
  name: string;
  website_url?: string;
  industry?: string;
}

export interface CareerPageDiscoveryRequest {
  company_id: string;
  company_name: string;
  website_url?: string;
  industry?: string;
}

export interface UserProfileValidationRequest {
  user_id: string;
}

export interface WorkflowExecutionRequest {
  user_id: string;
  company_id: string;
  workflow_type?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface ProfileValidationResult {
  is_valid: boolean;
  missing_fields: string[];
  warnings: string[];
  recommendations: string[];
  completion_score: number;
}

export interface CareerPageResult {
  company_id: string;
  company_name: string;
  career_page_url?: string;
  confidence_score: number;
  validation_status: string;
  discovery_method: string;
  additional_urls: string[];
  cost_usd: number;
}

export interface WorkflowResult {
  workflow_id: string;
  user_id: string;
  company_id: string;
  career_page_url?: string;
  confidence_score: number;
  discovery_method: string;
  total_cost_usd: number;
  workflow_status: string;
  steps_completed: number;
  ready_for_job_scraping: boolean;
}

class SecureCareerPageService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BACKEND_URL;
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return {
        success: false,
        message: 'API request failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate user profile before starting job applications
   */
  async validateUserProfile(userId: string): Promise<{
    canProceed: boolean;
    validationResult: ProfileValidationResult;
    userPrompt: string;
  }> {
    const request: UserProfileValidationRequest = { user_id: userId };
    
    const response = await this.makeRequest<{
      validation_result: ProfileValidationResult;
      user_prompt: string;
      can_proceed: boolean;
      completion_score: number;
    }>('/api/validate-user-profile', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (response.success && response.data) {
      return {
        canProceed: response.data.can_proceed,
        validationResult: response.data.validation_result,
        userPrompt: response.data.user_prompt || ''
      };
    }

    // Return default failure state
    return {
      canProceed: false,
      validationResult: {
        is_valid: false,
        missing_fields: ['Profile validation failed'],
        warnings: [response.error || 'Unknown validation error'],
        recommendations: [],
        completion_score: 0
      },
      userPrompt: response.error || 'Profile validation failed'
    };
  }

  /**
   * Discover career page for a single company
   */
  async discoverCareerPage(company: CompanyData): Promise<CareerPageResult | null> {
    const request: CareerPageDiscoveryRequest = {
      company_id: company.id,
      company_name: company.name,
      website_url: company.website_url,
      industry: company.industry
    };

    const response = await this.makeRequest<CareerPageResult>('/api/discover-career-page', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (response.success && response.data) {
      return response.data as CareerPageResult;
    }

    // Show error to user
    toast.error('Career Page Discovery Failed', {
      description: response.error || 'Unable to discover career page'
    });

    return null;
  }

  /**
   * Execute complete career discovery workflow
   * This is the main method that validates profile and discovers career page
   */
  async executeCareerDiscoveryWorkflow(
    userId: string, 
    company: CompanyData
  ): Promise<WorkflowResult | null> {
    try {
      // Show initial progress
      toast.info('🚀 Starting Career Discovery Workflow', {
        description: `Analyzing ${company.name} and preparing job search...`
      });

      const request: WorkflowExecutionRequest = {
        user_id: userId,
        company_id: company.id,
        workflow_type: 'career_page_discovery_and_cv_generation'
      };

      const response = await this.makeRequest<WorkflowResult>('/api/execute-career-discovery-workflow', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (response.success && response.data) {
        const result = response.data;

        // Show success message
        if (result.career_page_url) {
          toast.success('✅ Career Page Discovered!', {
            description: `Found ${company.name}'s career page with ${Math.round(result.confidence_score * 100)}% confidence`,
            action: {
              label: "View Page",
              onClick: () => window.open(result.career_page_url, '_blank')
            }
          });
        } else {
          toast.warning('⚠️ No Career Page Found', {
            description: `Could not find a career page for ${company.name}`
          });
        }

        // Show cost information
        if (result.total_cost_usd > 0) {
          toast.info('💰 Workflow Cost', {
            description: `AI analysis cost: $${result.total_cost_usd.toFixed(4)}`
          });
        }

        return result;
      } else {
        // Handle workflow-specific errors
        if (response.error?.includes('profile is not ready')) {
          toast.error('⚠️ Profile Incomplete', {
            description: 'Please complete your profile before starting job applications',
            action: {
              label: "Go to Profile",
              onClick: () => window.location.href = '/profile'
            }
          });
        } else {
          toast.error('Workflow Failed', {
            description: response.error || 'Unknown workflow error'
          });
        }

        return null;
      }
    } catch (error) {
      console.error('Workflow execution error:', error);
      toast.error('Workflow Error', {
        description: 'An unexpected error occurred during workflow execution'
      });
      return null;
    }
  }

  /**
   * Bulk career page discovery for multiple companies
   */
  async discoverMultipleCareerPages(companies: CompanyData[]): Promise<{
    successful_discoveries: number;
    failed_discoveries: number;
    total_cost_usd: number;
    results: CareerPageResult[];
  } | null> {
    const request = {
      companies: companies.map(company => ({
        company_id: company.id,
        company_name: company.name,
        website_url: company.website_url,
        industry: company.industry
      }))
    };

    const response = await this.makeRequest<{
      successful_discoveries: number;
      failed_discoveries: number;
      total_cost_usd: number;
      results: CareerPageResult[];
    }>('/api/discover-career-pages-bulk', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (response.success && response.data) {
      const result = response.data;
      
      toast.success('📊 Bulk Discovery Complete', {
        description: `${result.successful_discoveries} successful, ${result.failed_discoveries} failed • Cost: $${result.total_cost_usd.toFixed(4)}`
      });

      return result;
    }

    toast.error('Bulk Discovery Failed', {
      description: response.error || 'Unable to complete bulk discovery'
    });

    return null;
  }

  /**
   * Get discovery statistics
   */
  async getDiscoveryStats(): Promise<any> {
    const response = await this.makeRequest('/api/discovery-stats');
    return response.data;
  }

  /**
   * Clear discovery cache
   */
  async clearDiscoveryCache(): Promise<boolean> {
    const response = await this.makeRequest('/api/clear-discovery-cache', {
      method: 'POST'
    });

    if (response.success) {
      toast.success('Cache Cleared', {
        description: 'Career page discovery cache has been cleared'
      });
      return true;
    }

    toast.error('Failed to Clear Cache', {
      description: response.error || 'Unknown error'
    });
    return false;
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<any> {
    const response = await this.makeRequest(`/api/workflow-status/${workflowId}`);
    return response.data;
  }

  /**
   * Check backend health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/health');
      return response.success;
    } catch {
      return false;
    }
  }
}

export const secureCareerPageService = new SecureCareerPageService();