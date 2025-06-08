#!/usr/bin/env node

/**
 * Script to clean up existing company names in the database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function cleanupCompanyNames() {
  console.log('🧹 Cleaning up company names in database\n');

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_KEY
  );

  try {
    // Get all companies with messy names
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .like('name', '%(/company-profiles/%');

    if (error) {
      throw new Error(error.message);
    }

    console.log(`Found ${companies.length} companies with messy names to clean up`);

    let updatedCount = 0;
    for (const company of companies) {
      try {
        const originalName = company.name;
        
        // Extract clean name
        let cleanName = originalName;
        if (cleanName.includes('(/company-profiles/')) {
          cleanName = cleanName.split('(/company-profiles/')[0].trim();
        }
        if (cleanName.includes('(')) {
          cleanName = cleanName.split('(')[0].trim();
        }
        
        // Remove "(Remote)" suffix if present
        cleanName = cleanName.replace(/\s*\(Remote\)\s*$/, '').trim();
        
        // Create updated description
        let description = company.description || 'Remote-friendly company from Remote in Tech list';
        if (originalName.includes('(/company-profiles/')) {
          const profilePath = originalName.match(/\(\/company-profiles\/([^)]+)\)/)?.[1];
          if (profilePath && !description.includes('Profile:')) {
            description += `. Profile: ${profilePath}`;
          }
        }
        
        // Add remote info to description if not already there
        if (!description.includes('Remote') && originalName.includes('(Remote)')) {
          description = 'Remote-friendly company. ' + description;
        }

        if (cleanName && cleanName !== originalName && cleanName.length > 1) {
          const { error: updateError } = await supabase
            .from('companies')
            .update({
              name: cleanName,
              description: description,
              industry: company.industry || 'Technology'
            })
            .eq('id', company.id);

          if (!updateError) {
            updatedCount++;
            console.log(`   ✅ Updated: "${originalName}" → "${cleanName}"`);
          } else {
            console.log(`   ❌ Failed to update ${originalName}: ${updateError.message}`);
          }
        }
      } catch (err) {
        console.log(`   ⚠️  Error processing ${company.name}: ${err.message}`);
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} company names`);
    
    // Show updated companies
    console.log('\n📋 Current company names:');
    const { data: updatedCompanies } = await supabase
      .from('companies')
      .select('name, description')
      .order('name');
    
    updatedCompanies?.forEach(company => {
      console.log(`   • ${company.name}`);
    });

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
  }
}

cleanupCompanyNames();