#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkCurrentData() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  try {
    // Check companies
    const { data: companies, error: compError } = await supabase
      .from('companies')
      .select('id, name')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`📊 Companies: ${companies?.length || 0} total`);
    companies?.forEach(company => {
      console.log(`   • ${company.name}`);
    });

    // Check jobs
    const { data: jobs, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, companies(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`\n💼 Jobs: ${jobs?.length || 0} total`);
    jobs?.forEach(job => {
      console.log(`   • ${job.title} at ${job.companies?.name || 'Unknown'}`);
    });

    // Check job sources
    const { data: sources, error: sourceError } = await supabase
      .from('job_sources')
      .select('name, is_active')
      .order('created_at', { ascending: false });
    
    console.log(`\n🌐 Job Sources: ${sources?.length || 0} total`);
    sources?.forEach(source => {
      console.log(`   • ${source.name} (${source.is_active ? 'Active' : 'Inactive'})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCurrentData();