/**
 * CV Selection Service - Frontend interface for CV management
 * 
 * Handles CV selection, uploading, and listing for job applications
 */

import { apiConfig } from '@/config/apiConfig';

interface CVOption {
  id: string;
  type: 'generated' | 'uploaded';
  name: string;
  created_at: string;
  file_url?: string;
  status: string;
  job_id?: string;
}

export class CVSelectionService {
  private static get API_BASE(): string {
    return apiConfig.getConfig().applicationAgent.baseUrl;
  }

  /**
   * List all CVs (generated and uploaded) for a user
   */
  static async listUserCVs(userId: string): Promise<CVOption[]> {
    try {
      const response = await fetch(`${this.API_BASE}${apiConfig.getConfig().applicationAgent.endpoints.listCVs(userId)}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.cvs || [];
      } else {
        console.error('Failed to list user CVs:', response.status);
        return [];
      }
    } catch (error) {
      console.error('CV list fetch failed:', error);
      return [];
    }
  }

  /**
   * Upload a CV file
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
   * Validate CV file before upload
   */
  static validateCVFile(file: File): {
    valid: boolean;
    error?: string;
  } {
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size must be less than 10MB',
      };
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Only PDF and Word documents are allowed',
      };
    }

    return { valid: true };
  }

  /**
   * Get CV recommendations based on job requirements
   */
  static recommendCV(
    cvOptions: CVOption[],
    jobRequirements: string[]
  ): CVOption | null {
    if (cvOptions.length === 0) return null;

    // For now, return the most recent CV
    // In a production system, this would use AI to match CV content to job requirements
    return cvOptions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }

  /**
   * Format CV creation date for display
   */
  static formatCVDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Unknown date';
    }
  }

  /**
   * Get CV type display information
   */
  static getCVTypeInfo(type: 'generated' | 'uploaded'): {
    label: string;
    description: string;
    color: string;
    icon: string;
  } {
    switch (type) {
      case 'generated':
        return {
          label: 'AI Generated',
          description: 'Created by our AI system for specific job applications',
          color: 'blue',
          icon: 'bot',
        };
      case 'uploaded':
        return {
          label: 'Uploaded',
          description: 'Your original CV file',
          color: 'green',
          icon: 'upload',
        };
      default:
        return {
          label: 'Unknown',
          description: 'Unknown CV type',
          color: 'gray',
          icon: 'file',
        };
    }
  }

  /**
   * Check if CV is suitable for automated application
   */
  static isCVSuitableForAutomation(cv: CVOption): {
    suitable: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // Check if CV is ready
    if (cv.status !== 'ready') {
      reasons.push('CV is not ready for use');
    }

    // Check if file is accessible
    if (!cv.file_url) {
      reasons.push('CV file is not accessible');
    }

    // For uploaded CVs, check if they've been processed
    if (cv.type === 'uploaded') {
      // In a production system, you'd check if the CV has been parsed/processed
      // For now, assume uploaded CVs are suitable
    }

    return {
      suitable: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Get CV preview URL for display
   */
  static getCVPreviewUrl(cv: CVOption): string | null {
    if (!cv.file_url) return null;

    // For PDFs, append view parameter
    if (cv.file_url.includes('.pdf')) {
      return `${cv.file_url}#view=FitH`;
    }

    return cv.file_url;
  }

  /**
   * Download CV file
   */
  static async downloadCV(cv: CVOption): Promise<void> {
    if (!cv.file_url) {
      throw new Error('CV file URL not available');
    }

    try {
      const link = document.createElement('a');
      link.href = cv.file_url;
      link.download = cv.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('CV download failed:', error);
      throw new Error('Failed to download CV');
    }
  }

  /**
   * Get CV statistics for a user
   */
  static getCVStats(cvOptions: CVOption[]): {
    total: number;
    generated: number;
    uploaded: number;
    mostRecent: CVOption | null;
  } {
    const generated = cvOptions.filter(cv => cv.type === 'generated').length;
    const uploaded = cvOptions.filter(cv => cv.type === 'uploaded').length;
    
    const mostRecent = cvOptions.length > 0 
      ? cvOptions.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
      : null;

    return {
      total: cvOptions.length,
      generated,
      uploaded,
      mostRecent,
    };
  }
}