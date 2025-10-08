#!/usr/bin/env node

/**
 * Database setup script for AutoApply
 * This script helps users set up their Supabase database with the required schema
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please ensure these environment variables are set in your .env file:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_SERVICE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupDatabase() {
  console.log('🚀 Verifying AutoApply database connectivity...\n');

  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const { data, error } = await supabase.from('_supabase_migrations').select('*').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    console.log('✅ Database connection successful\n');

    // Verify minimal required tables
    console.log('\n🔍 Verifying minimal database tables...');
    const tables = [
      'companies',
      'job_listings',
      'users',
      'user_profiles',
      'user_preferences',
      'cv_assets',
      'cv_generations',
      'application_attempts',
      'application_history',
      'selected_repositories',
      'selected_publications',
      'google_scholar_connections',
      'events'
    ];
    const verificationResults = await Promise.allSettled(
      tables.map(async (table) => {
        const { error } = await supabase.from(table).select('*').limit(1);
        return { table, success: !error };
      })
    );

    let allTablesExist = true;
    for (const result of verificationResults) {
      if (result.status === 'fulfilled') {
        const { table, success } = result.value;
        if (success) {
          console.log(`✅ Table '${table}' exists and is accessible`);
        } else {
          console.log(`❌ Table '${table}' is not accessible`);
          allTablesExist = false;
        }
      }
    }

    if (allTablesExist) {
      console.log('\n🎉 Database connectivity verified!');
      console.log('\nNext steps:');
      console.log('- Apply migrations in order (Supabase SQL editor or CLI): supabase/migrations/*.sql');
      console.log('- Optional: run seed SQL for demo data: supabase/seed.sql');
      console.log('- Then start the app: npm run dev:full');
    } else {
      console.log('\n⚠️  Some tables may not be accessible.');
      console.log('This could be due to RLS policies or permission issues.');
      console.log('The application should still work for basic functionality.');
    }

  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    console.log('\n💡 Setup instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL editor');
    console.log('3. Apply migrations from supabase/migrations in order');
    console.log('4. Optionally run supabase/seed.sql for demo data');
    process.exit(1);
  }
}

function getProjectId() {
  try {
    return SUPABASE_URL.split('://')[1].split('.')[0];
  } catch {
    return 'your-project';
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase();
}
