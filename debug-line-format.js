#!/usr/bin/env node

/**
 * Debug SimplifyJobs line format
 */

async function debugLineFormat() {
  console.log('🔍 Debugging SimplifyJobs Line Format\n');

  try {
    const response = await fetch('https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md');
    const content = await response.text();
    
    const lines = content.split('\n');
    
    // Find the table start
    const tableHeaderIndex = lines.findIndex(line => 
      line.includes('| Company | Role | Location |')
    );
    
    console.log('Table header:');
    console.log(lines[tableHeaderIndex]);
    console.log('\nSeparator:');
    console.log(lines[tableHeaderIndex + 1]);
    
    console.log('\nFirst 5 data lines:');
    for (let i = tableHeaderIndex + 2; i < tableHeaderIndex + 7; i++) {
      if (lines[i] && lines[i].includes('|')) {
        console.log(`\nLine ${i + 1}:`);
        console.log(`Raw: ${lines[i]}`);
        
        const parts = lines[i].split('|').map(p => p.trim());
        console.log(`Parts (${parts.length}):`);
        parts.forEach((part, index) => {
          console.log(`  [${index}]: "${part}"`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugLineFormat();