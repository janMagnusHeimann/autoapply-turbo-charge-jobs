import OpenAI from 'openai';

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

export class CareerPageDiscoveryService {
  private openai: OpenAI | null = null;
  private cache: Map<string, { result: CareerPageResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });
    }
  }

  private isOpenAIConfigured(): boolean {
    return this.openai !== null;
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

  private async performWebSearch(company: Company): Promise<CareerPageResult> {
    if (!this.openai) {
      throw new Error('OpenAI not configured. Please set VITE_OPENAI_API_KEY environment variable.');
    }

    const searchQuery = this.buildSearchQuery(company);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a career page discovery assistant. Your task is to find the careers/jobs page for companies and extract relevant information about their job application process.

Search the web for the company's career page and analyze the results. Look for:
1. The main careers/jobs page URL
2. Information about their job application process
3. Any additional relevant career-related URLs

Respond in JSON format with:
{
  "company_name": "Company Name",
  "career_page_url": "https://company.com/careers" or null,
  "confidence_score": 0.0-1.0,
  "additional_urls": ["url1", "url2"],
  "job_application_process": "Brief description of how to apply" or null
}

Be conservative with confidence scores. Only use scores above 0.8 if you're very certain about the URL.`
          },
          {
            role: "user",
            content: searchQuery
          }
        ],
        temperature: 0.3
      });

      const messageContent = response.choices[0]?.message?.content;
      if (!messageContent) {
        throw new Error('No response from OpenAI');
      }

      // Try to parse JSON response
      try {
        const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]) as CareerPageResult;
          return {
            company_name: company.name,
            career_page_url: result.career_page_url,
            confidence_score: Math.min(Math.max(result.confidence_score || 0, 0), 1),
            additional_urls: result.additional_urls || [],
            job_application_process: result.job_application_process
          };
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON response:', parseError);
      }

      // Fallback: extract URLs from text
      const urls = this.extractURLsFromText(messageContent);
      const careerUrl = this.findMostLikelyCareerURL(urls, company.name);

      return {
        company_name: company.name,
        career_page_url: careerUrl,
        confidence_score: careerUrl ? 0.6 : 0.0,
        additional_urls: urls.filter(url => url !== careerUrl),
        job_application_process: this.extractJobProcessInfo(messageContent)
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      return {
        company_name: company.name,
        career_page_url: null,
        confidence_score: 0.0,
        additional_urls: [],
        job_application_process: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private buildSearchQuery(company: Company): string {
    let query = `Find the careers page for ${company.name}`;
    
    if (company.website_url) {
      query += ` (website: ${company.website_url})`;
    }
    
    if (company.industry) {
      query += ` in the ${company.industry} industry`;
    }
    
    query += `. Look for their jobs/careers page URL and information about their hiring process.`;
    
    return query;
  }

  private extractURLsFromText(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
    const matches = text.match(urlRegex) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  private findMostLikelyCareerURL(urls: string[], companyName: string): string | null {
    const careerKeywords = ['career', 'job', 'hiring', 'employment', 'work', 'apply', 'opening'];
    
    // Score URLs based on career-related keywords and company name match
    const scoredUrls = urls.map(url => {
      let score = 0;
      const lowerUrl = url.toLowerCase();
      const lowerCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Boost score for career-related keywords
      careerKeywords.forEach(keyword => {
        if (lowerUrl.includes(keyword)) {
          score += 10;
        }
      });
      
      // Boost score if URL contains company name
      if (lowerUrl.includes(lowerCompany) || lowerUrl.includes(companyName.toLowerCase())) {
        score += 5;
      }
      
      // Prefer HTTPS
      if (url.startsWith('https://')) {
        score += 1;
      }
      
      return { url, score };
    });
    
    // Return the highest scoring URL, or null if no good matches
    const bestMatch = scoredUrls.reduce((best, current) => 
      current.score > best.score ? current : best, { url: null, score: 0 });
    
    return bestMatch.score > 5 ? bestMatch.url : null;
  }

  private extractJobProcessInfo(text: string): string | null {
    // Simple extraction of application process information
    const processKeywords = ['apply', 'application', 'process', 'submit', 'hiring'];
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (processKeywords.some(keyword => lowerSentence.includes(keyword))) {
        const cleaned = sentence.trim();
        if (cleaned.length > 20 && cleaned.length < 200) {
          return cleaned;
        }
      }
    }
    
    return null;
  }

  async discoverCareerPage(company: Company): Promise<CareerPageResult> {
    // Check cache first
    const cached = this.getCachedResult(company);
    if (cached) {
      return cached;
    }

    // Check if OpenAI is configured
    if (!this.isOpenAIConfigured()) {
      const fallbackResult: CareerPageResult = {
        company_name: company.name,
        career_page_url: company.website_url ? `${company.website_url}/careers` : null,
        confidence_score: 0.3,
        additional_urls: [],
        job_application_process: null,
        error: 'OpenAI API not configured. Using fallback URL generation.'
      };
      
      this.setCachedResult(company, fallbackResult);
      return fallbackResult;
    }

    // Perform web search
    const result = await this.performWebSearch(company);
    
    // Cache the result
    this.setCachedResult(company, result);
    
    return result;
  }

  async discoverMultipleCareerPages(companies: Company[]): Promise<CareerPageResult[]> {
    const results: CareerPageResult[] = [];
    
    // Process companies in batches to avoid rate limiting
    const batchSize = 3;
    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      
      const batchPromises = batch.map(company => 
        this.discoverCareerPage(company).catch(error => ({
          company_name: company.name,
          career_page_url: null,
          confidence_score: 0.0,
          additional_urls: [],
          job_application_process: null,
          error: error.message
        } as CareerPageResult))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < companies.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
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

export const careerPageDiscoveryService = new CareerPageDiscoveryService();