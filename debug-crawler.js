#!/usr/bin/env node

/**
 * Debug script to examine actual job repository content and parsing
 */

import * as dotenv from 'dotenv';
dotenv.config();

async function debugRepositories() {
  console.log('🔍 Debugging Job Repository Content\n');

  const repositories = [
    {
      name: 'SimplifyJobs Summer 2025 Internships',
      url: 'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md',
      type: 'markdown-table'
    },
    {
      name: 'SimplifyJobs New Grad Positions', 
      url: 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md',
      type: 'markdown-table'
    },
    {
      name: 'Remote in Tech',
      url: 'https://raw.githubusercontent.com/remoteintech/remote-jobs/main/README.md',
      type: 'markdown-list'
    }
  ];

  for (const repo of repositories) {
    console.log(`\n📋 Analyzing: ${repo.name}`);
    console.log(`🔗 URL: ${repo.url}`);
    console.log(`📄 Type: ${repo.type}`);
    
    try {
      const response = await fetch(repo.url);
      const content = await response.text();
      
      console.log(`✅ Fetched ${content.length} characters`);
      
      // Look for job tables
      const lines = content.split('\n');
      
      if (repo.type === 'markdown-table') {
        console.log('\n🔍 Looking for job tables...');
        
        const tableHeaders = lines.filter(line => 
          line.includes('|') && 
          (line.toLowerCase().includes('company') || 
           line.toLowerCase().includes('role') ||
           line.toLowerCase().includes('position') ||
           line.toLowerCase().includes('job'))
        );
        
        console.log(`Found ${tableHeaders.length} potential table headers:`);
        tableHeaders.slice(0, 3).forEach(header => {
          console.log(`   | ${header.trim()}`);
        });
        
        // Find job data rows
        const jobRows = lines.filter(line => 
          line.includes('|') && 
          line.includes('http') && 
          !line.includes('---') &&
          !line.toLowerCase().includes('company')
        );
        
        console.log(`Found ${jobRows.length} potential job rows`);
        if (jobRows.length > 0) {
          console.log('Sample job rows:');
          jobRows.slice(0, 3).forEach(row => {
            console.log(`   | ${row.trim().substring(0, 100)}...`);
          });
        }
        
      } else if (repo.type === 'markdown-list') {
        console.log('\n🔍 Looking for company lists...');
        
        const companyLines = lines.filter(line => 
          line.includes('|') && 
          line.includes('http') && 
          !line.includes('Company') &&
          !line.includes('---')
        );
        
        console.log(`Found ${companyLines.length} potential company entries`);
        if (companyLines.length > 0) {
          console.log('Sample company lines:');
          companyLines.slice(0, 3).forEach(line => {
            console.log(`   | ${line.trim().substring(0, 100)}...`);
          });
        }
      }
      
    } catch (error) {
      console.error(`❌ Error fetching ${repo.name}: ${error.message}`);
    }
  }

  console.log('\n📊 Analysis Summary:');
  console.log('• SimplifyJobs repos contain internship/new-grad specific jobs');
  console.log('• Remote in Tech contains company directory, not individual jobs');
  console.log('• Need to improve parsing logic for different table formats');
  console.log('• Consider adding more active job boards');
}

debugRepositories();