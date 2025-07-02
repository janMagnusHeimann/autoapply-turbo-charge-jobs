-- Quick fix: Update RLS policies for demo user access
-- Run this directly in Supabase SQL editor

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