// Script to fix N26 career URL in Supabase database
// Run with: node fix-n26-career-url.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixN26CareerUrl() {
  console.log('🔧 Fixing N26 Career URL in Database');
  console.log('==================================\n');

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration. Check .env file.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Updating N26 career URL to web search discovered URL...');
    const { data: updatedCompany, error: updateError } = await supabase
      .from('companies')
      .update({
        careers_url: 'https://n26.com/en-eu/careers'
      })
      .eq('name', 'N26')
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Successfully updated N26 career URL!');
    console.log(`   New careers URL: ${updatedCompany.careers_url}`);

    // Test the updated URL
    console.log('\n🧪 Testing updated career page URL...');
    const response = await fetch(updatedCompany.careers_url, { 
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)' }
    });
    
    console.log(`✅ Career page status: ${response.status} ${response.statusText}`);

  } catch (error) {
    console.error('❌ Error fixing N26 career URL:', error);
    console.error('Error details:', error.message);
  }

  console.log('\n🎉 N26 Career URL Fix Complete!');
}

// Run the script
fixN26CareerUrl().catch(console.error);