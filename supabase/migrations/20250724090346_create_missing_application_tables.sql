-- Create missing tables for Application Agent
-- Only creates tables if they don't already exist

-- Application attempts table - track all automated application attempts
CREATE TABLE IF NOT EXISTS application_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  job_id TEXT NOT NULL,
  cv_choice TEXT CHECK (cv_choice IN ('generated', 'uploaded')) NOT NULL,
  cv_id TEXT,
  uploaded_cv_path TEXT,
  status TEXT CHECK (status IN ('analyzing', 'preparing', 'filling', 'reviewing', 'submitting', 'submitted', 'failed', 'cancelled')) DEFAULT 'analyzing',
  progress_percentage INTEGER DEFAULT 0,
  current_step TEXT,
  auto_submit BOOLEAN DEFAULT false,
  messages JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  filled_form_data JSONB,
  form_stored_at TIMESTAMPTZ,
  error_message TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploaded CVs table - manage user-uploaded CV files
CREATE TABLE IF NOT EXISTS uploaded_cvs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_hash TEXT NOT NULL,
  extracted_data JSONB DEFAULT '{}',
  extraction_status TEXT CHECK (extraction_status IN ('pending', 'basic', 'ai_processed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_application_attempts_user_id ON application_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_application_attempts_status ON application_attempts(status);
CREATE INDEX IF NOT EXISTS idx_application_attempts_created_at ON application_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_uploaded_cvs_user_id ON uploaded_cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_cvs_created_at ON uploaded_cvs(created_at);

-- Enable Row Level Security
ALTER TABLE application_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_cvs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for application_attempts
DROP POLICY IF EXISTS "Users can view own application attempts" ON application_attempts;
CREATE POLICY "Users can view own application attempts" ON application_attempts
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

DROP POLICY IF EXISTS "Users can insert own application attempts" ON application_attempts;
CREATE POLICY "Users can insert own application attempts" ON application_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

DROP POLICY IF EXISTS "Users can update own application attempts" ON application_attempts;
CREATE POLICY "Users can update own application attempts" ON application_attempts
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

DROP POLICY IF EXISTS "Users can delete own application attempts" ON application_attempts;
CREATE POLICY "Users can delete own application attempts" ON application_attempts
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- RLS Policies for uploaded_cvs
DROP POLICY IF EXISTS "Users can view own uploaded CVs" ON uploaded_cvs;
CREATE POLICY "Users can view own uploaded CVs" ON uploaded_cvs
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

DROP POLICY IF EXISTS "Users can insert own uploaded CVs" ON uploaded_cvs;
CREATE POLICY "Users can insert own uploaded CVs" ON uploaded_cvs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

DROP POLICY IF EXISTS "Users can update own uploaded CVs" ON uploaded_cvs;
CREATE POLICY "Users can update own uploaded CVs" ON uploaded_cvs
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

DROP POLICY IF EXISTS "Users can delete own uploaded CVs" ON uploaded_cvs;
CREATE POLICY "Users can delete own uploaded CVs" ON uploaded_cvs
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);
