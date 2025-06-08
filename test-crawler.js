#!/usr/bin/env node

/**
 * Simple test script to verify job crawler functionality
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testCrawler() {
  console.log('🕸️  Testing Job Crawler\n');

  // Create Supabase client
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  try {
    // Test 1: Check if job sources exist
    console.log('1️⃣ Checking job sources...');
    const { data: sources, error: sourcesError } = await supabase
      .from('job_sources')
      .select('*');

    if (sourcesError) {
      throw new Error(`Job sources error: ${sourcesError.message}`);
    }

    console.log(`✅ Found ${sources.length} job sources:`);
    sources.forEach(source => {
      console.log(`   • ${source.name} (${source.type})`);
    });

    // Test 2: Insert a test job manually
    console.log('\n2️⃣ Testing job insertion...');
    
    // First, get or create a test company
    let { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('name', 'Test Company')
      .single();

    if (!company) {
      console.log('   Creating test company...');
      const { data: newCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          name: 'Test Company',
          website_url: 'https://test.com',
          description: 'A test company for crawler verification'
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Company creation error: ${createError.message}`);
      }
      company = newCompany;
    }

    console.log(`   ✅ Company ready: ${company.name} (ID: ${company.id})`);

    // Insert a test job
    const testJob = {
      company_id: company.id,
      title: 'Test Software Engineer',
      description: 'A test job for crawler verification',
      location: ['Remote'],
      remote_type: 'remote',
      job_type: 'full-time',
      application_url: 'https://test.com/apply',
      source_url: 'https://test.com/jobs',
      source_repo: 'test-crawler',
      external_id: 'test-job-1',
      is_active: true
    };

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .upsert(testJob, { 
        onConflict: 'source_repo,external_id' 
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Job insertion error: ${jobError.message}`);
    }

    console.log(`   ✅ Test job inserted: ${job.title} (ID: ${job.id})`);

    // Test 3: Verify job retrieval
    console.log('\n3️⃣ Testing job retrieval...');
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        *,
        companies (
          name,
          website_url
        )
      `)
      .limit(5);

    if (jobsError) {
      throw new Error(`Job retrieval error: ${jobsError.message}`);
    }

    console.log(`   ✅ Retrieved ${jobs.length} jobs:`);
    jobs.forEach(job => {
      console.log(`   • ${job.title} at ${job.companies?.name || 'Unknown'}`);
    });

    // Test 4: Check crawl history
    console.log('\n4️⃣ Testing crawl history...');
    const { data: history, error: historyError } = await supabase
      .from('crawl_history')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(3);

    if (historyError) {
      throw new Error(`Crawl history error: ${historyError.message}`);
    }

    console.log(`   ✅ Found ${history.length} crawl history entries`);
    if (history.length > 0) {
      history.forEach(entry => {
        console.log(`   • ${entry.status} crawl: ${entry.jobs_found} jobs found`);
      });
    } else {
      console.log('   ⚠️  No crawl history yet (this is normal for first run)');
    }

    console.log('\n🎉 Job crawler database tests passed!');
    console.log('\n📝 Next steps to test actual crawling:');
    console.log('1. Add VITE_SUPABASE_SERVICE_KEY to your .env file');
    console.log('2. Run: npm run crawler:run');
    console.log('3. Check Company Directory in the web app for new companies');

  } catch (error) {
    console.error('\n❌ Crawler test failed:', error.message);
    return false;
  }

  return true;
}

// Run test
testCrawler().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});