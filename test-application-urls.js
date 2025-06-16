// Test script to verify application URL improvements
// Run with: node test-application-urls.js

import fetch from 'node-fetch';

async function testApplicationUrls() {
  console.log('🔗 Testing Application URL Improvements');
  console.log('====================================\n');

  const testCases = [
    {
      name: 'Trade Republic (SmartRecruiters)',
      url: 'https://jobs.smartrecruiters.com/Trade-Republic',
      company: 'Trade Republic'
    },
    {
      name: 'Anthropic (Lever)',
      url: 'https://jobs.lever.co/anthropic',
      company: 'Anthropic'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`URL: ${testCase.url}`);
    console.log('---');

    try {
      const startTime = Date.now();
      
      // Test traditional scraping
      console.log('🔍 Testing traditional job scraping...');
      const traditionalResponse = await fetch('http://localhost:3001/api/scrape-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careerPageUrl: testCase.url,
          companyName: testCase.company
        })
      });

      const traditionalResult = await traditionalResponse.json();
      
      console.log(`📊 Traditional scraping found: ${traditionalResult.total_found} jobs`);
      
      if (traditionalResult.jobs && traditionalResult.jobs.length > 0) {
        console.log('\n🔗 Sample Application URLs (Traditional):');
        traditionalResult.jobs.slice(0, 3).forEach((job, index) => {
          console.log(`   ${index + 1}. ${job.title}`);
          console.log(`      Application URL: ${job.application_url}`);
          console.log(`      URL Type: ${analyzeUrlType(job.application_url, testCase.url)}`);
        });
      }

      // Test AI Vision scraping
      console.log('\n🤖 Testing AI Vision job scraping...');
      const aiVisionResponse = await fetch('http://localhost:3001/api/scrape-jobs-ai-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careerPageUrl: testCase.url,
          companyName: testCase.company,
          debugMode: false
        })
      });

      const aiVisionResult = await aiVisionResponse.json();
      
      console.log(`🤖 AI Vision found: ${aiVisionResult.total_found} jobs`);
      
      if (aiVisionResult.jobs && aiVisionResult.jobs.length > 0) {
        console.log('\n🔗 Sample Application URLs (AI Vision):');
        aiVisionResult.jobs.slice(0, 3).forEach((job, index) => {
          console.log(`   ${index + 1}. ${job.title}`);
          console.log(`      Application URL: ${job.application_url}`);
          console.log(`      URL Type: ${analyzeUrlType(job.application_url, testCase.url)}`);
        });
      }

      const duration = Date.now() - startTime;
      console.log(`\n⏱️  Total processing time: ${duration}ms`);

    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }
  }

  console.log('\n🎉 Application URL Testing Complete!');
  console.log('\n📋 Key Improvements:');
  console.log('• Enhanced URL extraction prioritizes "Apply" buttons');
  console.log('• Job board pattern recognition (Lever, Greenhouse, SmartRecruiters)');
  console.log('• Intelligent URL construction for missing application links');
  console.log('• Validation to ensure URLs lead to application forms');
  console.log('• Improved AI prompts emphasizing direct application URLs');
}

function analyzeUrlType(applicationUrl, careerPageUrl) {
  if (!applicationUrl) return '❌ Missing URL';
  
  const url = applicationUrl.toLowerCase();
  
  if (url === careerPageUrl.toLowerCase()) {
    return '⚠️  Generic career page';
  }
  
  if (url.includes('apply') || url.includes('application')) {
    return '✅ Direct application URL';
  }
  
  if (url.includes('greenhouse.io') || url.includes('lever.co') || 
      url.includes('smartrecruiters.com') || url.includes('workable.com')) {
    return '✅ Job board platform URL';
  }
  
  if (url.includes('/job/') || url.includes('/jobs/')) {
    return '📄 Job detail page';
  }
  
  return '🔍 Unknown URL type';
}

// Run the test
testApplicationUrls().catch(console.error);