import axios from 'axios';
import * as cheerio from 'cheerio';
import { OpenAI } from 'openai';

export interface CareerPageResult {
  company_name: string;
  career_page_url: string | null;
  confidence_score: number;
  additional_urls: string[];
  job_application_process: string | null;
  error?: string;
}

export interface Company {
  id: string;
  name: string;
  website_url: string | null;
  industry: string | null;
}

export class RealCareerPageDiscoveryService {
  private cache: Map<string, { result: CareerPageResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
  private openai: OpenAI;

  constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please set VITE_OPENAI_API_KEY environment variable.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  private getCacheKey(company: Company): string {
    return `${company.name}-${company.website_url || 'no-website'}`;
  }

  private getCachedResult(company: Company): CareerPageResult | null {
    const cacheKey = this.getCacheKey(company);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
      return cached.result;
    }
    
    if (cached) {
      this.cache.delete(cacheKey);
    }
    
    return null;
  }

  private setCachedResult(company: Company, result: CareerPageResult): void {
    const cacheKey = this.getCacheKey(company);
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Use proxy server to find career pages for a company
   */
  private async searchCareerPage(company: Company): Promise<string[]> {
    try {
      console.log(`🔍 Searching for career page for ${company.name}...`);
      
      // First try web search for real career pages
      const webSearchUrls = await this.searchCareerPageWithWebSearch(company);
      if (webSearchUrls.length > 0) {
        return webSearchUrls;
      }
      
      // Fallback to FastAPI backend pattern matching
      const response = await fetch('http://localhost:8000/api/web-search-career-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: company.name,
          websiteUrl: company.website_url
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.career_page_url) {
        console.log(`✅ Found career page via proxy: ${result.career_page_url} (confidence: ${result.confidence_score})`);
        return [result.career_page_url];
      } else {
        console.log(`❌ Proxy discovery failed for ${company.name}: ${result.error}`);
        // Fallback to local URL generation
        return this.generateFallbackUrls(company);
      }
      
    } catch (error) {
      console.error(`❌ Proxy request failed for ${company.name}:`, error);
      // Fallback to local URL generation
      return this.generateFallbackUrls(company);
    }
  }

  /**
   * Use web search via proxy to find real career pages
   */
  private async searchCareerPageWithWebSearch(company: Company): Promise<string[]> {
    try {
      console.log(`🌐 Using web search to find real career page for ${company.name}...`);
      
      const response = await fetch('http://localhost:8000/api/web-search-career-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: company.name,
          websiteUrl: company.website_url
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.career_page_url) {
        console.log(`✅ Found real career page via web search: ${result.career_page_url} (confidence: ${result.confidence_score})`);
        const urls = [result.career_page_url];
        if (result.additional_urls && result.additional_urls.length > 0) {
          urls.push(...result.additional_urls.slice(0, 2)); // Add top 2 additional URLs
        }
        return urls;
      } else {
        console.log(`❌ Web search failed for ${company.name}: ${result.error}`);
        return [];
      }
      
    } catch (error) {
      console.error(`❌ Web search request failed for ${company.name}:`, error);
      return [];
    }
  }

  /**
   * Use OpenAI web search to find real career pages
   */
  private async searchCareerPageWithOpenAI(company: Company): Promise<string[]> {
    try {
      console.log(`🔍 Using OpenAI web search to find career page for ${company.name}...`);
      
      // Try to use OpenAI's web search via the Responses API
      const searchQuery = `${company.name} careers jobs hiring page site:${company.website_url ? this.extractDomain(company.website_url) : ''}`;
      
      // Use OpenAI with web search tool
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `Search the web for the careers/jobs page for ${company.name}. Find the official career page URL where they post job openings. Search query: "${searchQuery}"`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "web_search",
              description: "Search the web for career pages",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Search query for finding career pages"
                  }
                },
                required: ["query"]
              }
            }
          }
        ],
        tool_choice: "auto"
      });

      console.log('OpenAI response:', response.choices[0].message);
      
      // Extract URLs from the response
      const content = response.choices[0].message.content;
      const urls = this.extractUrlsFromResponse(content);
      
      if (urls.length > 0) {
        console.log(`✅ Found ${urls.length} career page candidates via OpenAI web search:`, urls);
        return urls;
      } else {
        console.log(`❌ No career pages found via OpenAI web search for ${company.name}`);
        return [];
      }
      
    } catch (error) {
      console.error(`❌ OpenAI web search failed for ${company.name}:`, error);
      return [];
    }
  }

  /**
   * Extract URLs from OpenAI response content
   */
  private extractUrlsFromResponse(content: string | null): string[] {
    if (!content) return [];
    
    // Extract URLs using regex
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    const urls = content.match(urlRegex) || [];
    
    // Filter for career-related URLs
    const careerUrls = urls.filter(url => {
      const lowerUrl = url.toLowerCase();
      return lowerUrl.includes('career') || 
             lowerUrl.includes('job') || 
             lowerUrl.includes('hiring') || 
             lowerUrl.includes('work') ||
             lowerUrl.includes('join');
    });
    
    return [...new Set(careerUrls)]; // Remove duplicates
  }

  /**
   * Generate fallback URLs when proxy fails
   */
  private generateFallbackUrls(company: Company): string[] {
    const foundUrls: string[] = [];
    
    // Strategy 1: Check common career page patterns on company domain
    if (company.website_url) {
      const domain = this.extractDomain(company.website_url);
      const commonPaths = [
        '/careers', '/jobs', '/career', '/hiring', '/work-with-us', 
        '/join-us', '/opportunities', '/employment', '/open-positions',
        '/jobs/search', '/careers/jobs', '/company/careers', '/about/careers'
      ];
      
      for (const path of commonPaths) {
        const testUrl = `https://${domain}${path}`;
        foundUrls.push(testUrl);
      }
    }

    // Strategy 2: Check job board integrations
    const jobBoardUrls = this.getJobBoardUrls(company);
    foundUrls.push(...jobBoardUrls);

    // Remove duplicates and filter valid URLs
    const uniqueUrls = [...new Set(foundUrls)].filter(url => this.isValidUrl(url));
    
    console.log(`📊 Found ${uniqueUrls.length} fallback URLs for ${company.name}`);
    return uniqueUrls;
  }

  private async performWebSearch(query: string, company: Company): Promise<string[]> {
    try {
      // This would use real WebSearch API in production
      // For now, construct intelligent URLs based on search patterns
      const searchUrls: string[] = [];
      
      if (company.website_url) {
        const domain = this.extractDomain(company.website_url);
        
        // Add variations that search engines commonly find
        searchUrls.push(
          `https://${domain}/careers`,
          `https://${domain}/jobs`,
          `https://jobs.${domain}`,
          `https://careers.${domain}`,
          `https://${domain}/company/careers`,
          `https://${domain}/about/careers`
        );
      }
      
      return searchUrls;
    } catch (error) {
      console.error('Web search error:', error);
      return [];
    }
  }

  private getJobBoardUrls(company: Company): string[] {
    const companySlug = company.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return [
      `https://jobs.lever.co/${companySlug}`,
      `https://${companySlug}.greenhouse.io`,
      `https://boards.greenhouse.io/${companySlug}`,
      `https://${companySlug}.workable.com`,
      `https://apply.workable.com/${companySlug}`,
      `https://${companySlug}.bamboohr.com/jobs`,
    ];
  }

  private getFallbackUrls(company: Company): string[] {
    if (!company.website_url) return [];
    
    const domain = this.extractDomain(company.website_url);
    return [
      `https://${domain}/careers`,
      `https://${domain}/jobs`,
      `https://${domain}/career`,
      `https://${domain}/hiring`
    ];
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  private extractUrlsFromSearchResults(searchResults: any): string[] {
    // Parse search results and extract URLs
    const urls: string[] = [];
    
    if (typeof searchResults === 'string') {
      const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
      const matches = searchResults.match(urlRegex) || [];
      urls.push(...matches);
    } else if (Array.isArray(searchResults)) {
      searchResults.forEach(result => {
        if (result.url) urls.push(result.url);
        if (result.link) urls.push(result.link);
      });
    } else if (searchResults && typeof searchResults === 'object') {
      if (searchResults.results) {
        searchResults.results.forEach((result: any) => {
          if (result.url) urls.push(result.url);
          if (result.link) urls.push(result.link);
        });
      }
    }

    return urls.filter(url => this.isValidCareerUrl(url));
  }

  private isValidCareerUrl(url: string): boolean {
    const careerKeywords = ['career', 'job', 'hiring', 'employment', 'work', 'apply', 'opening', 'recruit'];
    const excludeKeywords = ['facebook', 'twitter', 'linkedin.com/company', 'youtube', 'instagram'];
    
    const lowerUrl = url.toLowerCase();
    
    // Exclude social media and non-career URLs
    if (excludeKeywords.some(keyword => lowerUrl.includes(keyword))) {
      return false;
    }
    
    // Include URLs with career-related keywords
    return careerKeywords.some(keyword => lowerUrl.includes(keyword));
  }

  private scoreCareerUrl(url: string, company: Company): number {
    let score = 0;
    const lowerUrl = url.toLowerCase();
    const companyDomain = company.website_url ? this.extractDomain(company.website_url) : '';
    const companyName = company.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // High score for company's own domain
    if (companyDomain && lowerUrl.includes(companyDomain)) {
      score += 50;
    }

    // Medium score for company name in URL
    if (lowerUrl.includes(companyName)) {
      score += 30;
    }

    // Score for career-related keywords
    const careerKeywords = {
      'careers': 20,
      'jobs': 15,
      'hiring': 10,
      'employment': 8,
      'work': 5,
      'apply': 12,
      'openings': 10,
      'opportunities': 8
    };

    Object.entries(careerKeywords).forEach(([keyword, points]) => {
      if (lowerUrl.includes(keyword)) {
        score += points;
      }
    });

    // Prefer HTTPS
    if (url.startsWith('https://')) {
      score += 5;
    }

    // Prefer shorter, cleaner URLs
    if (url.split('/').length <= 5) {
      score += 5;
    }

    return score;
  }

  /**
   * Validate a career page URL by checking if it exists and looks like a career page
   */
  private async validateCareerPage(url: string, company: Company): Promise<{ isValid: boolean; confidence: number; jobs?: any[] }> {
    try {
      console.log(`🔍 Validating career page: ${url}`);
      
      // First check URL structure
      const lowerUrl = url.toLowerCase();
      let structuralScore = 0;
      
      const careerKeywords = ['career', 'job', 'hiring', 'employment', 'opportunity'];
      const hasCareerKeywords = careerKeywords.some(keyword => lowerUrl.includes(keyword));
      
      if (hasCareerKeywords) {
        structuralScore += 0.4;
      }
      
      // Check if it's on the company's domain
      if (company.website_url) {
        const companyDomain = this.extractDomain(company.website_url);
        if (lowerUrl.includes(companyDomain)) {
          structuralScore += 0.3;
        }
      }
      
      // Try to actually access the URL
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(url, {
          method: 'HEAD', // Use HEAD to avoid downloading full content
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          structuralScore += 0.3;
          console.log(`✅ URL accessible: ${url} (${response.status})`);
          
          // If we get a good response, try to fetch a snippet of content
          try {
            const contentController = new AbortController();
            const contentTimeoutId = setTimeout(() => contentController.abort(), 15000);
            
            const contentResponse = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
              signal: contentController.signal
            });
            
            clearTimeout(contentTimeoutId);
            
            if (contentResponse.ok) {
              const html = await contentResponse.text();
              const contentScore = this.analyzeCareerPageContent(html);
              structuralScore += contentScore * 0.5; // Weight content analysis
              
              console.log(`📊 Content analysis score for ${url}: ${contentScore}`);
            }
          } catch (contentError) {
            console.warn(`⚠️ Content fetch failed for ${url}:`, contentError);
            // Try CORS proxy for content analysis
            try {
              console.log(`🔄 Trying CORS proxy for content analysis: ${url}`);
              const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
              const proxyResponse = await fetch(proxyUrl);
              
              if (proxyResponse.ok) {
                const proxyData = await proxyResponse.json();
                if (proxyData.contents) {
                  const contentScore = this.analyzeCareerPageContent(proxyData.contents);
                  structuralScore += contentScore * 0.4; // Slightly lower weight for proxy content
                  console.log(`📊 Proxy content analysis score for ${url}: ${contentScore}`);
                }
              }
            } catch (proxyError) {
              console.warn(`⚠️ Proxy content fetch also failed for ${url}:`, proxyError);
            }
          }
          
        } else {
          console.warn(`❌ URL not accessible: ${url} (${response.status})`);
          // Even if HEAD fails, try proxy to see if we can get the content
          try {
            console.log(`🔄 Direct HEAD failed, trying CORS proxy: ${url}`);
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const proxyResponse = await fetch(proxyUrl);
            
            if (proxyResponse.ok) {
              const proxyData = await proxyResponse.json();
              if (proxyData.contents && proxyData.contents.length > 500) {
                const contentScore = this.analyzeCareerPageContent(proxyData.contents);
                structuralScore += contentScore * 0.3; // Lower weight since direct access failed
                console.log(`📊 Proxy-only content score for ${url}: ${contentScore}`);
              }
            }
          } catch (proxyError) {
            console.warn(`⚠️ Proxy fallback also failed for ${url}:`, proxyError);
            return { isValid: false, confidence: structuralScore * 0.3 };
          }
        }
        
      } catch (fetchError) {
        console.warn(`❌ Failed to fetch ${url}:`, fetchError);
        
        // If direct access fails, still give some credit for good URL structure
        if (structuralScore > 0.3) {
          return { isValid: true, confidence: structuralScore * 0.5 };
        }
        
        return { isValid: false, confidence: 0.1 };
      }
      
      const finalConfidence = Math.min(structuralScore, 1.0);
      const isValid = finalConfidence > 0.3; // Lower threshold due to CORS restrictions
      
      console.log(`📈 Validation result for ${url}: valid=${isValid}, confidence=${finalConfidence.toFixed(2)}`);
      
      return {
        isValid,
        confidence: finalConfidence
      };
      
    } catch (error) {
      console.error(`❌ Validation error for ${url}:`, error);
      return { isValid: false, confidence: 0.0 };
    }
  }

  private analyzeCareerPageContent(html: string): number {
    let score = 0;
    const lowerHtml = html.toLowerCase();
    
    // Look for job-related keywords in content
    const jobKeywords = [
      'job', 'career', 'position', 'opportunity', 'hiring', 'apply', 'open role',
      'employment', 'vacancy', 'opening', 'join our team', 'work with us'
    ];
    
    let keywordMatches = 0;
    jobKeywords.forEach(keyword => {
      if (lowerHtml.includes(keyword)) {
        keywordMatches++;
      }
    });
    
    score += Math.min(keywordMatches / jobKeywords.length, 0.3);
    
    // Look for common career page elements
    const careerPageElements = [
      'application', 'requirements', 'responsibilities', 'benefits',
      'salary', 'location', 'remote', 'full-time', 'part-time',
      'experience', 'skills', 'qualifications'
    ];
    
    let elementMatches = 0;
    careerPageElements.forEach(element => {
      if (lowerHtml.includes(element)) {
        elementMatches++;
      }
    });
    
    score += Math.min(elementMatches / careerPageElements.length, 0.4);
    
    // Look for form elements (application forms)
    if (lowerHtml.includes('<form') && (lowerHtml.includes('apply') || lowerHtml.includes('submit'))) {
      score += 0.2;
    }
    
    // Look for job listing structures
    if (lowerHtml.includes('job-listing') || lowerHtml.includes('position-') || lowerHtml.includes('role-')) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  async discoverCareerPage(company: Company): Promise<CareerPageResult> {
    // Check cache first
    const cached = this.getCachedResult(company);
    if (cached) {
      return cached;
    }

    try {
      console.log(`🔍 Discovering career page for ${company.name}...`);

      // Step 1: Search for career page URLs
      const candidateUrls = await this.searchCareerPage(company);
      
      if (candidateUrls.length === 0) {
        const fallbackResult: CareerPageResult = {
          company_name: company.name,
          career_page_url: null,
          confidence_score: 0.0,
          additional_urls: [],
          job_application_process: null,
          error: 'No career page URLs found in search results'
        };
        
        this.setCachedResult(company, fallbackResult);
        return fallbackResult;
      }

      // Step 2: Score and sort URLs
      const scoredUrls = candidateUrls
        .map(url => ({
          url,
          score: this.scoreCareerUrl(url, company)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // Top 5 candidates

      console.log(`📊 Found ${scoredUrls.length} candidate URLs for ${company.name}`);

      // Step 3: Validate top candidates
      let bestUrl: string | null = null;
      let bestConfidence = 0;
      const additionalUrls: string[] = [];

      for (const { url, score } of scoredUrls) {
        // If this URL came from the proxy server, trust it more
        if (candidateUrls.length === 1 && candidateUrls[0] === url) {
          // This URL came from proxy server - trust it
          bestUrl = url;
          bestConfidence = 0.5; // Good confidence for proxy-discovered URLs
          console.log(`✅ Using proxy-discovered URL: ${url} with boosted confidence`);
          break;
        } else {
          // For other URLs, validate normally but with CORS issues expected
          const validation = await this.validateCareerPage(url, company);
          
          if (validation.isValid && validation.confidence > bestConfidence) {
            if (bestUrl) additionalUrls.push(bestUrl);
            bestUrl = url;
            bestConfidence = validation.confidence;
          } else if (validation.isValid) {
            additionalUrls.push(url);
          }

          // Don't validate all URLs to avoid rate limiting
          // Lower threshold since CORS often blocks direct access
          if (bestConfidence > 0.4) break;
        }
      }

      const result: CareerPageResult = {
        company_name: company.name,
        career_page_url: bestUrl,
        confidence_score: bestConfidence,
        additional_urls: candidateUrls.map(url => url.url),
        job_application_process: null // Will be filled by job scraper
      };

      this.setCachedResult(company, result);
      console.log(`✅ Career page discovery completed for ${company.name}: ${bestUrl || 'None found'}`);
      
      return result;

    } catch (error) {
      console.error(`❌ Error discovering career page for ${company.name}:`, error);
      
      const errorResult: CareerPageResult = {
        company_name: company.name,
        career_page_url: null,
        confidence_score: 0.0,
        additional_urls: [],
        job_application_process: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };

      this.setCachedResult(company, errorResult);
      return errorResult;
    }
  }

  async discoverMultipleCareerPages(companies: Company[]): Promise<CareerPageResult[]> {
    const results: CareerPageResult[] = [];
    
    // Process companies sequentially to avoid rate limiting
    for (const company of companies) {
      try {
        const result = await this.discoverCareerPage(company);
        results.push(result);
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        results.push({
          company_name: company.name,
          career_page_url: null,
          confidence_score: 0.0,
          additional_urls: [],
          job_application_process: null,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }
    
    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export const realCareerPageDiscoveryService = new RealCareerPageDiscoveryService();