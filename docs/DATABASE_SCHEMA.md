# Database Schema Documentation

## Overview
This document describes the Supabase database schema for the AutoApply application. The schema is designed for scalability and supports multiple users with proper data isolation.

## Database Design Principles

### 1. Row Level Security (RLS)
- All user-related tables have RLS enabled
- Users can only access their own data
- Company and job listing data is publicly readable

### 2. User Isolation
- Every user-related table has a `user_id` foreign key
- All queries are automatically scoped to the authenticated user
- Prevents data leakage between users

### 3. Performance Optimization
- Strategic indexes on frequently queried columns
- JSONB for flexible metadata storage
- Efficient foreign key relationships

## Tables

### 1. `public.users`
Extends the built-in `auth.users` table with application-specific user data.

```sql
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  github_username TEXT,
  scholar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Store user profile information
**RLS**: Users can only see/modify their own profile
**Indexes**: Primary key on `id`

### 2. `public.companies`
Master table of companies for job applications.

```sql
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
```

**Purpose**: Store company information for job targeting
**RLS**: Publicly readable (no RLS)
**Indexes**: Primary key on `id`

### 3. `public.cv_assets`
Flexible storage for user's CV components (experience, education, projects, etc.).

```sql
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
```

**Purpose**: Store all CV components with flexible metadata
**RLS**: Users can only access their own CV assets
**Indexes**: 
- `idx_cv_assets_user_id` on `user_id`
- `idx_cv_assets_type` on `asset_type`

**Metadata Examples**:
- Experience: `{ company, position, startDate, endDate, location, achievements, current }`
- Education: `{ institution, degree, field, startDate, endDate, gpa, current }`
- Other: `{ organization, role, startDate, endDate, category, achievements, current }`

### 4. `public.job_listings`
Jobs discovered by the automation system.

```sql
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
```

**Purpose**: Store discovered job opportunities
**RLS**: Publicly readable
**Indexes**: 
- `idx_job_listings_company_id` on `company_id`
- `idx_job_listings_posted_date` on `posted_date`

### 5. `public.user_preferences`
User's job search preferences and criteria.

```sql
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
```

**Purpose**: Store user's job search preferences
**RLS**: Users can only access their own preferences
**Constraints**: One preference record per user

### 6. `public.pending_applications`
Applications waiting for user review before submission.

```sql
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
```

**Purpose**: Store applications pending user approval
**RLS**: Users can only access their own pending applications
**Indexes**: 
- `idx_pending_applications_user_id` on `user_id`
- `idx_pending_applications_status` on `status`

### 7. `public.application_history`
Record of submitted applications and their outcomes.

```sql
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
```

**Purpose**: Track application history and outcomes
**RLS**: Users can only access their own application history
**Indexes**: 
- `idx_application_history_user_id` on `user_id`
- `idx_application_history_status` on `status`

## Database Functions

### 1. `handle_new_user()`
Automatically creates a user profile when a new user signs up via Supabase Auth.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. `update_updated_at_column()`
Automatically updates the `updated_at` timestamp on record modifications.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Database Triggers

### 1. User Creation Trigger
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. Updated At Triggers
Applied to all tables with `updated_at` columns:
- `update_users_updated_at`
- `update_cv_assets_updated_at`
- `update_user_preferences_updated_at`
- `update_pending_applications_updated_at`
- `update_application_history_updated_at`

## Row Level Security Policies

### User Table Policies
```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);
```

### CV Assets Policies
```sql
-- Full CRUD access to own CV assets
CREATE POLICY "Users can view own cv_assets" ON public.cv_assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cv_assets" ON public.cv_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cv_assets" ON public.cv_assets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cv_assets" ON public.cv_assets
  FOR DELETE USING (auth.uid() = user_id);
```

### Similar patterns for:
- `user_preferences`
- `pending_applications`
- `application_history`

### Public Data Policies
```sql
-- Companies and job listings are publicly readable
CREATE POLICY "Companies are publicly readable" ON public.companies
  FOR SELECT USING (true);

CREATE POLICY "Job listings are publicly readable" ON public.job_listings
  FOR SELECT USING (true);
```

## Scalability Considerations

### 1. Indexing Strategy
- All foreign keys are indexed
- Frequently queried columns have dedicated indexes
- Composite indexes for complex queries

### 2. Data Partitioning Ready
- UUIDs for distributed scaling
- Timestamp columns for time-based partitioning
- User-based data isolation

### 3. Query Optimization
- RLS policies use efficient UUID comparisons
- JSONB metadata for flexible schema evolution
- Array types for list data (tags, skills, etc.)

### 4. Storage Efficiency
- TEXT fields for variable-length content
- CHECK constraints for data validation
- Normalized company/job data to avoid duplication

## Migration Files

The complete schema is implemented in:
- `/supabase/migrations/001_initial_schema.sql` - Main schema creation
- `/supabase/seed.sql` - Demo data for development (optional)