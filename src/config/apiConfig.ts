/**
 * API Configuration Service
 * Centralized configuration for all API endpoints and service URLs
 * Removes hardcoded URLs and provides environment-based configuration
 */

interface APIConfig {
  applicationAgent: {
    baseUrl: string;
    endpoints: {
      health: string;
      startApplication: string;
      getStatus: (applicationId: string) => string;
      uploadCV: string;
      listCVs: (userId: string) => string;
      getHistory: (userId: string) => string;
      cancelApplication: (applicationId: string) => string;
    };
  };
  cvApi: {
    baseUrl: string;
    endpoints: {
      health: string;
      process: string;
      extractPdfText: string;
      listBackups: (userId: string) => string;
      restoreBackup: string;
    };
  };
  jobDiscovery: {
    baseUrl: string;
    endpoints: {
      webSearch: string;
      githubOAuth: string;
      systemStatus: string;
    };
  };
}

class APIConfigService {
  private static instance: APIConfigService;
  private config: APIConfig;

  private constructor() {
    this.config = this.initializeConfig();
  }

  public static getInstance(): APIConfigService {
    if (!APIConfigService.instance) {
      APIConfigService.instance = new APIConfigService();
    }
    return APIConfigService.instance;
  }

  private initializeConfig(): APIConfig {
    // Environment-based configuration with secure defaults
    const isDevelopment = import.meta.env.DEV;
    const applicationAgentPort = import.meta.env.VITE_APPLICATION_AGENT_PORT || '8002';
    const cvApiPort = import.meta.env.VITE_CV_API_PORT || '8001';
    const jobDiscoveryPort = import.meta.env.VITE_JOB_DISCOVERY_PORT || '8000';
    
    // Base URLs - can be overridden via environment variables
    const applicationAgentBaseUrl = import.meta.env.VITE_APPLICATION_AGENT_URL || 
      (isDevelopment ? `http://localhost:${applicationAgentPort}` : '/api/application-agent');
    
    const cvApiBaseUrl = import.meta.env.VITE_CV_API_BASE_URL || 
      (isDevelopment ? `http://localhost:${cvApiPort}` : '/api/cv');
    
    const jobDiscoveryBaseUrl = import.meta.env.VITE_JOB_DISCOVERY_URL || 
      (isDevelopment ? `http://localhost:${jobDiscoveryPort}` : '/api/jobs');

    return {
      applicationAgent: {
        baseUrl: applicationAgentBaseUrl,
        endpoints: {
          health: '/health',
          startApplication: '/api/apply/start',
          getStatus: (applicationId: string) => `/api/apply/status/${applicationId}`,
          uploadCV: '/api/apply/cv/upload',
          listCVs: (userId: string) => `/api/apply/cv/list/${userId}`,
          getHistory: (userId: string) => `/api/apply/history/${userId}`,
          cancelApplication: (applicationId: string) => `/api/apply/cancel/${applicationId}`,
        },
      },
      cvApi: {
        baseUrl: cvApiBaseUrl,
        endpoints: {
          health: '/health',
          process: '/process',
          extractPdfText: '/extract-pdf-text',
          listBackups: (userId: string) => `/list-cv-backups/${userId}`,
          restoreBackup: '/restore-cv-backup',
        },
      },
      jobDiscovery: {
        baseUrl: jobDiscoveryBaseUrl,
        endpoints: {
          webSearch: '/api/web-search-job-discovery',
          githubOAuth: '/api/github-oauth/token',
          systemStatus: '/api/system/status',
        },
      },
    };
  }

  public getConfig(): APIConfig {
    return this.config;
  }

  // Helper methods for easy access to full URLs with proper formatting
  public getApplicationAgentUrl(endpoint: keyof APIConfig['applicationAgent']['endpoints'] | string): string {
    const config = this.config.applicationAgent;
    if (typeof endpoint === 'string' && endpoint in config.endpoints) {
      const endpointValue = config.endpoints[endpoint as keyof typeof config.endpoints];
      return `${config.baseUrl}${typeof endpointValue === 'function' ? endpointValue('') : endpointValue}`;
    }
    // Ensure proper URL formatting with leading slash for custom endpoints
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${config.baseUrl}${formattedEndpoint}`;
  }

  public getCVApiUrl(endpoint: keyof APIConfig['cvApi']['endpoints'] | string): string {
    const config = this.config.cvApi;
    if (typeof endpoint === 'string' && endpoint in config.endpoints) {
      const endpointValue = config.endpoints[endpoint as keyof typeof config.endpoints];
      return `${config.baseUrl}${typeof endpointValue === 'function' ? endpointValue('') : endpointValue}`;
    }
    // Ensure proper URL formatting with leading slash for custom endpoints
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${config.baseUrl}${formattedEndpoint}`;
  }

  public getJobDiscoveryUrl(endpoint: keyof APIConfig['jobDiscovery']['endpoints'] | string): string {
    const config = this.config.jobDiscovery;
    if (typeof endpoint === 'string' && endpoint in config.endpoints) {
      const endpointValue = config.endpoints[endpoint as keyof typeof config.endpoints];
      return `${config.baseUrl}${typeof endpointValue === 'function' ? endpointValue('') : endpointValue}`;
    }
    // Ensure proper URL formatting with leading slash for custom endpoints
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${config.baseUrl}${formattedEndpoint}`;
  }

  // Service health check methods
  public async checkApplicationAgentHealth(): Promise<boolean> {
    try {
      const response = await fetch(this.getApplicationAgentUrl('health'));
      return response.ok;
    } catch (error) {
      console.error('Application Agent health check failed:', error);
      return false;
    }
  }

  public async checkCVApiHealth(): Promise<boolean> {
    try {
      const response = await fetch(this.getCVApiUrl('health'));
      return response.ok;
    } catch (error) {
      console.error('CV API health check failed:', error);
      return false;
    }
  }

  public async checkJobDiscoveryHealth(): Promise<boolean> {
    try {
      const response = await fetch(this.getJobDiscoveryUrl('/health'));
      return response.ok;
    } catch (error) {
      console.error('Job Discovery API health check failed:', error);
      return false;
    }
  }

  // Get service status for debugging
  public async getServicesStatus(): Promise<{
    applicationAgent: boolean;
    cvApi: boolean;
    jobDiscovery: boolean;
  }> {
    const [applicationAgent, cvApi, jobDiscovery] = await Promise.all([
      this.checkApplicationAgentHealth(),
      this.checkCVApiHealth(),
      this.checkJobDiscoveryHealth(),
    ]);

    return {
      applicationAgent,
      cvApi,
      jobDiscovery,
    };
  }
}

// Export singleton instance
export const apiConfig = APIConfigService.getInstance();

// Export types for use in other files
export type { APIConfig };