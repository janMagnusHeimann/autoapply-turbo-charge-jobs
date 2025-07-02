-- Migration: Add demo user access to all RLS policies
-- This allows the demo user to access all tables without authentication
-- for development and testing purposes

-- Drop existing policies and recreate with demo user access
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id OR id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id OR id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- CV Assets policies
DROP POLICY IF EXISTS "Users can view own cv_assets" ON public.cv_assets;
DROP POLICY IF EXISTS "Users can insert own cv_assets" ON public.cv_assets;
DROP POLICY IF EXISTS "Users can update own cv_assets" ON public.cv_assets;
DROP POLICY IF EXISTS "Users can delete own cv_assets" ON public.cv_assets;

CREATE POLICY "Users can view own cv_assets" ON public.cv_assets
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own cv_assets" ON public.cv_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own cv_assets" ON public.cv_assets
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete own cv_assets" ON public.cv_assets
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- User preferences policies
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;

CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Pending applications policies
DROP POLICY IF EXISTS "Users can view own pending_applications" ON public.pending_applications;
DROP POLICY IF EXISTS "Users can insert own pending_applications" ON public.pending_applications;
DROP POLICY IF EXISTS "Users can update own pending_applications" ON public.pending_applications;
DROP POLICY IF EXISTS "Users can delete own pending_applications" ON public.pending_applications;

CREATE POLICY "Users can view own pending_applications" ON public.pending_applications
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own pending_applications" ON public.pending_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own pending_applications" ON public.pending_applications
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete own pending_applications" ON public.pending_applications
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Application history policies
DROP POLICY IF EXISTS "Users can view own application_history" ON public.application_history;
DROP POLICY IF EXISTS "Users can insert own application_history" ON public.application_history;

CREATE POLICY "Users can view own application_history" ON public.application_history
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own application_history" ON public.application_history
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Update GitHub-related policies if they exist
DROP POLICY IF EXISTS "Users can manage their own GitHub data" ON public.user_preferences;
CREATE POLICY "Users can manage their own GitHub data" ON public.user_preferences
  FOR ALL
  USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Update selected repositories policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'selected_repositories') THEN
        DROP POLICY IF EXISTS "Users can view their own selected repositories" ON selected_repositories;
        DROP POLICY IF EXISTS "Users can insert their own selected repositories" ON selected_repositories;
        DROP POLICY IF EXISTS "Users can update their own selected repositories" ON selected_repositories;
        DROP POLICY IF EXISTS "Users can delete their own selected repositories" ON selected_repositories;

        CREATE POLICY "Users can view their own selected repositories" ON selected_repositories
          FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

        CREATE POLICY "Users can insert their own selected repositories" ON selected_repositories
          FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

        CREATE POLICY "Users can update their own selected repositories" ON selected_repositories
          FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

        CREATE POLICY "Users can delete their own selected repositories" ON selected_repositories
          FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);
    END IF;
END $$;

-- Update Google Scholar policies if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'google_scholar_connections') THEN
        DROP POLICY IF EXISTS "Users can view their own Google Scholar connection" ON google_scholar_connections;
        DROP POLICY IF EXISTS "Users can insert their own Google Scholar connection" ON google_scholar_connections;
        DROP POLICY IF EXISTS "Users can update their own Google Scholar connection" ON google_scholar_connections;
        DROP POLICY IF EXISTS "Users can delete their own Google Scholar connection" ON google_scholar_connections;

        CREATE POLICY "Users can view their own Google Scholar connection" ON google_scholar_connections
          FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

        CREATE POLICY "Users can insert their own Google Scholar connection" ON google_scholar_connections
          FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

        CREATE POLICY "Users can update their own Google Scholar connection" ON google_scholar_connections
          FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

        CREATE POLICY "Users can delete their own Google Scholar connection" ON google_scholar_connections
          FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'selected_publications') THEN
        DROP POLICY IF EXISTS "Users can view their own selected publications" ON selected_publications;
        DROP POLICY IF EXISTS "Users can insert their own selected publications" ON selected_publications;
        DROP POLICY IF EXISTS "Users can update their own selected publications" ON selected_publications;
        DROP POLICY IF EXISTS "Users can delete their own selected publications" ON selected_publications;

        CREATE POLICY "Users can view their own selected publications" ON selected_publications
          FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

        CREATE POLICY "Users can insert their own selected publications" ON selected_publications
          FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

        CREATE POLICY "Users can update their own selected publications" ON selected_publications
          FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

        CREATE POLICY "Users can delete their own selected publications" ON selected_publications
          FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);
    END IF;
END $$;