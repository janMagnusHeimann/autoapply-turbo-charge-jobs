/**
 * Utility functions for the job crawler
 */

import { ParsedJob } from '../types';

/**
 * Normalizes company names to prevent duplicates
 */
export function normalizeCompanyName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(Inc|LLC|Corp|Corporation|Ltd|Limited|Co|Company)\b\.?$/i, '')
    .trim();
}

/**
 * Extracts salary information from text
 */
export function extractSalary(text: string): { min?: number; max?: number; currency?: string } | undefined {
  // Match patterns like "$80k-$120k", "$80,000 - $120,000", "80k-120k USD"
  const salaryPatterns = [
    /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*k?\s*[-–]\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*k?\s*(USD|EUR|GBP)?/i,
    /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*k?\s*[-–]\s*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*k?/i,
    /(\d{1,3}(?:,\d{3})*)\s*k?\s*[-–]\s*(\d{1,3}(?:,\d{3})*)\s*k?\s*(USD|EUR|GBP)/i
  ];

  for (const pattern of salaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      let min = parseInt(match[1]?.replace(/,/g, '') || '0');
      let max = parseInt(match[2]?.replace(/,/g, '') || '0');
      const currency = match[3] || 'USD';

      // Handle 'k' suffix
      if (text.includes('k') || text.includes('K')) {
        if (min < 1000) min *= 1000;
        if (max < 1000) max *= 1000;
      }

      return { min, max, currency };
    }
  }

  return undefined;
}

/**
 * Extracts location information and converts to array
 */
export function parseLocation(locationText: string): string[] {
  if (!locationText) return [];
  
  return locationText
    .split(/[,;|]/)
    .map(loc => loc.trim())
    .filter(loc => loc.length > 0 && loc !== 'N/A' && loc !== 'TBD');
}

/**
 * Determines remote work type from text
 */
export function determineRemoteType(text: string): 'onsite' | 'remote' | 'hybrid' | undefined {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('remote') || lowerText.includes('work from home')) {
    if (lowerText.includes('hybrid') || lowerText.includes('flexible')) {
      return 'hybrid';
    }
    return 'remote';
  }
  
  if (lowerText.includes('onsite') || lowerText.includes('on-site') || lowerText.includes('office')) {
    return 'onsite';
  }
  
  return undefined;
}

/**
 * Extracts technology tags from job title and description
 */
export function extractTechTags(title: string, description?: string): string[] {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  const techKeywords = [
    'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c#',
    'react', 'vue', 'angular', 'node.js', 'express', 'nextjs', 'svelte',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
    'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
    'ml', 'ai', 'machine learning', 'artificial intelligence', 'data science',
    'devops', 'ci/cd', 'jenkins', 'github actions', 'gitlab',
    'frontend', 'backend', 'fullstack', 'full-stack'
  ];

  return techKeywords.filter(keyword => 
    text.includes(keyword) || text.includes(keyword.replace(/[.\s]/g, ''))
  );
}

/**
 * Validates if a URL is properly formatted
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cleans and standardizes job title
 */
export function normalizeJobTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-()]/g, '')
    .replace(/\b(jr|sr|senior|junior)\b/gi, match => match.toLowerCase());
}

/**
 * Generates a unique external ID from job data
 */
export function generateExternalId(job: ParsedJob, sourceRepo: string): string {
  const normalized = `${normalizeCompanyName(job.company)}-${normalizeJobTitle(job.title)}`.toLowerCase();
  return `${sourceRepo.split('/').pop()}-${normalized.replace(/\s+/g, '-')}`;
}

/**
 * Delays execution for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Logs with timestamp and level
 */
export function log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  console[level === 'debug' ? 'log' : level](logMessage, data ? JSON.stringify(data, null, 2) : '');
}

/**
 * Retries a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delayMs = baseDelay * Math.pow(2, attempt);
      log('warn', `Attempt ${attempt + 1} failed, retrying in ${delayMs}ms`, { error: lastError.message });
      await delay(delayMs);
    }
  }
  
  throw lastError!;
}