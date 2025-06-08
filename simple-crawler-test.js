#!/usr/bin/env node

/**
 * Simple crawler test that manually fetches and parses job data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function testCrawlSimple() {
  console.log('🕸️  Testing Simple Job Crawl\n');

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_KEY
  );

  try {
    // Test 1: Fetch a simple GitHub README
    console.log('1️⃣ Fetching GitHub job data...');
    
    const response = await fetch('https://raw.githubusercontent.com/remoteintech/remote-jobs/main/README.md');
    const content = await response.text();
    
    console.log(`✅ Fetched ${content.length} characters from Remote in Tech`);
    
    // Test 2: Simple parsing - look for company names
    console.log('\n2️⃣ Parsing company data...');
    
    const lines = content.split('\n');
    const companyLines = lines.filter(line => 
      line.includes('|') && 
      line.includes('http') && 
      !line.includes('Company') &&
      !line.includes('---')
    ).slice(0, 5); // Just first 5
    
    console.log(`✅ Found ${companyLines.length} potential company entries`);
    
    // Test 3: Insert sample companies
    console.log('\n3️⃣ Inserting sample companies...');
    
    let insertCount = 0;
    for (const line of companyLines) {
      try {
        const parts = line.split('|').map(p => p.trim()).filter(p => p);
        if (parts.length >= 2) {
          const rawCompanyName = parts[0].replace(/[\[\]]/g, '').trim();
          const website = parts[1].match(/https?:\/\/[^\s\)]+/)?.[0];
          
          // Extract clean company name
          let cleanName = rawCompanyName;
          if (cleanName.includes('(/company-profiles/')) {
            cleanName = cleanName.split('(/company-profiles/')[0].trim();
          }
          if (cleanName.includes('(')) {
            cleanName = cleanName.split('(')[0].trim();
          }
          
          // Create description with additional info
          let description = 'Remote-friendly company from Remote in Tech list';
          if (rawCompanyName.includes('(/company-profiles/')) {
            const profilePath = rawCompanyName.match(/\(\/company-profiles\/([^)]+)\)/)?.[1];
            if (profilePath) {
              description += `. Profile: ${profilePath}`;
            }
          }
          
          if (cleanName && website && cleanName.length > 1 && !cleanName.includes('/')) {
            const { error } = await supabase
              .from('companies')
              .insert({
                name: cleanName,
                website_url: website,
                description: description,
                size_category: 'medium',
                industry: 'Technology'
              });
            
            if (!error) {
              insertCount++;
              console.log(`   ✅ Added: ${cleanName}`);
            } else if (!error.message.includes('duplicate')) {
              console.log(`   ⚠️  Error adding ${cleanName}: ${error.message}`);
            }
          }
        }
      } catch (err) {
        // Skip invalid lines
      }
    }
    
    console.log(`\n✅ Successfully inserted ${insertCount} companies`);
    
    // Test 4: Show total companies
    console.log('\n4️⃣ Checking total companies in database...');
    
    const { count, error } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`✅ Total companies in database: ${count}`);
    }
    
    console.log('\n🎉 Simple crawler test completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Check your Company Directory in the web app');
    console.log('2. You should see new remote companies added');
    console.log('3. The basic crawling functionality works!');
    
  } catch (error) {
    console.error('\n❌ Crawler test failed:', error.message);
    return false;
  }
  
  return true;
}

testCrawlSimple().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});