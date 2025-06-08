#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function listSources() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  const { data: sources, error } = await supabase
    .from('job_sources')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('📋 Available job sources:');
  sources.forEach((source, index) => {
    console.log(`${index + 1}. "${source.name}"`);
    console.log(`   URL: ${source.url}`);
    console.log(`   Type: ${source.type}`);
    console.log(`   Active: ${source.is_active ? 'Yes' : 'No'}`);
    console.log('');
  });
}

listSources();