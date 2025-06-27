/**
 * Multi-Agent Job Discovery Service - Frontend Integration
 * 
 * This service integrates the new multi-agent system with the existing frontend,
 * maintaining the same interface while using the advanced agent architecture.
 */

export interface MultiAgentJobDiscoveryRequest {
  company_name: string;
  company_website: string;
  user_preferences: {
    skills: string[];
    required_skills: string[];
    experience_years: number;
    locations: string[];
    job_types: string[];
    salary_min?: number;
    salary_max?: number;
    minimum_match_score: number;
  };
  max_execution_time?: number;
  include_ai_analysis?: boolean;
  extract_all_pages?: boolean;
  max_pages_per_site?: number;
}

export interface MultiAgentWorkflowProgress {
  workflow_id: string;
  stage: string;
  progress_percentage: number;
  current_operation: string;
  errors_encountered: any[];
  stages_completed: string[];
}

export interface MultiAgentJobMatch {
  job_id: string;
  job_title: string;
  company: string;
  overall_score: number;
  recommendation: string;
  skills_score: number;
  location_score: number;
  salary_score: number;
  matching_skills: string[];
  missing_required_skills: string[];
  location_details: any;
  salary_analysis: any;
  fit_analysis?: string;
}

export interface MultiAgentDiscoveryResult {
  request_id: string;
  success: boolean;
  workflow_progress: MultiAgentWorkflowProgress;
  career_pages_found: any[];
  jobs_extracted: any[];
  job_matches: MultiAgentJobMatch[];
  total_career_pages: number;
  total_jobs_extracted: number;
  total_matches: number;
  execution_time: number;
  top_recommendations: any[];
  match_summary: any;
}

class MultiAgentJobDiscoveryService {
  private baseUrl: string;
  private activeWorkflows: Map<string, MultiAgentWorkflowProgress> = new Map();
  private progressCallbacks: Map<string, (progress: any) => void> = new Map();

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Start a job discovery workflow using the multi-agent system
   */
  async startJobDiscovery(request: MultiAgentJobDiscoveryRequest): Promise<{ workflow_id: string; status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/multi-agent-job-discovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Start polling for progress
      this.startProgressPolling(result.workflow_id);
      
      return result;
    } catch (error) {
      console.error('Failed to start job discovery:', error);
      throw error;
    }
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<MultiAgentWorkflowProgress | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/workflow-status/${workflowId}`);
      
      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      return result.found ? result.progress : null;
    } catch (error) {
      console.error('Failed to get workflow status:', error);
      return null;
    }
  }

  /**
   * Get workflow results
   */
  async getWorkflowResult(workflowId: string): Promise<MultiAgentDiscoveryResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/workflow-result/${workflowId}`);
      
      if (response.status === 202) {
        // Still running
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get workflow result:', error);
      throw error;
    }
  }

  /**
   * Cancel a workflow
   */
  async cancelWorkflow(workflowId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/cancel-workflow/${workflowId}`, {
        method: 'POST'
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to cancel workflow:', error);
      return false;
    }
  }

  /**
   * Set progress callback for a workflow
   */
  setProgressCallback(workflowId: string, callback: (progress: any) => void): void {
    this.progressCallbacks.set(workflowId, callback);
  }

  /**
   * Start polling for workflow progress
   */
  private startProgressPolling(workflowId: string): void {
    const pollInterval = setInterval(async () => {
      try {
        const progress = await this.getWorkflowStatus(workflowId);
        
        if (progress) {
          this.activeWorkflows.set(workflowId, progress);
          
          // Call progress callback if set
          const callback = this.progressCallbacks.get(workflowId);
          if (callback) {
            // Transform progress to match existing interface
            const transformedProgress = this.transformProgressToLegacyFormat(progress);
            callback(transformedProgress);
          }
          
          // Check if workflow is complete
          if (progress.stage === 'completed' || progress.stage === 'error') {
            clearInterval(pollInterval);
            this.activeWorkflows.delete(workflowId);
            this.progressCallbacks.delete(workflowId);
          }
        } else {
          // Workflow not found or completed, stop polling
          clearInterval(pollInterval);
          this.activeWorkflows.delete(workflowId);
          this.progressCallbacks.delete(workflowId);
        }
      } catch (error) {
        console.error('Progress polling error:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds
  }

  /**
   * Transform multi-agent progress to legacy format for compatibility
   */
  private transformProgressToLegacyFormat(progress: MultiAgentWorkflowProgress): any {
    // Map multi-agent stages to legacy steps
    const stageMapping: Record<string, string> = {
      'initialization': 'discovering_careers',
      'career_discovery': 'discovering_careers',
      'career_verification': 'discovering_careers',
      'job_extraction': 'scraping_jobs',
      'job_matching': 'matching_jobs',
      'result_compilation': 'generating_cvs',
      'completed': 'completed',
      'error': 'failed'
    };

    return {
      session_id: progress.workflow_id,
      step: stageMapping[progress.stage] || 'discovering_careers',
      company_name: this.extractCompanyFromOperation(progress.current_operation),
      message: progress.current_operation,
      progress_percent: progress.progress_percentage,
      cost_so_far: 0, // Multi-agent system doesn't track costs the same way
      jobs_found_so_far: 0, // Would need to parse from current_operation
      matches_found_so_far: 0
    };
  }

  private extractCompanyFromOperation(operation: string): string {
    // Extract company name from operation message
    const match = operation.match(/for (.+?)(?:\s|$)/);
    return match ? match[1] : 'Unknown Company';
  }

  /**
   * Convert user preferences from frontend format to multi-agent format
   */
  static convertUserPreferences(frontendPrefs: any): MultiAgentJobDiscoveryRequest['user_preferences'] {
    return {
      skills: frontendPrefs.skills || [],
      required_skills: frontendPrefs.required_skills || [],
      experience_years: frontendPrefs.experience_years || 0,
      locations: frontendPrefs.preferred_locations || ['remote'],
      job_types: frontendPrefs.job_types || ['remote'],
      salary_min: frontendPrefs.salary_min,
      salary_max: frontendPrefs.salary_max,
      minimum_match_score: 0.4
    };
  }

  /**
   * Compatibility method: Process companies using multi-agent system
   */
  async processCompaniesWithMultiAgent(
    userId: string, 
    companies: Array<{ name: string; website: string }>,
    userPreferences: any
  ): Promise<MultiAgentDiscoveryResult[]> {
    const results: MultiAgentDiscoveryResult[] = [];

    for (const company of companies) {
      try {
        const request: MultiAgentJobDiscoveryRequest = {
          company_name: company.name,
          company_website: company.website,
          user_preferences: MultiAgentJobDiscoveryService.convertUserPreferences(userPreferences),
          max_execution_time: 300, // 5 minutes
          include_ai_analysis: true,
          extract_all_pages: true,
          max_pages_per_site: 5
        };

        // Start workflow
        const startResult = await this.startJobDiscovery(request);
        
        // Wait for completion (with timeout)
        const result = await this.waitForWorkflowCompletion(startResult.workflow_id, 300000); // 5 min timeout
        
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Failed to process ${company.name}:`, error);
      }
    }

    return results;
  }

  /**
   * Wait for workflow completion
   */
  private async waitForWorkflowCompletion(workflowId: string, timeoutMs: number): Promise<MultiAgentDiscoveryResult | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.getWorkflowResult(workflowId);
      
      if (result) {
        return result;
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Timeout - cancel the workflow
    await this.cancelWorkflow(workflowId);
    return null;
  }

  /**
   * Health check for the multi-agent system
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Multi-agent system health check failed:', error);
      return false;
    }
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/system-status`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to get system status:', error);
      return null;
    }
  }
}

// Export singleton instance
export const multiAgentJobDiscoveryService = new MultiAgentJobDiscoveryService();

// Export types and service
export { MultiAgentJobDiscoveryService };
export type { 
  MultiAgentJobDiscoveryRequest, 
  MultiAgentWorkflowProgress, 
  MultiAgentJobMatch, 
  MultiAgentDiscoveryResult 
};