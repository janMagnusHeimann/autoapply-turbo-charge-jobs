-- Migration: Add selective GitHub repository management
-- This migration adds support for users to select specific repositories
-- and add custom descriptions for CV and job application generation

-- Create table for selected repositories with user descriptions
CREATE TABLE IF NOT EXISTS selected_repositories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_repo_id BIGINT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  repo_description TEXT, -- Original GitHub description
  user_description TEXT NOT NULL, -- User's custom description of achievements
  programming_languages TEXT[] DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  stars_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  is_selected BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one entry per user per repository
  UNIQUE(user_id, github_repo_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_selected_repositories_user_id ON selected_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_selected_repositories_selected ON selected_repositories(user_id, is_selected);

-- Add RLS (Row Level Security)
ALTER TABLE selected_repositories ENABLE ROW LEVEL SECURITY;

-- Users can only access their own selected repositories
CREATE POLICY "Users can view their own selected repositories" ON selected_repositories
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert their own selected repositories" ON selected_repositories
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update their own selected repositories" ON selected_repositories
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete their own selected repositories" ON selected_repositories
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_selected_repositories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_selected_repositories_updated_at
  BEFORE UPDATE ON selected_repositories
  FOR EACH ROW
  EXECUTE FUNCTION update_selected_repositories_updated_at();

-- View for easy repository data access with selection status
CREATE OR REPLACE VIEW user_repository_portfolio AS
SELECT 
  sr.id,
  sr.user_id,
  sr.github_repo_id,
  sr.repo_name,
  sr.repo_full_name,
  sr.repo_url,
  sr.repo_description,
  sr.user_description,
  sr.programming_languages,
  sr.topics,
  sr.stars_count,
  sr.forks_count,
  sr.is_private,
  sr.is_selected,
  sr.created_at,
  sr.updated_at,
  u.full_name as user_name,
  u.github_username
FROM selected_repositories sr
JOIN users u ON sr.user_id = u.id
WHERE sr.is_selected = true;

-- Grant access to the view
GRANT SELECT ON user_repository_portfolio TO authenticated;

-- Comments for documentation
COMMENT ON TABLE selected_repositories IS 'Stores user-selected GitHub repositories with custom descriptions for CV/job application generation';
COMMENT ON COLUMN selected_repositories.user_description IS 'Custom description written by user explaining achievements and skills demonstrated in this repository';
COMMENT ON COLUMN selected_repositories.is_selected IS 'Whether this repository is currently selected for inclusion in CV/applications';