/**
 * Application Service - Interface to the Application Agent API
 * 
 * Handles communication with the automated job application system
 */

import { apiConfig } from '@/config/apiConfig';

interface StartApplicationRequest {
  user_id: string;
  job_id: string;
  cv_choice: 'generated' | 'uploaded';
  cv_id?: string;
  uploaded_cv_path?: string;
  cover_letter_prompt?: string;
  auto_submit?: boolean;
}

interface ApplicationStatus {
  application_id: string;
  status: string;
  progress_percentage: number;
  current_step: string;
  messages: string[];
  form_data?: any;
  error?: string;
}

interface ApplicationHistoryItem {
  id: string;
  job_id: string;
  cv_choice: string;
  status: string;
  progress_percentage: number;
  current_step: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
  auto_submit: boolean;
}

interface ApplicationHistory {
  applications: ApplicationHistoryItem[];
  total: number;
  success_rate: number;
  statistics: {
    successful: number;
    failed: number;
    pending: number;
    recent_count: number;
    average_success_rate: number;
  };
}

export class ApplicationService {
  private static get API_BASE(): string {
    return apiConfig.getConfig().applicationAgent.baseUrl;
  }

  /**
   * Start an automated job application process
   */
  static async startApplication(request: StartApplicationRequest): Promise<{
    success: boolean;
    application_id?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.API_BASE}${apiConfig.getConfig().applicationAgent.endpoints.startApplication}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          application_id: data.application_id,
        };
      } else {
        return {
          success: false,
          error: data.detail || 'Failed to start application',
        };
      }
    } catch (error) {
      console.error('Application start failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Get real-time status of an application process
   */
  static async getApplicationStatus(applicationId: string): Promise<ApplicationStatus | null> {
    try {
      const response = await fetch(`${this.API_BASE}${apiConfig.getConfig().applicationAgent.endpoints.getStatus(applicationId)}`);
      
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to get application status:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Application status fetch failed:', error);
      return null;
    }
  }

  /**
   * Upload a CV file for job applications
   */
  static async uploadCV(userId: string, file: File): Promise<{
    success: boolean;
    cv_id?: string;
    filename?: string;
    error?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('cv_file', file);
      formData.append('user_id', userId);

      const response = await fetch(`${this.API_BASE}${apiConfig.getConfig().applicationAgent.endpoints.uploadCV}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          cv_id: data.cv_id,
          filename: data.filename,
        };
      } else {
        return {
          success: false,
          error: data.detail || 'Failed to upload CV',
        };
      }
    } catch (error) {
      console.error('CV upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Get application history for a user
   */
  static async getApplicationHistory(userId: string): Promise<ApplicationHistory | null> {
    try {
      const response = await fetch(`${this.API_BASE}${apiConfig.getConfig().applicationAgent.endpoints.getHistory(userId)}`);
      
      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to get application history:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Application history fetch failed:', error);
      return null;
    }
  }

  /**
   * Cancel an ongoing application process
   */
  static async cancelApplication(applicationId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.API_BASE}${apiConfig.getConfig().applicationAgent.endpoints.cancelApplication(applicationId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return {
          success: false,
          error: data.detail || 'Failed to cancel application',
        };
      }
    } catch (error) {
      console.error('Application cancellation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Check if the Application Agent service is healthy
   */
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}${apiConfig.getConfig().applicationAgent.endpoints.health}`);
      return response.ok;
    } catch (error) {
      console.error('Application Agent health check failed:', error);
      return false;
    }
  }

  /**
   * Poll application status with callback for real-time updates
   */
  static startStatusPolling(
    applicationId: string,
    onUpdate: (status: ApplicationStatus) => void,
    onError: (error: string) => void,
    intervalMs: number = 2000
  ): () => void {
    const interval = setInterval(async () => {
      const status = await this.getApplicationStatus(applicationId);
      
      if (status) {
        onUpdate(status);
        
        // Stop polling if application is in terminal state
        if (['submitted', 'failed', 'cancelled'].includes(status.status)) {
          clearInterval(interval);
        }
      } else {
        onError('Failed to get application status');
        clearInterval(interval);
      }
    }, intervalMs);

    // Return cleanup function
    return () => clearInterval(interval);
  }

  /**
   * Estimate application completion time based on form complexity
   */
  static estimateCompletionTime(formComplexity: 'easy' | 'medium' | 'hard'): string {
    switch (formComplexity) {
      case 'easy':
        return '1-2 minutes';
      case 'medium':
        return '2-4 minutes';
      case 'hard':
        return '4-8 minutes';
      default:
        return '2-5 minutes';
    }
  }

  /**
   * Get application statistics for dashboard
   */
  static async getApplicationStats(userId: string): Promise<{
    total_applications: number;
    success_rate: number;
    recent_applications: number;
    average_completion_time: number;
  } | null> {
    try {
      const history = await this.getApplicationHistory(userId);
      
      if (!history) return null;

      return {
        total_applications: history.total,
        success_rate: history.success_rate,
        recent_applications: history.statistics.recent_count,
        average_completion_time: 0, // Would need to calculate from detailed data
      };
    } catch (error) {
      console.error('Failed to get application stats:', error);
      return null;
    }
  }
}