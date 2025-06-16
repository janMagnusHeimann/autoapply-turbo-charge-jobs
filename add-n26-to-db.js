// Script to add N26 company to Supabase database
// Run with: node add-n26-to-db.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function addN26ToDatabase() {
  console.log('🏦 Adding N26 to Supabase Database');
  console.log('================================\n');

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration. Check .env file.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if N26 already exists
    console.log('🔍 Checking if N26 already exists...');
    const { data: existingCompany, error: checkError } = await supabase
      .from('companies')
      .select('*')
      .eq('name', 'N26')
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw checkError;
    }

    if (existingCompany) {
      console.log('⚠️  N26 already exists in database:');
      console.log(`   ID: ${existingCompany.id}`);
      console.log(`   Name: ${existingCompany.name}`);
      console.log(`   Website: ${existingCompany.website_url}`);
      console.log(`   Careers URL: ${existingCompany.careers_url}`);
      console.log('\n✅ No action needed - N26 already in database!');
      return;
    }

    // Add N26 to the database
    console.log('➕ Adding N26 to companies table...');
    const { data: newCompany, error: insertError } = await supabase
      .from('companies')
      .insert({
        id: '550e8400-e29b-41d4-a716-446655440011',
        name: 'N26',
        description: 'Digital bank offering mobile banking services across Europe and the US with innovative financial products',
        industry: 'Fintech',
        size_category: 'large',
        website_url: 'https://n26.com',
        careers_url: 'https://n26.com/en/careers',
        headquarters: 'Berlin, Germany',
        founded_year: 2013
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log('✅ Successfully added N26 to database!');
    console.log('\n📊 Company Details:');
    console.log(`   ID: ${newCompany.id}`);
    console.log(`   Name: ${newCompany.name}`);
    console.log(`   Industry: ${newCompany.industry}`);
    console.log(`   Size: ${newCompany.size_category}`);
    console.log(`   Website: ${newCompany.website_url}`);
    console.log(`   Careers URL: ${newCompany.careers_url}`);
    console.log(`   Headquarters: ${newCompany.headquarters}`);
    console.log(`   Founded: ${newCompany.founded_year}`);
    console.log(`   Created: ${newCompany.created_at}`);

    // Verify the company was added
    console.log('\n🧪 Verifying company was added...');
    const { data: verifyCompany, error: verifyError } = await supabase
      .from('companies')
      .select('*')
      .eq('name', 'N26')
      .single();

    if (verifyError) {
      throw verifyError;
    }

    console.log('✅ Verification successful - N26 found in database!');

    // Check total companies count
    const { data: allCompanies, error: countError } = await supabase
      .from('companies')
      .select('name', { count: 'exact' });

    if (countError) {
      throw countError;
    }

    console.log(`\n📈 Total companies in database: ${allCompanies.length}`);
    console.log('📋 All companies:');
    allCompanies.forEach((company, index) => {
      console.log(`   ${index + 1}. ${company.name}`);
    });

  } catch (error) {
    console.error('❌ Error adding N26 to database:', error);
    console.error('Error details:', error.message);
  }

  console.log('\n🎉 N26 Database Addition Complete!');
}

// Run the script
addN26ToDatabase().catch(console.error);