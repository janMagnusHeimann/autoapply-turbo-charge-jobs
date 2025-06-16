// Script to update N26 company in Supabase database with real career page URL
// Run with: node update-n26-in-db.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function updateN26InDatabase() {
  console.log('🏦 Updating N26 in Supabase Database');
  console.log('===================================\n');

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration. Check .env file.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find N26 company
    console.log('🔍 Finding N26 company in database...');
    const { data: existingCompany, error: findError } = await supabase
      .from('companies')
      .select('*')
      .eq('name', 'N26')
      .single();

    if (findError) {
      throw findError;
    }

    console.log('📊 Current N26 data:');
    console.log(`   ID: ${existingCompany.id}`);
    console.log(`   Name: ${existingCompany.name}`);
    console.log(`   Description: ${existingCompany.description || 'NULL'}`);
    console.log(`   Industry: ${existingCompany.industry || 'NULL'}`);
    console.log(`   Size: ${existingCompany.size_category || 'NULL'}`);
    console.log(`   Website: ${existingCompany.website_url || 'NULL'}`);
    console.log(`   Careers URL: ${existingCompany.careers_url || 'NULL'}`);
    console.log(`   Headquarters: ${existingCompany.headquarters || 'NULL'}`);
    console.log(`   Founded: ${existingCompany.founded_year || 'NULL'}`);

    // Update N26 with complete information
    console.log('\n🔄 Updating N26 with complete company information...');
    const { data: updatedCompany, error: updateError } = await supabase
      .from('companies')
      .update({
        description: 'Digital bank offering mobile banking services across Europe and the US with innovative financial products',
        industry: 'Fintech',
        size_category: 'large',
        website_url: 'https://n26.com',
        careers_url: 'https://n26.com/en/careers',
        headquarters: 'Berlin, Germany',
        founded_year: 2013
      })
      .eq('id', existingCompany.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Successfully updated N26 company information!');
    console.log('\n📊 Updated N26 Details:');
    console.log(`   ID: ${updatedCompany.id}`);
    console.log(`   Name: ${updatedCompany.name}`);
    console.log(`   Description: ${updatedCompany.description}`);
    console.log(`   Industry: ${updatedCompany.industry}`);
    console.log(`   Size: ${updatedCompany.size_category}`);
    console.log(`   Website: ${updatedCompany.website_url}`);
    console.log(`   Careers URL: ${updatedCompany.careers_url}`);
    console.log(`   Headquarters: ${updatedCompany.headquarters}`);
    console.log(`   Founded: ${updatedCompany.founded_year}`);
    console.log(`   Updated: ${updatedCompany.updated_at || 'N/A'}`);

    // Verify the career URL is accessible
    console.log('\n🧪 Testing the career page URL...');
    try {
      const response = await fetch(updatedCompany.careers_url, { 
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)' }
      });
      
      if (response.ok) {
        console.log(`✅ Career page URL is accessible: ${response.status} ${response.statusText}`);
      } else {
        console.log(`⚠️  Career page URL returned: ${response.status} ${response.statusText}`);
      }
    } catch (urlError) {
      console.log(`❌ Failed to test career page URL: ${urlError.message}`);
    }

    // Test the web search discovery with the updated company
    console.log('\n🔍 Testing web search discovery with updated N26 data...');
    try {
      const searchResponse = await fetch('http://localhost:3001/api/web-search-career-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: updatedCompany.name,
          websiteUrl: updatedCompany.website_url
        })
      });

      const searchResult = await searchResponse.json();
      console.log(`🔎 Web search result: ${searchResult.success ? 'SUCCESS' : 'FAILED'}`);
      if (searchResult.success) {
        console.log(`   Discovered URL: ${searchResult.career_page_url}`);
        console.log(`   Matches database: ${searchResult.career_page_url === updatedCompany.careers_url ? '✅ YES' : '❌ NO'}`);
      }
    } catch (searchError) {
      console.log(`⚠️  Web search test failed: ${searchError.message}`);
    }

  } catch (error) {
    console.error('❌ Error updating N26 in database:', error);
    console.error('Error details:', error.message);
  }

  console.log('\n🎉 N26 Database Update Complete!');
}

// Run the script
updateN26InDatabase().catch(console.error);