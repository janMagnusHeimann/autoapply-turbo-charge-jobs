#!/usr/bin/env node

/**
 * Test SimplifyJobs parser to extract actual job data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSimplifyJobsParser() {
  console.log('🧪 Testing SimplifyJobs Parser\n');

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_KEY
  );

  try {
    console.log('1️⃣ Fetching SimplifyJobs data...');
    const response = await fetch('https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md');
    const content = await response.text();
    
    console.log(`✅ Fetched ${content.length} characters`);
    
    console.log('\n2️⃣ Parsing job data...');
    
    const lines = content.split('\n');
    
    // Find the table start
    const tableHeaderIndex = lines.findIndex(line => 
      line.includes('| Company | Role | Location |')
    );
    
    if (tableHeaderIndex === -1) {
      console.log('❌ Could not find job table header');
      return;
    }
    
    console.log(`✅ Found table header at line ${tableHeaderIndex + 1}`);
    
    // Skip header and separator, then parse job rows
    const jobLines = lines.slice(tableHeaderIndex + 2)
      .filter(line => 
        line.includes('|') && 
        line.includes('http') && 
        !line.includes('---') &&
        line.split('|').length >= 5
      )
      .slice(0, 10); // Test with first 10 jobs
    
    console.log(`✅ Found ${jobLines.length} job entries to parse`);
    
    const parsedJobs = [];
    let insertCount = 0;
    
    for (const line of jobLines) {
      try {
        const parts = line.split('|').map(p => p.trim());
        
        if (parts.length >= 6) { // SimplifyJobs has 7 parts total
          // Parse company name (parts[1])
          let companyPart = parts[1] || '';
          
          // Skip continuation rows (start with ↳)
          if (companyPart.includes('↳')) continue;
          
          // Extract company name from markdown link **[Company Name](...)**
          let companyName = '';
          const companyMatch = companyPart.match(/\*\*\[([^\]]+)\]/);
          if (companyMatch) {
            companyName = companyMatch[1];
          } else {
            // Skip if no company name found
            continue;
          }
          
          // Parse job title (parts[2])
          const jobTitle = (parts[2] || '').replace(/[\[\]*🇺🇸]/g, '').trim();
          
          // Parse location (parts[3])
          const location = (parts[3] || '').replace(/<\/br>/g, ', ').replace(/[\[\]]/g, '').trim();
          
          // Extract application URL from parts[4]
          const applicationPart = parts[4] || '';
          const urlMatch = applicationPart.match(/href="([^"]+)"/);
          const applicationUrl = urlMatch ? urlMatch[1] : '';
          
          if (companyName && jobTitle && applicationUrl && companyName.length > 1) {
            const job = {
              company: companyName,
              title: jobTitle,
              location: location || 'Not specified',
              applicationUrl: applicationUrl
            };
            
            parsedJobs.push(job);
            console.log(`   ✅ ${companyName} - ${jobTitle}`);
            
            // Try to insert into database
            try {
              // First get or create company
              let { data: company, error: companyError } = await supabase
                .from('companies')
                .select('id')
                .eq('name', companyName)
                .single();
              
              if (companyError && companyError.code === 'PGRST116') {
                // Company doesn't exist, create it
                const { data: newCompany, error: createError } = await supabase
                  .from('companies')
                  .insert({
                    name: companyName,
                    description: `Internship opportunities available - found via SimplifyJobs Summer 2025 Internships`,
                    industry: 'Technology',
                    size_category: 'medium'
                  })
                  .select('id')
                  .single();
                
                if (createError) {
                  console.log(`     ⚠️ Could not create company: ${createError.message}`);
                  continue;
                }
                company = newCompany;
              }
              
              if (company) {
                // Insert job
                const { error: jobError } = await supabase
                  .from('jobs')
                  .insert({
                    company_id: company.id,
                    title: jobTitle,
                    description: `Summer 2025 Internship opportunity`,
                    location: location ? [location] : ['Remote'],
                    job_type: 'internship',
                    application_url: applicationUrl,
                    source_url: 'https://github.com/SimplifyJobs/Summer2025-Internships',
                    source_repo: 'SimplifyJobs/Summer2025-Internships',
                    external_id: `sj-${companyName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                    is_active: true
                  });
                
                if (!jobError) {
                  insertCount++;
                } else {
                  console.log(`     ⚠️ Could not insert job: ${jobError.message}`);
                }
              }
            } catch (dbError) {
              console.log(`     ⚠️ Database error: ${dbError.message}`);
            }
          }
        }
      } catch (err) {
        console.log(`   ⚠️ Error parsing line: ${err.message}`);
      }
    }
    
    console.log(`\n✅ Successfully parsed ${parsedJobs.length} jobs`);
    console.log(`✅ Successfully inserted ${insertCount} jobs into database`);
    
    // Show sample of parsed jobs
    if (parsedJobs.length > 0) {
      console.log('\n📋 Sample parsed jobs:');
      parsedJobs.slice(0, 5).forEach(job => {
        console.log(`   • ${job.company} - ${job.title} (${job.location})`);
      });
    }
    
    console.log('\n🎉 SimplifyJobs parser test completed!');
    
  } catch (error) {
    console.error('\n❌ Parser test failed:', error.message);
  }
}

testSimplifyJobsParser();