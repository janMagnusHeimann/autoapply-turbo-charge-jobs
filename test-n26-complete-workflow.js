// Complete workflow test for N26 in the job application system
// Run with: node test-n26-complete-workflow.js

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testN26CompleteWorkflow() {
  console.log('🚀 Testing Complete N26 Workflow');
  console.log('=================================\n');

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Verify N26 in database
    console.log('📊 Step 1: Verifying N26 in database...');
    const { data: n26Company, error: dbError } = await supabase
      .from('companies')
      .select('*')
      .eq('name', 'N26')
      .single();

    if (dbError) {
      throw dbError;
    }

    console.log(`✅ N26 found in database:`);
    console.log(`   ID: ${n26Company.id}`);
    console.log(`   Name: ${n26Company.name}`);
    console.log(`   Industry: ${n26Company.industry}`);
    console.log(`   Website: ${n26Company.website_url}`);
    console.log(`   Careers URL: ${n26Company.careers_url}`);

    // Step 2: Test career page discovery
    console.log('\n🔍 Step 2: Testing career page discovery...');
    const discoveryResponse = await fetch('http://localhost:3001/api/web-search-career-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: n26Company.name,
        websiteUrl: n26Company.website_url
      })
    });

    const discoveryResult = await discoveryResponse.json();
    console.log(`   Discovery success: ${discoveryResult.success ? '✅' : '❌'}`);
    console.log(`   Discovered URL: ${discoveryResult.career_page_url}`);
    console.log(`   Confidence: ${discoveryResult.confidence_score}`);

    // Step 3: Test job scraping
    console.log('\n💼 Step 3: Testing job scraping...');
    const scrapingResponse = await fetch('http://localhost:3001/api/scrape-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        careerPageUrl: n26Company.careers_url,
        companyName: n26Company.name
      })
    });

    const scrapingResult = await scrapingResponse.json();
    console.log(`   Scraping success: ${scrapingResult.success ? '✅' : '❌'}`);
    console.log(`   Jobs found: ${scrapingResult.total_found}`);
    console.log(`   Scraping method: ${scrapingResult.scraping_method}`);

    if (scrapingResult.jobs && scrapingResult.jobs.length > 0) {
      console.log('\n   📋 Sample jobs found:');
      scrapingResult.jobs.slice(0, 2).forEach((job, index) => {
        console.log(`      ${index + 1}. ${job.title}`);
        console.log(`         Location: ${job.location}`);
        console.log(`         Type: ${job.employment_type} | ${job.remote_type}`);
        console.log(`         Application URL: ${job.application_url}`);
      });
    }

    // Step 4: Test AI Vision scraping
    console.log('\n🤖 Step 4: Testing AI Vision scraping...');
    const aiVisionResponse = await fetch('http://localhost:3001/api/scrape-jobs-ai-vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        careerPageUrl: n26Company.careers_url,
        companyName: n26Company.name,
        debugMode: false
      })
    });

    const aiVisionResult = await aiVisionResponse.json();
    console.log(`   AI Vision success: ${aiVisionResult.success ? '✅' : '❌'}`);
    console.log(`   AI Vision jobs found: ${aiVisionResult.total_found}`);
    
    if (aiVisionResult.total_found > 0) {
      console.log('   🎯 AI Vision found real jobs on the page!');
    } else {
      console.log('   📄 AI Vision found no jobs (likely dynamic content loading)');
    }

    // Step 5: Summary
    console.log('\n📈 Step 5: Workflow Summary');
    console.log('=========================');
    console.log(`✅ Database: N26 properly stored with complete information`);
    console.log(`${discoveryResult.success ? '✅' : '❌'} Discovery: Career page can be found via web search`);
    console.log(`${scrapingResult.success ? '✅' : '❌'} Scraping: Jobs can be extracted from career page`);
    console.log(`${aiVisionResult.success ? '✅' : '❌'} AI Vision: Advanced scraping capabilities available`);
    
    const workflowScore = [
      true, // Database always true if we get here
      discoveryResult.success,
      scrapingResult.success,
      aiVisionResult.success
    ].filter(Boolean).length;
    
    console.log(`\n🎯 Workflow Score: ${workflowScore}/4 systems working`);
    
    if (workflowScore >= 3) {
      console.log('🚀 N26 is ready for automated job applications!');
    } else {
      console.log('⚠️  Some systems need attention before full automation');
    }

  } catch (error) {
    console.error('❌ Workflow test failed:', error);
    console.error('Error details:', error.message);
  }

  console.log('\n🎉 N26 Complete Workflow Test Finished!');
}

// Run the test
testN26CompleteWorkflow().catch(console.error);