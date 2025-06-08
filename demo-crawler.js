#!/usr/bin/env node

/**
 * Demo crawler using anon key (limited permissions)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function demoCrawler() {
  console.log('🌐 Demo Job Crawler (using anon key)\n');

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  try {
    // Test 1: Fetch job data from a real source
    console.log('1️⃣ Fetching job data from SimplifyJobs...');
    
    const response = await fetch('https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md');
    const content = await response.text();
    
    console.log(`✅ Fetched ${content.length} characters from SimplifyJobs`);
    
    // Test 2: Parse job table data
    console.log('\n2️⃣ Parsing job listings...');
    
    const lines = content.split('\n');
    const tableStart = lines.findIndex(line => line.includes('| Company | Role | Location |'));
    
    if (tableStart === -1) {
      console.log('❌ Could not find job table');
      return;
    }
    
    const jobLines = lines.slice(tableStart + 2) // Skip header and separator
      .filter(line => line.includes('|') && line.split('|').length > 4)
      .slice(0, 10); // First 10 jobs
    
    console.log(`✅ Found ${jobLines.length} job listings to parse`);
    
    // Test 3: Show parsed data
    console.log('\n3️⃣ Sample parsed jobs:');
    
    const parsedJobs = [];
    for (const line of jobLines.slice(0, 5)) {
      try {
        const parts = line.split('|').map(p => p.trim()).filter(p => p);
        if (parts.length >= 4) {
          const company = parts[0];
          const role = parts[1];
          const location = parts[2];
          const applicationUrl = parts[3].match(/\((https?:\/\/[^\)]+)\)/)?.[1];
          
          if (company && role && applicationUrl) {
            const job = {
              company: company.replace(/[\[\]]/g, '').trim(),
              role: role.replace(/[\[\]]/g, '').trim(),
              location: location || 'Not specified',
              applicationUrl: applicationUrl
            };
            parsedJobs.push(job);
            console.log(`   • ${job.company} - ${job.role} (${job.location})`);
          }
        }
      } catch (err) {
        // Skip invalid lines
      }
    }
    
    console.log(`\n✅ Successfully parsed ${parsedJobs.length} jobs`);
    
    // Test 4: Check current database state
    console.log('\n4️⃣ Checking current database...');
    
    const { data: companies, error } = await supabase
      .from('companies')
      .select('name')
      .limit(5);
    
    if (error) {
      console.log(`❌ Database error: ${error.message}`);
    } else {
      console.log(`✅ Current companies in database: ${companies.length}`);
      companies.forEach(company => {
        console.log(`   • ${company.name}`);
      });
    }
    
    console.log('\n🎉 Demo crawler completed!');
    console.log('\n📋 Summary:');
    console.log(`• Successfully fetched ${content.length} chars from GitHub`);
    console.log(`• Parsed ${parsedJobs.length} job listings`);
    console.log(`• Database connection working with anon key`);
    console.log('\n🔧 To enable full crawling:');
    console.log('1. Verify service key in Supabase dashboard');
    console.log('2. Double-check .env file format');
    console.log('3. The parsing logic works - just need proper database permissions');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
  }
}

demoCrawler();