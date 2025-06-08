/**
 * Main entry point for the job crawler
 */

import * as dotenv from 'dotenv';
import { JobCrawler } from './crawler';
import { CrawlerConfig } from './types';
import { log } from './crawler/utils';

// Load environment variables from parent directory
dotenv.config({ path: '../.env' });

/**
 * Creates crawler configuration from environment variables
 */
function createConfig(): CrawlerConfig {
  const config: CrawlerConfig = {
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!,
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5'),
    requestDelayMs: parseInt(process.env.REQUEST_DELAY_MS || '1000'),
    logLevel: (process.env.LOG_LEVEL as any) || 'info'
  };

  // Add optional GitHub token if available
  if (process.env.GITHUB_TOKEN) {
    config.githubToken = process.env.GITHUB_TOKEN;
  }

  // Validate required configuration
  if (!config.supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!config.supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_KEY environment variable is required');
  }

  return config;
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    log('info', 'Starting job crawler...');
    
    const config = createConfig();
    const crawler = new JobCrawler(config);

    // Check command line arguments for specific source
    const args = process.argv.slice(2);
    const sourceArg = args.find(arg => arg.startsWith('--source='));
    
    if (sourceArg) {
      // Crawl specific source
      const sourceName = sourceArg.split('=')[1];
      if (!sourceName) {
        throw new Error('Source name is required when using --source=<name>');
      }
      log('info', `Crawling specific source: ${sourceName}`);
      
      const result = await crawler.crawlSourceByName(sourceName);
      log('info', 'Source crawl completed', {
        source: sourceName,
        jobsInserted: result.jobs_inserted,
        jobsUpdated: result.jobs_updated,
        companiesCreated: result.companies_created
      });
    } else {
      // Crawl all sources
      log('info', 'Crawling all active sources...');
      await crawler.crawlAll();
    }

    // Display stats
    const stats = await crawler.getStats();
    log('info', 'Crawl statistics', stats);

    log('info', 'Job crawler completed successfully');
    process.exit(0);

  } catch (error) {
    log('error', 'Job crawler failed', { error: (error as Error).message });
    console.error('Stack trace:', (error as Error).stack);
    process.exit(1);
  }
}

/**
 * Handle uncaught exceptions and rejections
 */
process.on('uncaughtException', (error) => {
  log('error', 'Uncaught exception', { error: error.message });
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('error', 'Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Handle SIGINT and SIGTERM for graceful shutdown
process.on('SIGINT', () => {
  log('info', 'Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run main function
if (require.main === module) {
  main();
}