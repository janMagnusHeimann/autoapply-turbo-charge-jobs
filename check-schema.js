#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkSchema() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  try {
    // Check companies table structure
    console.log('🔍 Checking companies table structure...');
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error:', error.message);
      return;
    }

    if (data && data.length > 0) {
      console.log('Companies table columns:', Object.keys(data[0]));
    } else {
      console.log('Companies table exists but is empty');
      // Try to get schema info another way
      const { data: testInsert, error: testError } = await supabase
        .from('companies')
        .insert({ name: 'Test Schema Check' })
        .select()
        .single();
      
      if (testError) {
        console.log('Test insert error (this shows what columns exist):', testError.message);
      } else {
        console.log('Test insert successful, columns:', Object.keys(testInsert));
        // Clean up
        await supabase.from('companies').delete().eq('id', testInsert.id);
      }
    }

  } catch (error) {
    console.error('Schema check failed:', error.message);
  }
}

checkSchema();