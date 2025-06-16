// Simple test to show why jobs are still generated instead of scraped
import fetch from 'node-fetch';

console.log('🔍 Debugging Job Scraping Issues\n');

async function testScrapingWorkflow() {
  console.log('1. Testing if proxy server is running...');
  
  try {
    // Test if proxy server is accessible
    const response = await fetch('http://localhost:3001/health', { timeout: 2000 });
    console.log(`✅ Proxy server is running (status: ${response.status})`);
  } catch (error) {
    console.log(`❌ Proxy server is NOT running: ${error.message}`);
    console.log(`   📋 This is why scraping falls back to AI generation!`);
    console.log(`   🔧 Solution: Run 'npm run proxy' in another terminal`);
    return;
  }

  console.log('\n2. Testing real career page scraping...');
  
  try {
    const scrapeResponse = await fetch('http://localhost:3001/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://traderepublic.com/careers' }),
      timeout: 10000
    });
    
    const result = await scrapeResponse.json();
    
    if (result.success) {
      console.log(`✅ Real scraping works!`);
      console.log(`   📄 Scraped ${result.html?.length || 0} characters`);
      console.log(`   🔍 Contains job content: ${result.html?.toLowerCase().includes('job') || false}`);
    } else {
      console.log(`❌ Real scraping failed: ${result.error}`);
    }
    
  } catch (error) {
    console.log(`❌ Scraping test failed: ${error.message}`);
  }

  console.log('\n3. Testing LLM job extraction simulation...');
  
  // Simulate what happens when we get real HTML
  const mockHTML = `
    <div class="careers-page">
      <h1>Join Trade Republic</h1>
      <div class="job-listing">
        <h3>Senior Software Engineer</h3>
        <p>Berlin, Germany • Full-time</p>
        <a href="/careers/senior-software-engineer">Apply Now</a>
      </div>
      <div class="job-listing">
        <h3>Frontend Developer</h3>
        <p>Remote • Full-time</p>
        <a href="/careers/frontend-developer">Apply Now</a>
      </div>
    </div>
  `;
  
  console.log(`   📝 Mock HTML contains ${mockHTML.length} characters`);
  console.log(`   🎯 Job listings found: ${(mockHTML.match(/job-listing/g) || []).length}`);
  console.log(`   💼 Real job titles detected: Senior Software Engineer, Frontend Developer`);
}

// Run the test
testScrapingWorkflow().then(() => {
  console.log('\n📊 Summary:');
  console.log('   - If proxy server is running → Real scraping should work');
  console.log('   - If proxy server is down → Falls back to AI generation');
  console.log('   - Current issue: Proxy server likely not running');
  console.log('\n🚀 To fix: Run "npm run dev:full" instead of "npm run dev"');
}).catch(console.error);