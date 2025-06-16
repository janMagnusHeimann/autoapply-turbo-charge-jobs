// Test script to demonstrate AI Vision job scraping
// Run with: node test-ai-vision.js

import fetch from 'node-fetch';

async function testAIVisionScraping() {
  console.log('🤖 Testing AI Vision Job Scraping System');
  console.log('=====================================\n');

  const testCases = [
    {
      name: 'Trade Republic (discovered earlier)',
      url: 'https://jobs.smartrecruiters.com/Trade-Republic',
      company: 'Trade Republic'
    },
    {
      name: 'Anthropic (Lever jobs board)',
      url: 'https://jobs.lever.co/anthropic',
      company: 'Anthropic'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log(`URL: ${testCase.url}`);
    console.log('---');

    try {
      const startTime = Date.now();
      
      const response = await fetch('http://localhost:3001/api/scrape-jobs-ai-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careerPageUrl: testCase.url,
          companyName: testCase.company,
          debugMode: false
        })
      });

      const result = await response.json();
      const duration = Date.now() - startTime;

      console.log(`⏱️  Processing time: ${duration}ms`);
      console.log(`✅ Success: ${result.success}`);
      console.log(`📊 Jobs found: ${result.total_found}`);
      console.log(`🤖 AI Model: ${result.metadata?.ai_model_used}`);
      console.log(`🎯 Confidence: ${result.metadata?.confidence_score}`);
      
      if (result.jobs && result.jobs.length > 0) {
        console.log('\n📄 Sample Jobs:');
        result.jobs.slice(0, 2).forEach((job, index) => {
          console.log(`   ${index + 1}. ${job.title} - ${job.location} (${job.employment_type})`);
          if (job.technologies?.length > 0) {
            console.log(`      Tech: ${job.technologies.join(', ')}`);
          }
        });
      }

      if (result.error) {
        console.log(`❌ Error: ${result.error}`);
      }

    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }
  }

  console.log('\n🎉 AI Vision Testing Complete!');
  console.log('\n📋 Summary:');
  console.log('• AI Vision uses GPT-4o to "see" and understand career pages');
  console.log('• Works with any website design (not limited to HTML structure)');
  console.log('• Can navigate dynamic content and single-page applications');
  console.log('• Automatically extracts job information using computer vision');
  console.log('• Falls back gracefully when real scraping is not possible');
}

// Run the test
testAIVisionScraping().catch(console.error);