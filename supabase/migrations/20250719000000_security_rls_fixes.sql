-- Security fixes for Supabase RLS issues
-- Date: 2025-07-19
-- Purpose: Enable RLS on all public tables and fix function security issues

-- =============================================================================
-- PHASE 1: Enable RLS on tables that have policies but RLS is disabled
-- =============================================================================

-- Fix companies table: has policies but RLS not enabled
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Fix job_listings table: has policies but RLS not enabled  
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PHASE 2: Enable RLS and add policies for user-related tables
-- =============================================================================

-- Fix user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete own profile" ON public.user_profiles
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Fix cv_generations table
ALTER TABLE public.cv_generations ENABLE ROW LEVEL SECURITY;

-- CV generations policies
CREATE POLICY "Users can view own cv_generations" ON public.cv_generations
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own cv_generations" ON public.cv_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own cv_generations" ON public.cv_generations
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete own cv_generations" ON public.cv_generations
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Fix github_projects table
ALTER TABLE public.github_projects ENABLE ROW LEVEL SECURITY;

-- GitHub projects policies
CREATE POLICY "Users can view own github_projects" ON public.github_projects
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own github_projects" ON public.github_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own github_projects" ON public.github_projects
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete own github_projects" ON public.github_projects
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Fix user_skills table
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- User skills policies
CREATE POLICY "Users can view own user_skills" ON public.user_skills
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own user_skills" ON public.user_skills
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own user_skills" ON public.user_skills
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete own user_skills" ON public.user_skills
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Fix publications table
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

-- Publications policies
CREATE POLICY "Users can view own publications" ON public.publications
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own publications" ON public.publications
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own publications" ON public.publications
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete own publications" ON public.publications
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Fix work_experiences table
ALTER TABLE public.work_experiences ENABLE ROW LEVEL SECURITY;

-- Work experiences policies
CREATE POLICY "Users can view own work_experiences" ON public.work_experiences
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own work_experiences" ON public.work_experiences
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own work_experiences" ON public.work_experiences
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete own work_experiences" ON public.work_experiences
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- =============================================================================
-- PHASE 3: Handle tables that exist in database but missing from migrations
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
  END IF;
END $$;

-- =============================================================================
-- PHASE 4: Fix function security issues
-- =============================================================================

-- Fix handle_new_user function search_path security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Fix update_updated_at_column function search_path security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- This migration fixes all RLS security issues by:
-- 1. Enabling RLS on companies and job_listings (they keep their public policies)
-- 2. Enabling RLS and adding user-scoped policies for 6 user-related tables
-- 3. Conditionally enabling RLS on jobs, job_sources, crawl_history (if they exist)
-- 4. Fixing function search_path security vulnerabilities
-- 
-- All existing functionality is preserved:
-- - Companies, job listings, jobs remain publicly readable
-- - Job sources and crawl history are publicly readable but service-managed
-- - Users can only access their own data
-- - Demo user access is maintained
-- - All CRUD operations work as before
--
-- Tables addressed:
-- ✅ companies (RLS enabled, public read policy)
-- ✅ job_listings (RLS enabled, public read policy) 
-- ✅ jobs (RLS enabled if exists, public read policy)
-- ✅ job_sources (RLS enabled if exists, public read + service manage)
-- ✅ crawl_history (RLS enabled if exists, public read + service manage)
-- ✅ user_profiles (RLS + user-scoped policies)
-- ✅ cv_generations (RLS + user-scoped policies)
-- ✅ github_projects (RLS + user-scoped policies)
-- ✅ user_skills (RLS + user-scoped policies)
-- ✅ publications (RLS + user-scoped policies)
-- ✅ work_experiences (RLS + user-scoped policies)