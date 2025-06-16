/**
 * Backend API endpoint for web scraping
 * This would typically be implemented in your backend service (Node.js/Express)
 * For demo purposes, this shows the structure needed
 */

import { JSDOM } from 'jsdom';

interface ScrapeRequest {
  url: string;
  headOnly?: boolean;
}

interface ScrapeResponse {
  success: boolean;
  html?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Scraping service that handles HTTP requests and CORS
 * This should be implemented on your backend server
 */
export class ScrapingAPIService {
  private userAgent = 'Mozilla/5.0 (compatible; JobBot/1.0; +https://yoursite.com/bot)';
  
  async scrapeURL(request: ScrapeRequest): Promise<ScrapeResponse> {
    try {
      // Validate URL
      const url = new URL(request.url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { 
          success: false, 
          error: 'Invalid URL protocol' 
        };
      }

      // Check robots.txt first
      const robotsAllowed = await this.checkRobotsTxt(url.origin);
      if (!robotsAllowed) {
        return {
          success: false,
          error: 'Scraping not allowed by robots.txt'
        };
      }

      // Make HTTP request with proper headers
      const response = await fetch(request.url, {
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status
        };
      }

      // For HEAD requests, just return success
      if (request.headOnly) {
        return { success: true, html: '' };
      }

      // Get HTML content
      const html = await response.text();
      
      // Basic sanitization
      const sanitizedHtml = this.sanitizeHTML(html);

      return {
        success: true,
        html: sanitizedHtml
      };

    } catch (error) {
      console.error('Scraping error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown scraping error'
      };
    }
  }

  /**
   * Check if scraping is allowed by robots.txt
   */
  private async checkRobotsTxt(origin: string): Promise<boolean> {
    try {
      const robotsUrl = `${origin}/robots.txt`;
      const response = await fetch(robotsUrl, {
        method: 'GET',
        headers: { 'User-Agent': this.userAgent }
      });

      if (!response.ok) {
        // If robots.txt doesn't exist, assume scraping is allowed
        return true;
      }

      const robotsText = await response.text();
      
      // Simple robots.txt parsing (you'd want more sophisticated parsing in production)
      const lines = robotsText.split('\n');
      let userAgentMatch = false;
      
      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        
        if (trimmed.startsWith('user-agent:')) {
          const agent = trimmed.split(':')[1].trim();
          userAgentMatch = agent === '*' || agent.includes('jobbot') || agent.includes('bot');
        }
        
        if (userAgentMatch && trimmed.startsWith('disallow:')) {
          const disallowPath = trimmed.split(':')[1].trim();
          if (disallowPath === '/' || disallowPath.includes('/careers')) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      // If we can't check robots.txt, assume scraping is allowed
      return true;
    }
  }

  /**
   * Basic HTML sanitization
   */
  private sanitizeHTML(html: string): string {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Remove potentially harmful elements
      const elementsToRemove = document.querySelectorAll('script, style, iframe, object, embed');
      elementsToRemove.forEach(el => el.remove());

      // Remove event handlers
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('on')) {
            el.removeAttribute(attr.name);
          }
        });
      });

      return document.documentElement.outerHTML;
    } catch (error) {
      console.error('HTML sanitization failed:', error);
      return html; // Return original if sanitization fails
    }
  }
}

/**
 * Express.js route handler example
 */
export const setupScrapeRoute = (app: any) => {
  const scrapingService = new ScrapingAPIService();

  app.post('/api/scrape', async (req: any, res: any) => {
    try {
      const { url, headOnly } = req.body as ScrapeRequest;
      
      if (!url) {
        return res.status(400).json({ 
          success: false, 
          error: 'URL is required' 
        });
      }

      // Rate limiting (implement proper rate limiting in production)
      const clientIP = req.ip;
      // Add rate limiting logic here

      const result = await scrapingService.scrapeURL({ url, headOnly });
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
      
    } catch (error) {
      console.error('Scrape endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });
};

/**
 * Next.js API route example
 */
export const scrapeHandler = async (req: any, res: any) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  const scrapingService = new ScrapingAPIService();
  const result = await scrapingService.scrapeURL(req.body);
  
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(400).json(result);
  }
};