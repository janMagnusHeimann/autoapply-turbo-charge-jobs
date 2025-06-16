// Test script for N26 career page discovery using web search
// Run with: node test-n26-discovery.js

import fetch from 'node-fetch';

async function testN26CareerDiscovery() {
  console.log('🏦 Testing N26 Career Page Discovery with Web Search');
  console.log('================================================\n');

  const testCompany = {
    name: 'N26',
    website_url: 'https://n26.com'
  };

  try {
    console.log(`🔍 Searching for real career page for: ${testCompany.name}`);
    console.log(`Company website: ${testCompany.website_url}`);
    console.log('---');

    const startTime = Date.now();
    
    // Test web search discovery
    console.log('🌐 Testing web search career page discovery...');
    const webSearchResponse = await fetch('http://localhost:3001/api/web-search-career-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: testCompany.name,
        websiteUrl: testCompany.website_url
      })
    });

    const webSearchResult = await webSearchResponse.json();
    const searchTime = Date.now() - startTime;
    
    console.log(`⏱️  Web search time: ${searchTime}ms`);
    console.log(`✅ Success: ${webSearchResult.success}`);
    
    if (webSearchResult.success) {
      console.log(`🎯 Career page URL: ${webSearchResult.career_page_url}`);
      console.log(`🎯 Confidence score: ${webSearchResult.confidence_score}`);
      console.log(`🎯 Discovery method: ${webSearchResult.method}`);
      
      if (webSearchResult.additional_urls && webSearchResult.additional_urls.length > 0) {
        console.log(`\n📋 Additional URLs found:`);
        webSearchResult.additional_urls.forEach((url, index) => {
          console.log(`   ${index + 1}. ${url}`);
        });
      }
      
      // Test if the discovered URL is accessible
      console.log('\n🧪 Testing discovered URL accessibility...');
      try {
        const urlTestResponse = await fetch(webSearchResult.career_page_url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)' },
          timeout: 10000
        });
        
        console.log(`📊 URL Status: ${urlTestResponse.status} ${urlTestResponse.statusText}`);
        console.log(`📊 URL Accessible: ${urlTestResponse.ok ? '✅ Yes' : '❌ No'}`);
        
        if (urlTestResponse.ok) {
          // Test job scraping on the discovered URL
          console.log('\n🔍 Testing job scraping on discovered URL...');
          const scrapingResponse = await fetch('http://localhost:3001/api/scrape-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              careerPageUrl: webSearchResult.career_page_url,
              companyName: testCompany.name
            })
          });
          
          const scrapingResult = await scrapingResponse.json();
          console.log(`📊 Jobs found: ${scrapingResult.total_found}`);
          console.log(`📊 Scraping method: ${scrapingResult.scraping_method}`);
          
          if (scrapingResult.jobs && scrapingResult.jobs.length > 0) {
            console.log('\n💼 Sample jobs found:');
            scrapingResult.jobs.slice(0, 3).forEach((job, index) => {
              console.log(`   ${index + 1}. ${job.title}`);
              console.log(`      Location: ${job.location}`);
              console.log(`      Application URL: ${job.application_url}`);
              console.log(`      URL Type: ${analyzeUrlType(job.application_url, webSearchResult.career_page_url)}`);
            });
          }
        }
        
      } catch (urlError) {
        console.log(`❌ URL test failed: ${urlError.message}`);
      }
      
    } else {
      console.log(`❌ Web search failed: ${webSearchResult.error}`);
      
      // Fallback test with traditional discovery
      console.log('\n🔄 Testing fallback traditional discovery...');
      const fallbackResponse = await fetch('http://localhost:3001/api/discover-career-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: testCompany.name,
          websiteUrl: testCompany.website_url
        })
      });
      
      const fallbackResult = await fallbackResponse.json();
      console.log(`📊 Fallback success: ${fallbackResult.success}`);
      if (fallbackResult.success) {
        console.log(`📊 Fallback URL: ${fallbackResult.career_page_url}`);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Total processing time: ${totalTime}ms`);

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }

  console.log('\n🎉 N26 Career Page Discovery Test Complete!');
  console.log('\n📋 Key Features Tested:');
  console.log('• OpenAI web search for real career page discovery');
  console.log('• URL validation and accessibility testing');
  console.log('• Job scraping on discovered real URLs');
  console.log('• Application URL enhancement for discovered jobs');
  console.log('• Fallback mechanisms for robust discovery');
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
testN26CareerDiscovery().catch(console.error);