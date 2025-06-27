/**
 * Multi-Agent System Configuration
 * 
 * Configuration for enabling and controlling the multi-agent job discovery system.
 */

export interface MultiAgentConfig {
  enabled: boolean;
  apiBaseUrl: string;
  fallbackToLegacy: boolean;
  timeoutMs: number;
  maxConcurrentWorkflows: number;
  retryAttempts: number;
}

// Environment-based configuration
const getMultiAgentConfig = (): MultiAgentConfig => {
  // Check if multi-agent system should be enabled
  const isEnabled = 
    process.env.REACT_APP_ENABLE_MULTI_AGENT === 'true' ||
    localStorage.getItem('enableMultiAgent') === 'true' ||
    false;

  const apiBaseUrl = 
    process.env.REACT_APP_MULTI_AGENT_API_URL ||
    'http://localhost:8000';

  return {
    enabled: isEnabled,
    apiBaseUrl,
    fallbackToLegacy: true, // Always fallback if multi-agent fails
    timeoutMs: 300000, // 5 minutes
    maxConcurrentWorkflows: 3,
    retryAttempts: 2
  };
};

export const MULTI_AGENT_CONFIG = getMultiAgentConfig();

/**
 * Feature flag for multi-agent system
 */
export const isMultiAgentEnabled = (): boolean => {
  return MULTI_AGENT_CONFIG.enabled;
};

/**
 * Enable multi-agent system (saves to localStorage)
 */
export const enableMultiAgent = (): void => {
  localStorage.setItem('enableMultiAgent', 'true');
  window.location.reload(); // Reload to apply changes
};

/**
 * Disable multi-agent system (saves to localStorage)
 */
export const disableMultiAgent = (): void => {
  localStorage.setItem('enableMultiAgent', 'false');
  window.location.reload(); // Reload to apply changes
};

/**
 * Health check for multi-agent system
 */
export const checkMultiAgentHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${MULTI_AGENT_CONFIG.apiBaseUrl}/health`, {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    console.warn('Multi-agent system health check failed:', error);
    return false;
  }
};

/**
 * Get multi-agent system status
 */
export const getMultiAgentStatus = async (): Promise<{
  available: boolean;
  healthy: boolean;
  status?: any;
}> => {
  try {
    const healthResponse = await fetch(`${MULTI_AGENT_CONFIG.apiBaseUrl}/health`);
    if (!healthResponse.ok) {
      return { available: false, healthy: false };
    }

    const statusResponse = await fetch(`${MULTI_AGENT_CONFIG.apiBaseUrl}/api/system-status`);
    const status = statusResponse.ok ? await statusResponse.json() : null;

    return {
      available: true,
      healthy: true,
      status
    };
  } catch (error) {
    console.warn('Failed to get multi-agent status:', error);
    return { available: false, healthy: false };
  }
};

export default MULTI_AGENT_CONFIG;