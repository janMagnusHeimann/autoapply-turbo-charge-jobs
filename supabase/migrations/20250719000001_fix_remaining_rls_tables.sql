-- Fix remaining RLS security issues for tables that exist but weren't in original migration
-- Date: 2025-07-19
-- Purpose: Enable RLS on jobs, job_sources, crawl_history tables only

-- =============================================================================
-- PHASE 1: Handle tables that exist in database but missing from migrations
-- =============================================================================

-- These tables exist in the database but were not created through migrations
-- We need to enable RLS on them and add appropriate policies

-- Fix jobs table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'jobs') THEN
    -- Enable RLS on jobs table
    ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
    
    -- Jobs should be publicly readable (similar to job_listings)
    CREATE POLICY "Jobs are publicly readable" ON public.jobs FOR SELECT USING (true);
    
    RAISE NOTICE 'RLS enabled on jobs table';
  ELSE
    RAISE NOTICE 'jobs table does not exist, skipping';
  END IF;
END $$;

-- Fix job_sources table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_sources') THEN
    -- Enable RLS on job_sources table
    ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;
    
    -- Job sources should be publicly readable (admin-managed data)
    CREATE POLICY "Job sources are publicly readable" ON public.job_sources FOR SELECT USING (true);
    
    -- Only service role can modify job sources
    CREATE POLICY "Service can manage job sources" ON public.job_sources FOR ALL 
      USING (auth.jwt() ->> 'role' = 'service_role');
      
    RAISE NOTICE 'RLS enabled on job_sources table';
  ELSE
    RAISE NOTICE 'job_sources table does not exist, skipping';
  END IF;
END $$;

-- Fix crawl_history table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crawl_history') THEN
    -- Enable RLS on crawl_history table
    ALTER TABLE public.crawl_history ENABLE ROW LEVEL SECURITY;
    
    -- Crawl history should be publicly readable (operational data)
    CREATE POLICY "Crawl history is publicly readable" ON public.crawl_history FOR SELECT USING (true);
    
    -- Only service role can modify crawl history
    CREATE POLICY "Service can manage crawl history" ON public.crawl_history FOR ALL 
      USING (auth.jwt() ->> 'role' = 'service_role');
      
    RAISE NOTICE 'RLS enabled on crawl_history table';
  ELSE
    RAISE NOTICE 'crawl_history table does not exist, skipping';
  END IF;
END $$;

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- This migration fixes the remaining RLS security issues by:
-- 1. Conditionally enabling RLS on jobs, job_sources, crawl_history (if they exist)
-- 2. Adding appropriate policies for each table
-- 
-- Functionality preserved:
-- - Jobs remain publicly readable (like job_listings)
-- - Job sources and crawl history are publicly readable but service-managed
-- - No changes to existing user tables or policies
--
-- Tables addressed in this migration:
-- ✅ jobs (RLS enabled if exists, public read policy)
-- ✅ job_sources (RLS enabled if exists, public read + service manage)
-- ✅ crawl_history (RLS enabled if exists, public read + service manage)