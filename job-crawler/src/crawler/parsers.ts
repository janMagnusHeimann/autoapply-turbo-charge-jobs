/**
 * Job parsing logic for different formats (Markdown tables, lists, JSON, HTML)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { ParsedJob, CrawlResult } from '../types';
import { 
  normalizeCompanyName, 
  extractSalary, 
  parseLocation, 
  determineRemoteType, 
  extractTechTags, 
  isValidUrl, 
  normalizeJobTitle,
  generateExternalId,
  log,
  retryWithBackoff 
} from './utils';

/**
 * Base parser class with common functionality
 */
abstract class BaseParser {
  protected sourceRepo: string;
  protected sourceUrl: string;

  constructor(sourceRepo: string, sourceUrl: string) {
    this.sourceRepo = sourceRepo;
    this.sourceUrl = sourceUrl;
  }

  abstract parse(content: string): Promise<CrawlResult>;

  /**
   * Fetches content from GitHub raw URL
   */
  protected async fetchContent(): Promise<string> {
    return retryWithBackoff(async () => {
      const response = await axios.get(this.sourceUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'AutoApply-JobCrawler/1.0',
          ...(process.env.GITHUB_TOKEN && {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`
          })
        }
      });
      return response.data;
    });
  }

  /**
   * Converts GitHub URL to raw content URL
   */
  protected getRawUrl(githubUrl: string): string {
    return githubUrl
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');
  }

  /**
   * Creates a standardized parsed job object
   */
  protected createParsedJob(
    company: string,
    title: string,
    applicationUrl: string,
    options: {
      location?: string;
      description?: string;
      postedDate?: string;
      salary?: string;
    } = {}
  ): ParsedJob {
    const normalizedCompany = normalizeCompanyName(company);
    const normalizedTitle = normalizeJobTitle(title);
    
    const job: ParsedJob = {
      company: normalizedCompany,
      title: normalizedTitle,
      applicationUrl,
      externalId: generateExternalId({ company: normalizedCompany, title: normalizedTitle, applicationUrl }, this.sourceRepo)
    };

    if (options.location) {
      job.location = parseLocation(options.location).join(', ');
    }

    if (options.description) {
      job.description = options.description.trim();
      job.tags = extractTechTags(title, options.description);
    }

    if (options.salary) {
      job.salary = extractSalary(options.salary);
    }

    if (options.postedDate) {
      job.postedDate = options.postedDate;
    }

    return job;
  }
}

/**
 * Parser for Markdown tables (SimplifyJobs format)
 */
export class MarkdownTableParser extends BaseParser {
  async parse(): Promise<CrawlResult> {
    log('info', `Parsing markdown table from ${this.sourceUrl}`);
    
    try {
      const content = await this.fetchContent();
      const jobs: ParsedJob[] = [];
      const errors: string[] = [];

      // Split content into lines and find table sections
      const lines = content.split('\n');
      let currentTable: string[] = [];
      let inTable = false;

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Detect table start (header line with |)
        if (trimmedLine.includes('|') && (trimmedLine.includes('Company') || trimmedLine.includes('Role'))) {
          inTable = true;
          currentTable = [trimmedLine];
          continue;
        }

        // Detect table separator line
        if (inTable && trimmedLine.match(/^\|[\s\-:|]+\|$/)) {
          currentTable.push(trimmedLine);
          continue;
        }

        // Collect table rows
        if (inTable && trimmedLine.includes('|')) {
          currentTable.push(trimmedLine);
          continue;
        }

        // Process completed table
        if (inTable && (!trimmedLine.includes('|') || trimmedLine === '')) {
          try {
            const tableJobs = this.parseTable(currentTable);
            jobs.push(...tableJobs);
          } catch (error) {
            errors.push(`Failed to parse table: ${(error as Error).message}`);
          }
          
          currentTable = [];
          inTable = false;
        }
      }

      // Process final table if file ends with table
      if (currentTable.length > 0) {
        try {
          const tableJobs = this.parseTable(currentTable);
          jobs.push(...tableJobs);
        } catch (error) {
          errors.push(`Failed to parse final table: ${(error as Error).message}`);
        }
      }

      return {
        jobs,
        errors,
        metadata: {
          sourceUrl: this.sourceUrl,
          sourceRepo: this.sourceRepo,
          crawledAt: new Date().toISOString(),
          totalFound: jobs.length,
          successfullyParsed: jobs.length
        }
      };

    } catch (error) {
      log('error', 'Failed to parse markdown table', { error: (error as Error).message });
      throw error;
    }
  }

  private parseTable(tableLines: string[]): ParsedJob[] {
    if (tableLines.length < 3) return []; // Need header, separator, and at least one row

    const headerLine = tableLines[0];
    const dataLines = tableLines.slice(2); // Skip header and separator

    // Parse header to determine column positions
    const headers = headerLine.split('|').map(h => h.trim().toLowerCase());
    const companyCol = headers.findIndex(h => h.includes('company'));
    const roleCol = headers.findIndex(h => h.includes('role') || h.includes('position') || h.includes('title'));
    const locationCol = headers.findIndex(h => h.includes('location'));
    const applyCol = headers.findIndex(h => h.includes('apply') || h.includes('link'));

    if (companyCol === -1 || roleCol === -1) {
      throw new Error('Could not find required columns (company, role)');
    }

    const jobs: ParsedJob[] = [];

    for (const line of dataLines) {
      try {
        const cells = line.split('|').map(cell => cell.trim());
        
        if (cells.length < Math.max(companyCol, roleCol) + 1) continue;

        const company = this.extractTextFromMarkdown(cells[companyCol] || '');
        const title = this.extractTextFromMarkdown(cells[roleCol] || '');
        const location = locationCol !== -1 ? this.extractTextFromMarkdown(cells[locationCol] || '') : '';
        
        // Extract application URL
        let applicationUrl = '';
        if (applyCol !== -1 && cells[applyCol]) {
          applicationUrl = this.extractUrlFromMarkdown(cells[applyCol]);
        } else {
          // Look for URLs in any cell
          for (const cell of cells) {
            const url = this.extractUrlFromMarkdown(cell);
            if (url) {
              applicationUrl = url;
              break;
            }
          }
        }

        if (company && title && applicationUrl && isValidUrl(applicationUrl)) {
          const job = this.createParsedJob(company, title, applicationUrl, { location });
          jobs.push(job);
        }

      } catch (error) {
        log('warn', `Failed to parse table row: ${line}`, { error: (error as Error).message });
      }
    }

    return jobs;
  }

  private extractTextFromMarkdown(text: string): string {
    // Remove markdown formatting and extract text
    return text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) -> text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // **text** -> text
      .replace(/\*([^*]+)\*/g, '$1') // *text* -> text
      .replace(/`([^`]+)`/g, '$1') // `text` -> text
      .replace(/#+\s*/g, '') // Remove heading markers
      .trim();
  }

  private extractUrlFromMarkdown(text: string): string {
    // Extract URL from markdown link [text](url)
    const linkMatch = text.match(/\[([^\]]*)\]\(([^)]+)\)/);
    if (linkMatch) {
      return linkMatch[2];
    }

    // Look for plain URLs
    const urlMatch = text.match(/(https?:\/\/[^\s)]+)/);
    return urlMatch ? urlMatch[1] : '';
  }
}

/**
 * Parser for Markdown lists
 */
export class MarkdownListParser extends BaseParser {
  async parse(): Promise<CrawlResult> {
    log('info', `Parsing markdown list from ${this.sourceUrl}`);
    
    try {
      const content = await this.fetchContent();
      const jobs: ParsedJob[] = [];
      const errors: string[] = [];

      const lines = content.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Look for list items that might contain job information
        if (trimmedLine.match(/^[-*+]\s+/) || trimmedLine.match(/^\d+\.\s+/)) {
          try {
            const job = this.parseListItem(trimmedLine);
            if (job) {
              jobs.push(job);
            }
          } catch (error) {
            errors.push(`Failed to parse list item: ${trimmedLine} - ${(error as Error).message}`);
          }
        }
      }

      return {
        jobs,
        errors,
        metadata: {
          sourceUrl: this.sourceUrl,
          sourceRepo: this.sourceRepo,
          crawledAt: new Date().toISOString(),
          totalFound: jobs.length,
          successfullyParsed: jobs.length
        }
      };

    } catch (error) {
      log('error', 'Failed to parse markdown list', { error: (error as Error).message });
      throw error;
    }
  }

  private parseListItem(line: string): ParsedJob | null {
    // Remove list markers
    const content = line.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '');
    
    // Extract URL first
    const url = this.extractUrlFromMarkdown(content);
    if (!url || !isValidUrl(url)) return null;

    // Extract text without URL
    const textOnly = content.replace(/\[([^\]]*)\]\([^)]+\)/g, '$1').trim();
    
    // Try to parse common patterns:
    // "Company - Title - Location"
    // "Company: Title (Location)"
    // "Title at Company - Location"
    
    let company = '';
    let title = '';
    let location = '';

    // Pattern 1: Company - Title - Location
    let match = textOnly.match(/^([^-]+)\s*-\s*([^-]+)\s*-\s*(.+)$/);
    if (match) {
      company = match[1].trim();
      title = match[2].trim();
      location = match[3].trim();
    } else {
      // Pattern 2: Company: Title (Location)
      match = textOnly.match(/^([^:]+):\s*([^(]+)\s*\(([^)]+)\)$/);
      if (match) {
        company = match[1].trim();
        title = match[2].trim();
        location = match[3].trim();
      } else {
        // Pattern 3: Title at Company
        match = textOnly.match(/^(.+)\s+at\s+([^-]+)(?:\s*-\s*(.+))?$/);
        if (match) {
          title = match[1].trim();
          company = match[2].trim();
          location = match[3]?.trim() || '';
        } else {
          // Fallback: try to extract any meaningful text
          const parts = textOnly.split(/[-:,]/).map(p => p.trim()).filter(p => p.length > 0);
          if (parts.length >= 2) {
            company = parts[0];
            title = parts[1];
            location = parts.slice(2).join(', ');
          }
        }
      }
    }

    if (company && title) {
      return this.createParsedJob(company, title, url, { location });
    }

    return null;
  }

  private extractUrlFromMarkdown(text: string): string {
    const linkMatch = text.match(/\[([^\]]*)\]\(([^)]+)\)/);
    if (linkMatch) {
      return linkMatch[2];
    }

    const urlMatch = text.match(/(https?:\/\/[^\s)]+)/);
    return urlMatch ? urlMatch[1] : '';
  }
}

/**
 * Parser factory function
 */
export function createParser(type: string, sourceRepo: string, sourceUrl: string): BaseParser {
  switch (type) {
    case 'markdown-table':
      return new MarkdownTableParser(sourceRepo, sourceUrl);
    case 'markdown-list':
      return new MarkdownListParser(sourceRepo, sourceUrl);
    default:
      throw new Error(`Unsupported parser type: ${type}`);
  }
}