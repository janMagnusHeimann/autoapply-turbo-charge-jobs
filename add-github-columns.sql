-- Add GitHub columns to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS github_access_token TEXT,
ADD COLUMN IF NOT EXISTS github_user_data JSONB,
ADD COLUMN IF NOT EXISTS github_connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS github_last_sync TIMESTAMPTZ;

-- Create selected_repositories table if it doesn't exist
CREATE TABLE IF NOT EXISTS selected_repositories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    github_repo_id BIGINT NOT NULL,
    repo_name TEXT NOT NULL,
    repo_full_name TEXT NOT NULL,
    repo_url TEXT NOT NULL,
    repo_description TEXT,
    user_description TEXT NOT NULL DEFAULT '',
    programming_languages TEXT[] DEFAULT '{}',
    topics TEXT[] DEFAULT '{}',
    stars_count INTEGER DEFAULT 0,
    forks_count INTEGER DEFAULT 0,
    is_private BOOLEAN DEFAULT false,
    is_selected BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, github_repo_id)
);

-- Enable RLS on selected_repositories
ALTER TABLE selected_repositories ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for selected_repositories
CREATE POLICY "Users can manage their own repositories" ON selected_repositories
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_selected_repositories_user_id ON selected_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_selected_repositories_github_repo_id ON selected_repositories(github_repo_id);

-- Add github_username column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS github_username TEXT;