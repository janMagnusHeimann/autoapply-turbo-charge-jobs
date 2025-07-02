-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  github_username TEXT,
  scholar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create companies table
CREATE TABLE public.companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  size_category TEXT CHECK (size_category IN ('startup', 'small', 'medium', 'large', 'enterprise')),
  website_url TEXT,
  careers_url TEXT,
  logo_url TEXT,
  headquarters TEXT,
  founded_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cv_assets table
CREATE TABLE public.cv_assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  asset_type TEXT CHECK (asset_type IN ('repository', 'publication', 'skill', 'experience', 'education', 'other')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  tags TEXT[],
  external_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job_listings table
CREATE TABLE public.job_listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  location TEXT,
  salary_range TEXT,
  job_type TEXT CHECK (job_type IN ('full-time', 'part-time', 'contract', 'intern')),
  remote_option TEXT CHECK (remote_option IN ('on-site', 'remote', 'hybrid')),
  external_url TEXT,
  posted_date TIMESTAMP WITH TIME ZONE,
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_preferences table
CREATE TABLE public.user_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  preferred_locations TEXT[],
  preferred_remote TEXT CHECK (preferred_remote IN ('on-site', 'remote', 'hybrid', 'any')),
  preferred_job_types TEXT[],
  min_salary INTEGER,
  max_salary INTEGER,
  preferred_industries TEXT[],
  preferred_company_sizes TEXT[],
  skills TEXT[],
  excluded_companies UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create pending_applications table
CREATE TABLE public.pending_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  job_listing_id UUID REFERENCES public.job_listings(id) ON DELETE CASCADE NOT NULL,
  generated_cv_url TEXT,
  cover_letter TEXT,
  match_score DECIMAL(3,2),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create application_history table
CREATE TABLE public.application_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  job_listing_id UUID REFERENCES public.job_listings(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  submitted_cv_url TEXT,
  cover_letter TEXT,
  submission_method TEXT CHECK (submission_method IN ('email', 'api', 'portal')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('submitted', 'acknowledged', 'rejected', 'interview', 'offer')) DEFAULT 'submitted',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_cv_assets_user_id ON public.cv_assets(user_id);
CREATE INDEX idx_cv_assets_type ON public.cv_assets(asset_type);
CREATE INDEX idx_job_listings_company_id ON public.job_listings(company_id);
CREATE INDEX idx_job_listings_posted_date ON public.job_listings(posted_date);
CREATE INDEX idx_pending_applications_user_id ON public.pending_applications(user_id);
CREATE INDEX idx_pending_applications_status ON public.pending_applications(status);
CREATE INDEX idx_application_history_user_id ON public.application_history(user_id);
CREATE INDEX idx_application_history_status ON public.application_history(status);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id OR id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id OR id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- CV Assets policies
CREATE POLICY "Users can view own cv_assets" ON public.cv_assets
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own cv_assets" ON public.cv_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own cv_assets" ON public.cv_assets
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete own cv_assets" ON public.cv_assets
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Pending applications policies
CREATE POLICY "Users can view own pending_applications" ON public.pending_applications
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own pending_applications" ON public.pending_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own pending_applications" ON public.pending_applications
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete own pending_applications" ON public.pending_applications
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Application history policies
CREATE POLICY "Users can view own application_history" ON public.application_history
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own application_history" ON public.application_history
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Companies and job listings are publicly readable
CREATE POLICY "Companies are publicly readable" ON public.companies
  FOR SELECT USING (true);

CREATE POLICY "Job listings are publicly readable" ON public.job_listings
  FOR SELECT USING (true);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating timestamps
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cv_assets_updated_at
  BEFORE UPDATE ON public.cv_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pending_applications_updated_at
  BEFORE UPDATE ON public.pending_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_application_history_updated_at
  BEFORE UPDATE ON public.application_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();