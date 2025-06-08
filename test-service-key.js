#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function testServiceKey() {
  console.log('🔑 Testing Supabase Service Key\n');

  // Test with anon key first
  console.log('1️⃣ Testing with anon key...');
  const anonClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
  
  try {
    const { data, error } = await anonClient.from('companies').select('count', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Anon key error: ${error.message}`);
    } else {
      console.log(`✅ Anon key works - ${data} companies accessible`);
    }
  } catch (err) {
    console.log(`❌ Anon key failed: ${err.message}`);
  }

  // Test with service key
  console.log('\n2️⃣ Testing with service key...');
  
  if (!process.env.VITE_SUPABASE_SERVICE_KEY) {
    console.log('❌ No service key found in environment');
    return;
  }
  
  console.log(`Service key length: ${process.env.VITE_SUPABASE_SERVICE_KEY.length}`);
  console.log(`Service key starts with: ${process.env.VITE_SUPABASE_SERVICE_KEY.substring(0, 10)}...`);
  
  const serviceClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_KEY
  );
  
  try {
    // Test basic read
    const { data: readData, error: readError } = await serviceClient
      .from('companies')
      .select('count', { count: 'exact', head: true });
    
    if (readError) {
      console.log(`❌ Service key read error: ${readError.message}`);
      return;
    } else {
      console.log(`✅ Service key read works - ${readData} companies`);
    }
    
    // Test insert
    const testCompany = {
      name: `Test Company ${Date.now()}`,
      description: 'Service key test company'
    };
    
    const { data: insertData, error: insertError } = await serviceClient
      .from('companies')
      .insert(testCompany)
      .select()
      .single();
    
    if (insertError) {
      console.log(`❌ Service key insert error: ${insertError.message}`);
      console.log(`Error details:`, insertError);
    } else {
      console.log(`✅ Service key insert works - Created company: ${insertData.name}`);
      
      // Clean up
      await serviceClient.from('companies').delete().eq('id', insertData.id);
      console.log(`✅ Cleanup successful`);
    }
    
  } catch (err) {
    console.log(`❌ Service key failed: ${err.message}`);
  }
}

testServiceKey();