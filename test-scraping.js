// Test script to demonstrate real vs fake job scraping
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

// Real scraping endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    console.log(`🔍 Attempting to scrape: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 5000
    });

    if (!response.ok) {
      return res.json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      });
    }

    const html = await response.text();
    console.log(`✅ Scraped ${html.length} characters from ${url}`);
    
    res.json({
      success: true,
      html: html,
      length: html.length,
      url: url
    });

  } catch (error) {
    console.error(`❌ Scraping failed for ${req.body.url}:`, error.message);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint to show the difference
app.get('/test', async (req, res) => {
  console.log('\n🧪 Testing real vs fake job scraping...');
  
  // Test real scraping
  try {
    console.log('1. Testing real scraping of Trade Republic careers page...');
    const realResult = await fetch('http://localhost:3001/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://traderepublic.com/careers' })
    });
    
    const realData = await realResult.json();
    
    if (realData.success) {
      const hasRealJobs = realData.html.toLowerCase().includes('software engineer') || 
                         realData.html.toLowerCase().includes('developer') ||
                         realData.html.toLowerCase().includes('engineer');
      
      console.log(`✅ Real scraping result:
        - Success: ${realData.success}
        - HTML Length: ${realData.length} characters  
        - Contains job keywords: ${hasRealJobs}
        - URL: ${realData.url}`);
    } else {
      console.log(`❌ Real scraping failed: ${realData.error}`);
    }
    
    res.json({
      message: 'Scraping test completed - check console logs',
      realScraping: realData
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    res.json({
      message: 'Test failed',
      error: error.message
    });
  }
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Test scraping server running on http://localhost:${PORT}`);
  console.log(`📋 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`🔍 Scrape endpoint: http://localhost:${PORT}/api/scrape`);
  console.log('\n🧪 To test: curl http://localhost:3001/test');
  console.log('🌐 Or visit http://localhost:3001/test in your browser\n');
});

export default app;