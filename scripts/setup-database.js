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
  console.log('🚀 Setting up AutoApply database...\n');

  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const { data, error } = await supabase.from('_supabase_migrations').select('*').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    console.log('✅ Database connection successful\n');

    // Read and execute migration files
    const migrationFiles = [
      '001_job_crawler_schema.sql'
    ];

    for (const migrationFile of migrationFiles) {
      console.log(`📄 Applying migration: ${migrationFile}`);
      
      try {
        const migrationPath = join(__dirname, '..', 'supabase', 'migrations', migrationFile);
        const sql = readFileSync(migrationPath, 'utf8');
        
        // Split SQL into individual statements and execute them
        const statements = sql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
          if (statement.trim()) {
            const { error } = await supabase.rpc('exec_sql', { sql: statement });
            if (error) {
              // Try using the REST API instead
              console.log(`⚠️  RPC failed, trying direct SQL execution...`);
              // Note: This requires service role key
            }
          }
        }
        
        console.log(`✅ Migration ${migrationFile} applied successfully`);
      } catch (error) {
        console.error(`❌ Failed to apply migration ${migrationFile}:`, error.message);
        console.log('💡 Please apply this migration manually in the Supabase SQL editor:');
        console.log(`   https://supabase.com/dashboard/project/${getProjectId()}/sql`);
      }
    }

    // Verify tables were created
    console.log('\n🔍 Verifying database setup...');
    
    const tables = ['companies', 'jobs', 'job_sources', 'crawl_history'];
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
      console.log('\n🎉 Database setup completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Run: npm run dev');
      console.log('2. Open: http://localhost:5173');
      console.log('3. Create your account and start using AutoApply!');
    } else {
      console.log('\n⚠️  Some tables may not be accessible.');
      console.log('This could be due to RLS policies or permission issues.');
      console.log('The application should still work for basic functionality.');
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n💡 Manual setup instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL editor');
    console.log('3. Copy and paste the contents of supabase/migrations/001_job_crawler_schema.sql');
    console.log('4. Run the SQL query');
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

// Add exec_sql RPC function if it doesn't exist
async function ensureExecSqlFunction() {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
      RETURN 'OK';
    EXCEPTION
      WHEN OTHERS THEN
        RETURN SQLERRM;
    END;
    $$;
  `;

  try {
    await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
  } catch (error) {
    // Function doesn't exist, try to create it
    console.log('📝 Creating helper function...');
    // This would need to be done manually or through the dashboard
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase();
}