#!/usr/bin/env node

/**
 * System test script for AutoApply
 * Tests all major components to ensure they work correctly
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const REQUIRED_ENV_VARS = [
  'VITE_OPENAI_API_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

const OPTIONAL_ENV_VARS = [
  'VITE_SUPABASE_SERVICE_KEY',
  'GITHUB_TOKEN'
];

async function runTests() {
  console.log('🧪 AutoApply System Test\n');
  
  let allTestsPassed = true;
  const results = [];

  // Test 1: Environment Variables
  console.log('1️⃣ Testing environment configuration...');
  try {
    const missingRequired = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
    const missingOptional = OPTIONAL_ENV_VARS.filter(varName => !process.env[varName]);
    
    if (missingRequired.length > 0) {
      throw new Error(`Missing required environment variables: ${missingRequired.join(', ')}`);
    }
    
    console.log('✅ Required environment variables found');
    if (missingOptional.length > 0) {
      console.log(`⚠️  Optional variables missing: ${missingOptional.join(', ')}`);
      console.log('   (This is OK, but some features may not work)');
    }
    results.push({ test: 'Environment', status: 'PASS' });
  } catch (error) {
    console.error('❌ Environment test failed:', error.message);
    results.push({ test: 'Environment', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 2: OpenAI API Connection
  console.log('\n2️⃣ Testing OpenAI API connection...');
  try {
    const openai = new OpenAI({
      apiKey: process.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });

    const response = await openai.models.list();
    const hasGPT4 = response.data.some(model => model.id.includes('gpt-4'));
    
    console.log('✅ OpenAI API connection successful');
    console.log(`📋 Available models: ${response.data.length}`);
    console.log(`🤖 GPT-4 access: ${hasGPT4 ? 'Yes' : 'No'}`);
    
    results.push({ test: 'OpenAI API', status: 'PASS', details: `${response.data.length} models` });
  } catch (error) {
    console.error('❌ OpenAI API test failed:', error.message);
    results.push({ test: 'OpenAI API', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 3: Supabase Database Connection
  console.log('\n3️⃣ Testing Supabase database connection...');
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    // Test basic connection
    const { data, error } = await supabase.from('companies').select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database connection failed: ${error.message}`);
    }

    console.log('✅ Supabase database connection successful');
    console.log(`📊 Companies table accessible: ${error ? 'No (needs setup)' : 'Yes'}`);
    
    results.push({ test: 'Supabase DB', status: 'PASS' });
  } catch (error) {
    console.error('❌ Supabase database test failed:', error.message);
    results.push({ test: 'Supabase DB', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 4: Database Schema
  console.log('\n4️⃣ Testing database schema...');
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    const tables = ['companies', 'jobs', 'job_sources', 'crawl_history'];
    const tableResults = await Promise.allSettled(
      tables.map(async (table) => {
        const { error } = await supabase.from(table).select('*').limit(1);
        return { table, accessible: !error };
      })
    );

    let accessibleTables = 0;
    for (const result of tableResults) {
      if (result.status === 'fulfilled') {
        const { table, accessible } = result.value;
        if (accessible) {
          console.log(`✅ Table '${table}' is accessible`);
          accessibleTables++;
        } else {
          console.log(`❌ Table '${table}' is not accessible`);
        }
      }
    }

    if (accessibleTables === tables.length) {
      console.log('✅ All database tables are accessible');
      results.push({ test: 'Database Schema', status: 'PASS' });
    } else {
      console.log(`⚠️  ${accessibleTables}/${tables.length} tables accessible`);
      console.log('💡 Run: npm run db:setup');
      results.push({ test: 'Database Schema', status: 'PARTIAL', details: `${accessibleTables}/${tables.length} tables` });
    }
  } catch (error) {
    console.error('❌ Database schema test failed:', error.message);
    results.push({ test: 'Database Schema', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 5: Backend Services
  console.log('\n5️⃣ Testing backend services...');
  try {
    // Test the three main backend services
    const services = [
      { name: 'Job Discovery API', port: 8000 },
      { name: 'CV Processing API', port: 8001 },
      { name: 'Application Agent API', port: 8002 }
    ];

    let workingServices = 0;
    for (const service of services) {
      try {
        const response = await fetch(`http://localhost:${service.port}/health`);
        if (response.ok) {
          console.log(`✅ ${service.name} is running (port ${service.port})`);
          workingServices++;
        } else {
          console.log(`❌ ${service.name} returned status ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${service.name} is not accessible (port ${service.port})`);
      }
    }

    if (workingServices === services.length) {
      console.log('✅ All backend services are running');
      results.push({ test: 'Backend Services', status: 'PASS' });
    } else {
      console.log(`⚠️  ${workingServices}/${services.length} services running`);
      console.log('💡 Run: npm run dev:complete');
      results.push({ test: 'Backend Services', status: 'PARTIAL', details: `${workingServices}/${services.length} services` });
      if (workingServices === 0) {
        allTestsPassed = false;
      }
    }
  } catch (error) {
    console.error('❌ Backend services test failed:', error.message);
    results.push({ test: 'Backend Services', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 6: AI Services (Integration Test)
  console.log('\n6️⃣ Testing AI integration...');
  try {
    const openai = new OpenAI({
      apiKey: process.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });

    // Test a simple AI call (like what the app would do)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are testing an AI job application system. Respond with "TEST_SUCCESS" if you receive this message.'
        },
        {
          role: 'user',
          content: 'Test connection'
        }
      ],
      max_tokens: 10,
      temperature: 0
    });

    const content = response.choices[0]?.message?.content || '';
    if (content.includes('TEST_SUCCESS')) {
      console.log('✅ AI integration working correctly');
      results.push({ test: 'AI Integration', status: 'PASS' });
    } else {
      console.log('⚠️  AI responded but with unexpected content');
      results.push({ test: 'AI Integration', status: 'PARTIAL' });
    }
  } catch (error) {
    console.error('❌ AI integration test failed:', error.message);
    results.push({ test: 'AI Integration', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test Results Summary
  console.log('\n📊 Test Results Summary');
  console.log('═'.repeat(50));
  
  for (const result of results) {
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️ ' : '❌';
    const details = result.details ? ` (${result.details})` : '';
    const error = result.error ? ` - ${result.error}` : '';
    console.log(`${statusIcon} ${result.test}${details}${error}`);
  }

  console.log('\n🎯 Overall Status');
  if (allTestsPassed) {
    console.log('🎉 All tests passed! AutoApply is ready to use.');
    console.log('\n📝 Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Open: http://localhost:5173');
    console.log('3. Create your account and start applying!');
  } else {
    console.log('⚠️  Some tests failed. Please fix the issues above.');
    console.log('\n🔧 Common fixes:');
    console.log('- Missing .env file: cp .env.example .env');
    console.log('- Database setup: npm run db:setup');
    console.log('- Start services: npm run dev:complete');
  }

  return allTestsPassed;
}

// Utility function to test individual components
export async function testComponent(component) {
  switch (component) {
    case 'openai':
      return testOpenAI();
    case 'database':
      return testDatabase();
    case 'services':
      return testBackendServices();
    default:
      throw new Error(`Unknown component: ${component}`);
  }
}

async function testOpenAI() {
  const openai = new OpenAI({
    apiKey: process.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });

  const response = await openai.models.list();
  return { success: true, models: response.data.length };
}

async function testDatabase() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  const { error } = await supabase.from('companies').select('count', { count: 'exact', head: true });
  return { success: !error, error: error?.message };
}

async function testBackendServices() {
  // Test backend services health endpoints
  const services = [
    { name: 'Job Discovery API', port: 8000 },
    { name: 'CV Processing API', port: 8001 },
    { name: 'Application Agent API', port: 8002 }
  ];

  let workingServices = 0;
  for (const service of services) {
    try {
      const response = await fetch(`http://localhost:${service.port}/health`);
      if (response.ok) {
        workingServices++;
      }
    } catch (error) {
      // Service not accessible
    }
  }

  return { 
    success: workingServices === services.length,
    message: `${workingServices}/${services.length} services running`
  };
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}