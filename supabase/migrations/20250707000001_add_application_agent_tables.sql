-- Application Agent Database Schema
-- Tables for automated job application tracking and management

-- Application attempts table - track all automated application attempts
CREATE TABLE application_attempts (
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
CREATE TABLE uploaded_cvs (
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

-- Form templates table - store analyzed form patterns for reuse
CREATE TABLE form_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  domain TEXT NOT NULL,
  form_url_pattern TEXT,
  form_type TEXT CHECK (form_type IN ('ats', 'custom', 'simple', 'complex')) NOT NULL,
  fields JSONB NOT NULL,
  file_uploads JSONB DEFAULT '[]',
  required_fields JSONB DEFAULT '[]',
  multi_step BOOLEAN DEFAULT false,
  captcha_present BOOLEAN DEFAULT false,
  estimated_difficulty TEXT CHECK (estimated_difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  success_rate DECIMAL(3,2) DEFAULT 0.0,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain, form_url_pattern)
);

-- Application screenshots table - store screenshots for review and debugging
CREATE TABLE application_screenshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  application_attempt_id UUID REFERENCES application_attempts(id) ON DELETE CASCADE NOT NULL,
  screenshot_type TEXT CHECK (screenshot_type IN ('initial', 'filled', 'pre_submit', 'post_submit', 'error')) NOT NULL,
  image_data TEXT, -- base64 encoded image
  image_url TEXT, -- or URL to stored image
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Application logs table - detailed logging for debugging
CREATE TABLE application_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  application_attempt_id UUID REFERENCES application_attempts(id) ON DELETE CASCADE NOT NULL,
  level TEXT CHECK (level IN ('debug', 'info', 'warning', 'error')) NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_application_attempts_user_id ON application_attempts(user_id);
CREATE INDEX idx_application_attempts_status ON application_attempts(status);
CREATE INDEX idx_application_attempts_created_at ON application_attempts(created_at);
CREATE INDEX idx_uploaded_cvs_user_id ON uploaded_cvs(user_id);
CREATE INDEX idx_uploaded_cvs_created_at ON uploaded_cvs(created_at);
CREATE INDEX idx_form_templates_domain ON form_templates(domain);
CREATE INDEX idx_form_templates_success_rate ON form_templates(success_rate);
CREATE INDEX idx_application_screenshots_attempt_id ON application_screenshots(application_attempt_id);
CREATE INDEX idx_application_logs_attempt_id ON application_logs(application_attempt_id);
CREATE INDEX idx_application_logs_level ON application_logs(level);

-- Enable Row Level Security
ALTER TABLE application_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for application_attempts
CREATE POLICY "Users can view own application attempts" ON application_attempts
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own application attempts" ON application_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own application attempts" ON application_attempts
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete own application attempts" ON application_attempts
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- RLS Policies for uploaded_cvs
CREATE POLICY "Users can view own uploaded CVs" ON uploaded_cvs
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert own uploaded CVs" ON uploaded_cvs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update own uploaded CVs" ON uploaded_cvs
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete own uploaded CVs" ON uploaded_cvs
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Form templates are readable by all authenticated users (for reuse)
CREATE POLICY "Form templates are publicly readable" ON form_templates
  FOR SELECT USING (true);

CREATE POLICY "Service can manage form templates" ON form_templates
  FOR ALL USING (true);

-- Application screenshots and logs follow the same pattern as attempts
CREATE POLICY "Users can view screenshots of own applications" ON application_screenshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM application_attempts 
      WHERE application_attempts.id = application_screenshots.application_attempt_id 
      AND (auth.uid() = application_attempts.user_id OR application_attempts.user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid)
    )
  );

CREATE POLICY "Service can manage application screenshots" ON application_screenshots
  FOR ALL USING (true);

CREATE POLICY "Users can view logs of own applications" ON application_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM application_attempts 
      WHERE application_attempts.id = application_logs.application_attempt_id 
      AND (auth.uid() = application_attempts.user_id OR application_attempts.user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid)
    )
  );

CREATE POLICY "Service can manage application logs" ON application_logs
  FOR ALL USING (true);

-- Update triggers for timestamps
CREATE TRIGGER update_application_attempts_updated_at BEFORE UPDATE ON application_attempts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uploaded_cvs_updated_at BEFORE UPDATE ON uploaded_cvs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON form_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old application data
CREATE OR REPLACE FUNCTION cleanup_old_application_data()
RETURNS void AS $$
BEGIN
  -- Delete application attempts older than 90 days
  DELETE FROM application_attempts 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete uploaded CVs older than 1 year that are not referenced
  DELETE FROM uploaded_cvs 
  WHERE created_at < NOW() - INTERVAL '1 year'
  AND id NOT IN (
    SELECT DISTINCT uploaded_cv_path 
    FROM application_attempts 
    WHERE uploaded_cv_path IS NOT NULL
    AND created_at > NOW() - INTERVAL '90 days'
  );
  
  -- Clean up form templates with low success rates and no recent usage
  DELETE FROM form_templates 
  WHERE success_rate < 0.3 
  AND (last_used_at IS NULL OR last_used_at < NOW() - INTERVAL '6 months')
  AND usage_count < 5;
  
  -- Delete old screenshots (keep only last 30 days)
  DELETE FROM application_screenshots 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  -- Delete old logs (keep only last 30 days)
  DELETE FROM application_logs 
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled function to run cleanup (this would be set up with pg_cron in production)
-- SELECT cron.schedule('cleanup-application-data', '0 2 * * 0', 'SELECT cleanup_old_application_data();');