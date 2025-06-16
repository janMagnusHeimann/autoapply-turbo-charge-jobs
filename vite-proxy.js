// Enhanced proxy server for web scraping to avoid CORS issues
// Run this with: node vite-proxy.js

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Scraping endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { url, headOnly } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Validate URL
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    console.log(`🔍 Fetching URL: ${url}`);
    
    // Make the request with proper headers
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    console.log(`📡 Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status} for ${url}`);
      return res.status(400).json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status
      });
    }

    if (headOnly) {
      return res.json({ success: true, html: '' });
    }

    const html = await response.text();
    console.log(`✅ Fetched ${html.length} characters from ${url}`);
    
    // Basic sanitization
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Remove scripts and styles for safety
    document.querySelectorAll('script, style').forEach(el => el.remove());
    
    const sanitizedHtml = document.documentElement.outerHTML;
    console.log(`🧹 Sanitized to ${sanitizedHtml.length} characters`);

    res.json({
      success: true,
      html: sanitizedHtml
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown scraping error'
    });
  }
});

// Web search endpoint for discovering real career pages
app.post('/api/web-search-career-page', async (req, res) => {
  try {
    const { companyName, websiteUrl } = req.body;
    
    if (!companyName) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    console.log(`🔍 Web searching for real career page: ${companyName}`);
    
    // Use OpenAI to search the web for career pages
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
    });
    
    // Create search queries
    const searchQueries = [
      `${companyName} careers page jobs`,
      `${companyName} hiring jobs website`,
      `${companyName} work with us careers`
    ];
    
    if (websiteUrl) {
      const domain = websiteUrl.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
      searchQueries.unshift(`site:${domain} careers OR jobs OR hiring`);
    }
    
    let foundUrls = [];
    
    for (const query of searchQueries) {
      try {
        console.log(`🔎 Searching: "${query}"`);
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: `I need to find the official careers/jobs page for ${companyName}. Please search the web and provide the exact URL of their careers page where they list job openings. Search for: "${query}". Return only the URL, no explanations.`
            }
          ],
          max_tokens: 200,
          temperature: 0.1
        });

        const content = response.choices[0].message.content;
        if (content) {
          // Extract URLs from response
          const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
          const urls = content.match(urlRegex) || [];
          foundUrls.push(...urls);
        }
        
        // Small delay between searches
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn(`⚠️ Search failed for query "${query}":`, error.message);
      }
    }
    
    // Filter and validate URLs
    const validUrls = [...new Set(foundUrls)].filter(url => {
      const lowerUrl = url.toLowerCase();
      return (lowerUrl.includes('career') || lowerUrl.includes('job') || lowerUrl.includes('work')) &&
             !lowerUrl.includes('linkedin.com') && 
             !lowerUrl.includes('indeed.com') &&
             !lowerUrl.includes('glassdoor.com');
    });
    
    if (validUrls.length > 0) {
      // Test the first URL to see if it's accessible
      const bestUrl = validUrls[0];
      try {
        const testResponse = await fetch(bestUrl, { 
          method: 'HEAD', 
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)' },
          timeout: 5000 
        });
        
        if (testResponse.ok) {
          console.log(`✅ Found and validated career page: ${bestUrl}`);
          res.json({
            success: true,
            company_name: companyName,
            career_page_url: bestUrl,
            confidence_score: 0.9,
            additional_urls: validUrls.slice(1),
            method: 'web_search'
          });
          return;
        }
      } catch (testError) {
        console.warn(`⚠️ URL validation failed for ${bestUrl}:`, testError.message);
      }
    }
    
    // Fallback: Return the first URL even if validation failed
    if (validUrls.length > 0) {
      console.log(`⚠️ Found URLs but validation failed, returning best guess: ${validUrls[0]}`);
      res.json({
        success: true,
        company_name: companyName,
        career_page_url: validUrls[0],
        confidence_score: 0.6,
        additional_urls: validUrls.slice(1),
        method: 'web_search_unvalidated'
      });
    } else {
      console.log(`❌ No career pages found via web search for ${companyName}`);
      res.json({
        success: false,
        company_name: companyName,
        career_page_url: null,
        confidence_score: 0,
        error: 'No career pages found via web search'
      });
    }
    
  } catch (error) {
    console.error('Web search career page discovery error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Web search failed'
    });
  }
});

// Career page discovery endpoint
app.post('/api/discover-career-page', async (req, res) => {
  try {
    const { companyName, websiteUrl } = req.body;
    
    if (!companyName) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    console.log(`🔍 Discovering career page for: ${companyName}`);
    
    // Generate candidate URLs
    const candidateUrls = generateCareerPageUrls(companyName, websiteUrl);
    console.log(`📋 Testing ${candidateUrls.length} candidate URLs`);
    
    let bestResult = null;
    let bestScore = 0;
    
    // Test each URL
    for (const url of candidateUrls) {
      try {
        const result = await validateCareerPage(url, companyName);
        if (result.isValid && result.score > bestScore) {
          bestResult = {
            career_page_url: url,
            confidence_score: result.score,
            job_count: result.jobCount
          };
          bestScore = result.score;
        }
      } catch (error) {
        console.log(`❌ Failed to validate ${url}: ${error.message}`);
      }
    }
    
    if (bestResult) {
      console.log(`✅ Found career page: ${bestResult.career_page_url} (score: ${bestResult.confidence_score})`);
      res.json({
        success: true,
        company_name: companyName,
        ...bestResult
      });
    } else {
      console.log(`❌ No valid career page found for ${companyName}`);
      res.json({
        success: false,
        company_name: companyName,
        career_page_url: null,
        confidence_score: 0,
        error: 'No valid career page found'
      });
    }
    
  } catch (error) {
    console.error('Career page discovery error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Career page discovery failed'
    });
  }
});

// Job scraping endpoint
app.post('/api/scrape-jobs', async (req, res) => {
  try {
    const { careerPageUrl, companyName } = req.body;
    
    if (!careerPageUrl || !companyName) {
      return res.status(400).json({
        success: false,
        error: 'Career page URL and company name are required'
      });
    }

    console.log(`📄 Scraping jobs from: ${careerPageUrl}`);
    
    const startTime = Date.now();
    
    // Fetch the career page content
    const response = await fetch(careerPageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      },
      timeout: 15000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`✅ Fetched ${html.length} characters`);
    
    if (html.length < 1000) {
      throw new Error('Career page content is too short or empty');
    }
    
    // Parse jobs from HTML
    const jobs = await parseJobsFromHtml(html, careerPageUrl, companyName);
    
    const processingTime = Date.now() - startTime;
    console.log(`🎯 Found ${jobs.length} jobs in ${processingTime}ms`);
    
    // If no jobs found, use fallback
    if (jobs.length === 0) {
      console.log(`⚠️ No jobs found, generating fallback jobs for ${companyName}`);
      const fallbackJobs = generateFallbackJobs(companyName, careerPageUrl);
      
      res.json({
        success: true,
        jobs: fallbackJobs,
        total_found: fallbackJobs.length,
        career_page_url: careerPageUrl,
        scraping_method: 'fallback',
        error: 'No jobs found in parsed content. Using fallback data.',
        metadata: {
          scraped_at: new Date().toISOString(),
          processing_time_ms: processingTime,
          confidence_score: 0.3
        }
      });
    } else {
      res.json({
        success: true,
        jobs,
        total_found: jobs.length,
        career_page_url: careerPageUrl,
        scraping_method: 'direct',
        metadata: {
          scraped_at: new Date().toISOString(),
          processing_time_ms: processingTime,
          confidence_score: jobs.length > 0 ? 0.8 : 0.2
        }
      });
    }
    
  } catch (error) {
    console.error('Job scraping error:', error);
    
    // Generate fallback jobs for demo purposes
    const fallbackJobs = generateFallbackJobs(companyName, careerPageUrl);
    
    res.json({
      success: true,
      jobs: fallbackJobs,
      total_found: fallbackJobs.length,
      career_page_url: careerPageUrl,
      scraping_method: 'fallback',
      error: `Real scraping failed: ${error.message}. Using fallback data.`,
      metadata: {
        scraped_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
        confidence_score: 0.3
      }
    });
  }
});

// Helper functions
function generateCareerPageUrls(companyName, websiteUrl) {
  const urls = [];
  const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  
  if (websiteUrl) {
    const baseUrl = websiteUrl.replace(/\/$/, '');
    urls.push(
      `${baseUrl}/careers`,
      `${baseUrl}/careers/jobs`, 
      `${baseUrl}/jobs`,
      `${baseUrl}/work-with-us`,
      `${baseUrl}/company/careers`,
      `${baseUrl}/about/careers`,
      `${baseUrl}/join-us`,
      `${baseUrl}/opportunities`,
      `${baseUrl}/en/careers`,
      `${baseUrl}/en-de/careers`,
      `${baseUrl}/de/careers`
    );
  }
  
  // Add subdomain variations
  const domain = websiteUrl?.replace(/https?:\/\/(www\.)?/, '') || `${companyName.toLowerCase().replace(/\s+/g, '')}.com`;
  urls.push(
    `https://careers.${domain}`,
    `https://jobs.${domain}`,
    `https://apply.${domain}`
  );
  
  // Add popular job board platforms
  urls.push(
    `https://jobs.lever.co/${companySlug}`,
    `https://boards.greenhouse.io/${companySlug}`,
    `https://${companySlug}.greenhouse.io`,
    `https://apply.workable.com/${companySlug}`,
    `https://${companySlug}.workable.com`,
    `https://${companySlug}.bamboohr.com/jobs`,
    `https://jobs.smartrecruiters.com/${companyName.replace(/\s+/g, '-')}`,
    `https://${companySlug}.jobvite.com`,
    // Try variations of company name for job boards
    `https://jobs.lever.co/${companyName.toLowerCase().replace(/\s+/g, '')}`,
    `https://apply.workable.com/${companyName.toLowerCase().replace(/\s+/g, '')}`,
    `https://boards.greenhouse.io/${companyName.toLowerCase().replace(/\s+/g, '')}`
  );
  
  return [...new Set(urls)]; // Remove duplicates
}

async function validateCareerPage(url, companyName) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)'
      },
      timeout: 5000
    });
    
    if (!response.ok) {
      return { isValid: false, score: 0 };
    }
    
    // Get content to analyze
    const contentResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)'
      },
      timeout: 10000
    });
    
    const html = await contentResponse.text();
    const $ = cheerio.load(html);
    
    let score = 0;
    let jobCount = 0;
    
    // Look for job-related keywords
    const text = $('body').text().toLowerCase();
    const title = $('title').text().toLowerCase();
    
    // Score based on content indicators
    if (title.includes('career') || title.includes('job')) score += 0.3;
    if (text.includes('apply') || text.includes('position')) score += 0.2;
    if (text.includes('remote') || text.includes('office')) score += 0.1;
    
    // Count potential job listings
    const jobElements = $('[class*="job"], [class*="position"], [class*="role"], .career-item, .job-listing').length;
    jobCount = jobElements;
    
    if (jobElements > 0) score += Math.min(0.4, jobElements * 0.1);
    
    return { 
      isValid: score > 0.2, 
      score: Math.min(score, 1.0),
      jobCount 
    };
    
  } catch (error) {
    return { isValid: false, score: 0 };
  }
}

async function parseJobsFromHtml(html, careerPageUrl, companyName) {
  const $ = cheerio.load(html);
  const jobs = [];
  
  // Common job listing selectors
  const jobSelectors = [
    '[class*="job"]',
    '[class*="position"]', 
    '[class*="role"]',
    '[class*="career"]',
    '.job-listing',
    '.position-item',
    '.career-item',
    '[data-job]',
    '.opportunity'
  ];
  
  for (const selector of jobSelectors) {
    $(selector).each((i, element) => {
      const $job = $(element);
      const title = extractJobTitle($job);
      const description = extractJobDescription($job);
      
      if (title && title.length > 3) {
        const job = {
          id: `${companyName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${i}`,
          title: title.trim(),
          company_id: companyName.toLowerCase().replace(/\s+/g, '-'),
          company_name: companyName,
          description: description || 'No description available',
          requirements: extractJobRequirements($job),
          nice_to_have: [],
          responsibilities: [],
          location: extractJobLocation($job) || 'Not specified',
          employment_type: 'full-time',
          remote_type: extractRemoteType($job),
          experience_level: extractExperienceLevel(title, description),
          application_url: extractApplicationUrl($job, careerPageUrl),
          posted_date: new Date().toISOString(),
          technologies: extractTechnologies(title, description)
        };
        
        jobs.push(job);
      }
    });
    
    if (jobs.length > 0) break; // Found jobs with this selector
  }
  
  return jobs.slice(0, 50); // Limit to 50 jobs
}

function extractJobTitle($job) {
  const titleSelectors = ['h1', 'h2', 'h3', '.title', '.job-title', '.position-title', '[class*="title"]'];
  
  for (const selector of titleSelectors) {
    const title = $job.find(selector).first().text().trim();
    if (title) return title;
  }
  
  return $job.text().split('\n')[0].trim();
}

function extractJobDescription($job) {
  const descSelectors = ['.description', '.job-description', '.summary', 'p'];
  
  for (const selector of descSelectors) {
    const desc = $job.find(selector).text().trim();
    if (desc && desc.length > 20) return desc;
  }
  
  return $job.text().trim();
}

function extractJobRequirements($job) {
  const text = $job.text().toLowerCase();
  const requirements = [];
  
  // Look for common requirement patterns
  if (text.includes('javascript') || text.includes('js')) requirements.push('JavaScript');
  if (text.includes('typescript') || text.includes('ts')) requirements.push('TypeScript');
  if (text.includes('react')) requirements.push('React');
  if (text.includes('node')) requirements.push('Node.js');
  if (text.includes('python')) requirements.push('Python');
  if (text.includes('java') && !text.includes('javascript')) requirements.push('Java');
  if (text.includes('aws') || text.includes('amazon web services')) requirements.push('AWS');
  
  return requirements;
}

function extractJobLocation($job) {
  const text = $job.text();
  const locationRegex = /(New York|San Francisco|London|Berlin|Remote|Hybrid|On-site)/i;
  const match = text.match(locationRegex);
  return match ? match[1] : null;
}

function extractRemoteType($job) {
  const text = $job.text().toLowerCase();
  if (text.includes('remote')) return 'remote';
  if (text.includes('hybrid')) return 'hybrid';
  return 'on-site';
}

function extractExperienceLevel(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  if (text.includes('senior') || text.includes('lead')) return 'senior';
  if (text.includes('junior') || text.includes('entry')) return 'entry';
  if (text.includes('mid') || text.includes('intermediate')) return 'mid';
  return 'mid';
}

function extractApplicationUrl($job, baseUrl) {
  // Priority order for finding application URLs
  const applicationSelectors = [
    'a[href*="apply"]',
    'a[href*="application"]', 
    'a[href*="job"]',
    'a[class*="apply"]',
    'a[class*="application"]',
    'a[title*="apply" i]',
    'a[title*="application" i]',
    '.apply-btn a',
    '.application-link a',
    'a'
  ];

  // Try to find the best application URL
  for (const selector of applicationSelectors) {
    const links = $job.find(selector);
    for (let i = 0; i < links.length; i++) {
      const href = $(links[i]).attr('href');
      if (href && href.trim()) {
        const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
        
        // Validate it's likely an application URL
        if (isApplicationUrl(fullUrl, href)) {
          return fullUrl;
        }
      }
    }
  }

  // Fallback: construct application URL based on job board patterns
  const constructedUrl = constructApplicationUrl(baseUrl, $job);
  if (constructedUrl) {
    return constructedUrl;
  }

  // Final fallback
  return baseUrl;
}

function isApplicationUrl(fullUrl, originalHref) {
  const url = fullUrl.toLowerCase();
  const href = originalHref.toLowerCase();
  
  // High priority application indicators
  const applicationKeywords = [
    'apply', 'application', 'job-application', 'careers/apply',
    'greenhouse.io', 'lever.co', 'workable.com', 'smartrecruiters.com',
    'jobvite.com', 'bamboohr.com', 'recruiting.ultipro.com'
  ];
  
  // Check if URL contains application-specific keywords
  for (const keyword of applicationKeywords) {
    if (url.includes(keyword) || href.includes(keyword)) {
      return true;
    }
  }
  
  // Avoid generic pages
  const avoidKeywords = ['about', 'contact', 'home', 'news', 'blog'];
  for (const avoid of avoidKeywords) {
    if (url.includes(avoid)) {
      return false;
    }
  }
  
  return false;
}

function constructApplicationUrl(baseUrl, $job) {
  const jobTitle = $job.find('h1, h2, h3, .title, .job-title').first().text().trim();
  const jobId = $job.attr('data-job-id') || $job.attr('id') || $job.find('[data-job-id]').attr('data-job-id');
  
  // Known job board patterns
  if (baseUrl.includes('lever.co')) {
    // Lever pattern: https://jobs.lever.co/company/job-id
    if (jobId) {
      return `${baseUrl}/${jobId}/apply`;
    }
  } else if (baseUrl.includes('greenhouse.io')) {
    // Greenhouse pattern
    if (jobId) {
      return `${baseUrl}/jobs/${jobId}?gh_jid=${jobId}`;
    }
  } else if (baseUrl.includes('smartrecruiters.com')) {
    // SmartRecruiters pattern
    if (jobId) {
      return `${baseUrl}/jobs/${jobId}`;
    }
  } else if (baseUrl.includes('workable.com')) {
    // Workable pattern
    if (jobId) {
      return `${baseUrl}/j/${jobId}`;
    }
  }
  
  // Generic fallback construction
  if (jobId) {
    return `${baseUrl}/apply/${jobId}`;
  } else if (jobTitle) {
    const titleSlug = jobTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    return `${baseUrl}/apply/${titleSlug}`;
  }
  
  return null;
}

function extractTechnologies(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  const techs = [];
  
  const techKeywords = ['react', 'vue', 'angular', 'node', 'python', 'java', 'golang', 'rust', 'kotlin', 'swift'];
  
  for (const tech of techKeywords) {
    if (text.includes(tech)) {
      techs.push(tech.charAt(0).toUpperCase() + tech.slice(1));
    }
  }
  
  return techs;
}

function generateFallbackJobs(companyName, careerPageUrl) {
  const fallbackJobs = [
    {
      id: `${companyName.toLowerCase().replace(/\s+/g, '-')}-fallback-1-${Date.now()}`,
      title: 'Senior Software Engineer',
      company_id: companyName.toLowerCase().replace(/\s+/g, '-'),
      company_name: companyName,
      description: `Join ${companyName} as a Senior Software Engineer. Work on cutting-edge technology and help build the future of finance.`,
      requirements: ['JavaScript', 'TypeScript', 'React', 'Node.js', '5+ years experience'],
      nice_to_have: ['Python', 'AWS', 'Docker'],
      responsibilities: ['Build scalable web applications', 'Mentor junior developers', 'Collaborate with product teams'],
      location: 'Berlin, Germany',
      employment_type: 'full-time',
      remote_type: 'hybrid',
      experience_level: 'senior',
      application_url: `${careerPageUrl}/apply/senior-software-engineer`,
      posted_date: new Date().toISOString(),
      technologies: ['JavaScript', 'TypeScript', 'React', 'Node.js']
    },
    {
      id: `${companyName.toLowerCase().replace(/\s+/g, '-')}-fallback-2-${Date.now()}`,
      title: 'Product Manager',
      company_id: companyName.toLowerCase().replace(/\s+/g, '-'),
      company_name: companyName,
      description: `Drive product strategy and execution at ${companyName}. Lead cross-functional teams to deliver innovative financial products.`,
      requirements: ['Product management experience', 'Financial services background', 'Data-driven mindset'],
      nice_to_have: ['MBA', 'Technical background', 'Agile experience'],
      responsibilities: ['Define product roadmap', 'Work with engineering teams', 'Analyze user feedback'],
      location: 'Berlin, Germany',
      employment_type: 'full-time',
      remote_type: 'hybrid',
      experience_level: 'mid',
      application_url: `${careerPageUrl}/apply/product-manager`,
      posted_date: new Date().toISOString(),
      technologies: []
    },
    {
      id: `${companyName.toLowerCase().replace(/\s+/g, '-')}-fallback-3-${Date.now()}`,
      title: 'DevOps Engineer',
      company_id: companyName.toLowerCase().replace(/\s+/g, '-'),
      company_name: companyName,
      description: `Build and maintain the infrastructure that powers ${companyName}. Work with modern cloud technologies and automation tools.`,
      requirements: ['AWS', 'Kubernetes', 'Docker', 'CI/CD', '3+ years experience'],
      nice_to_have: ['Terraform', 'Monitoring tools', 'Python'],
      responsibilities: ['Maintain cloud infrastructure', 'Automate deployment processes', 'Monitor system performance'],
      location: 'Remote',
      employment_type: 'full-time',
      remote_type: 'remote',
      experience_level: 'mid',
      application_url: `${careerPageUrl}/apply/devops-engineer`,
      posted_date: new Date().toISOString(),
      technologies: ['AWS', 'Kubernetes', 'Docker']
    }
  ];
  
  return fallbackJobs;
}

// AI Vision job scraping endpoint
app.post('/api/scrape-jobs-ai-vision', async (req, res) => {
  try {
    const { careerPageUrl, companyName, debugMode } = req.body;
    
    if (!careerPageUrl || !companyName) {
      return res.status(400).json({
        success: false,
        error: 'Career page URL and company name are required'
      });
    }

    console.log(`🤖 AI Vision scraping jobs from: ${careerPageUrl}`);
    
    // Import AI Vision scraper (dynamic import for Node.js compatibility)
    const { chromium } = await import('playwright');
    const { OpenAI } = await import('openai');
    
    const startTime = Date.now();
    let browser;
    
    try {
      // Initialize browser
      browser = await chromium.launch({
        headless: !debugMode,
        args: ['--disable-blink-features=AutomationControlled']
      });
      
      const page = await browser.newPage();
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Navigate to career page
      await page.goto(careerPageUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      // Take screenshot and analyze with AI
      const screenshot = await page.screenshot({ type: 'png' });
      const base64Screenshot = screenshot.toString('base64');
      
      // Initialize OpenAI (use environment variable on server)
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
      });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this career/jobs page for ${companyName} and extract all visible job listings. 

CRITICAL: Focus on finding DIRECT APPLICATION URLs for each job. Look for:
- "Apply" buttons and their URLs
- "Apply Now" links  
- Direct application form links
- Job-specific application pages
- Platform-specific application URLs (Greenhouse, Lever, SmartRecruiters, etc.)

Extract job information in this JSON format:
{
  "jobs": [
    {
      "title": "Job Title",
      "description": "Job description or summary",
      "location": "Location",
      "employment_type": "full-time",
      "remote_type": "on-site|remote|hybrid",
      "experience_level": "entry|mid|senior",
      "requirements": ["requirement1", "requirement2"],
      "technologies": ["tech1", "tech2"],
      "application_url": "DIRECT application URL - NOT the job detail page URL. Must lead to application form."
    }
  ],
  "total_found": 3,
  "page_has_more": false
}

IMPORTANT: The application_url MUST be a direct link to apply for the job, not just a job detail page. If you can't find a direct application URL, construct one based on the job board pattern (e.g., for Lever: /job-id/apply, for Greenhouse: /jobs/job-id, etc.)`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Screenshot}`,
                  detail: "high"
                }
              }
            ]
          }
        ]
      });

      let aiResult = { jobs: [], total_found: 0 };
      
      try {
        const content = response.choices[0].message.content;
        const jsonMatch = content?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
      }
      
      // Process and enhance job data
      const processedJobs = aiResult.jobs.map((job, index) => ({
        id: `${companyName.toLowerCase().replace(/\s+/g, '-')}-ai-${Date.now()}-${index}`,
        title: job.title || 'Position Available',
        company_id: companyName.toLowerCase().replace(/\s+/g, '-'),
        company_name: companyName,
        description: job.description || 'No description available',
        requirements: Array.isArray(job.requirements) ? job.requirements : [],
        nice_to_have: [],
        responsibilities: [],
        location: job.location || 'Not specified',
        employment_type: job.employment_type || 'full-time',
        remote_type: job.remote_type || 'on-site',
        experience_level: job.experience_level || 'mid',
        application_url: enhanceApplicationUrl(job.application_url, job.title, careerPageUrl, companyName),
        posted_date: new Date().toISOString(),
        technologies: Array.isArray(job.technologies) ? job.technologies : []
      }));

      await browser.close();
      
      const processingTime = Date.now() - startTime;
      console.log(`🤖 AI Vision found ${processedJobs.length} jobs in ${processingTime}ms`);
      
      res.json({
        success: true,
        jobs: processedJobs,
        total_found: processedJobs.length,
        career_page_url: careerPageUrl,
        scraping_method: 'ai_vision',
        metadata: {
          scraped_at: new Date().toISOString(),
          processing_time_ms: processingTime,
          confidence_score: processedJobs.length > 0 ? 0.8 : 0.2,
          ai_model_used: 'gpt-4o'
        }
      });
      
    } catch (innerError) {
      if (browser) await browser.close();
      throw innerError;
    }
    
  } catch (error) {
    console.error('AI Vision job scraping error:', error);
    res.status(500).json({
      success: false,
      jobs: [],
      total_found: 0,
      career_page_url: req.body.careerPageUrl,
      scraping_method: 'ai_vision',
      error: error.message || 'AI Vision scraping failed',
      metadata: {
        scraped_at: new Date().toISOString(),
        processing_time_ms: 0,
        confidence_score: 0
      }
    });
  }
});

// Enhanced application URL processing for AI Vision results
function enhanceApplicationUrl(aiProvidedUrl, jobTitle, careerPageUrl, companyName) {
  // If AI provided a valid application URL, validate and use it
  if (aiProvidedUrl && aiProvidedUrl !== careerPageUrl) {
    const url = aiProvidedUrl.toLowerCase();
    
    // Check if it's likely a direct application URL
    const applicationIndicators = [
      'apply', 'application', 'job-application', '/apply/',
      'greenhouse.io', 'lever.co', 'workable.com', 'smartrecruiters.com',
      'jobvite.com', 'bamboohr.com'
    ];
    
    for (const indicator of applicationIndicators) {
      if (url.includes(indicator)) {
        // Ensure it's a full URL
        return aiProvidedUrl.startsWith('http') ? aiProvidedUrl : new URL(aiProvidedUrl, careerPageUrl).href;
      }
    }
  }
  
  // If no valid URL from AI, construct one based on job board patterns
  const constructedUrl = constructJobApplicationUrl(careerPageUrl, jobTitle, companyName);
  if (constructedUrl) {
    return constructedUrl;
  }
  
  // Final fallback - use career page with apply suffix
  return `${careerPageUrl}/apply`;
}

function constructJobApplicationUrl(careerPageUrl, jobTitle, companyName) {
  const baseUrl = careerPageUrl.toLowerCase();
  const titleSlug = jobTitle ? jobTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') : 'position';
  const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  
  // Job board specific patterns
  if (baseUrl.includes('lever.co')) {
    // Lever: https://jobs.lever.co/company/position-id/apply
    return `${careerPageUrl}/${titleSlug}/apply`;
  } else if (baseUrl.includes('greenhouse.io')) {
    // Greenhouse: https://boards.greenhouse.io/company/jobs/job-id
    return `${careerPageUrl}/jobs/${titleSlug}`;
  } else if (baseUrl.includes('smartrecruiters.com')) {
    // SmartRecruiters: https://jobs.smartrecruiters.com/Company/job-id
    return `${careerPageUrl}/${titleSlug}`;
  } else if (baseUrl.includes('workable.com')) {
    // Workable: https://apply.workable.com/company/j/job-id
    return `${careerPageUrl}/j/${titleSlug}`;
  } else if (baseUrl.includes('bamboohr.com')) {
    // BambooHR: https://company.bamboohr.com/jobs/view.php?id=job-id
    return `${careerPageUrl}/view.php?id=${titleSlug}`;
  } else if (baseUrl.includes('jobvite.com')) {
    // Jobvite: https://company.jobvite.com/careers/job/job-id
    return `${careerPageUrl}/job/${titleSlug}`;
  }
  
  // Generic company website patterns
  if (baseUrl.includes('/careers') || baseUrl.includes('/jobs')) {
    return `${careerPageUrl}/apply/${titleSlug}`;
  }
  
  // Create application URL based on common patterns
  const baseDomain = careerPageUrl.replace(/\/[^\/]*$/, ''); // Remove trailing path
  return `${baseDomain}/careers/apply/${titleSlug}`;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Enhanced scraping proxy server with AI Vision is running' });
});

app.listen(PORT, () => {
  console.log(`🔍 Enhanced scraping proxy server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 Career page discovery: POST http://localhost:${PORT}/api/discover-career-page`);
  console.log(`📄 Job scraping: POST http://localhost:${PORT}/api/scrape-jobs`);
});

export default app;