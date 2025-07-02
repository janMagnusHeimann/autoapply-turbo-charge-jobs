-- GitHub Integration Schema Updates
-- Add GitHub-specific columns and support

-- Update user_preferences table to include GitHub data
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS github_access_token TEXT,
ADD COLUMN IF NOT EXISTS github_user_data JSONB,
ADD COLUMN IF NOT EXISTS github_connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS github_last_sync TIMESTAMPTZ;

-- Add GitHub repository sync metadata to cv_assets table
-- The cv_assets table already supports repositories, but we'll add specific GitHub metadata support
ALTER TABLE cv_assets 
ADD COLUMN IF NOT EXISTS github_sync_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS github_last_updated TIMESTAMPTZ;

-- Create indexes for GitHub-related queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_github_connected 
ON user_preferences(user_id) WHERE github_access_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cv_assets_github_repos 
ON cv_assets(user_id, asset_type) WHERE asset_type = 'repository';

-- Create a view for GitHub repository statistics
CREATE OR REPLACE VIEW github_repository_stats AS
SELECT 
  ca.user_id,
  COUNT(*) as total_repositories,
  SUM((ca.metadata->>'stars')::int) as total_stars,
  SUM((ca.metadata->>'forks')::int) as total_forks,
  COUNT(DISTINCT ca.metadata->>'language') as unique_languages,
  array_agg(DISTINCT ca.metadata->>'language') FILTER (WHERE ca.metadata->>'language' IS NOT NULL) as languages_used,
  MAX(ca.updated_at) as last_repository_update
FROM cv_assets ca
WHERE ca.asset_type = 'repository' 
  AND ca.metadata ? 'github_id'
GROUP BY ca.user_id;

-- Add RLS policies for GitHub data
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy for users to access their own GitHub data
CREATE POLICY "Users can manage their own GitHub data" ON user_preferences
  FOR ALL
  USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Function to clean up GitHub data when user disconnects
CREATE OR REPLACE FUNCTION cleanup_github_data(user_uuid UUID)
RETURNS void AS $$
BEGIN
  -- Remove GitHub access token and data
  UPDATE user_preferences 
  SET 
    github_access_token = NULL,
    github_user_data = NULL,
    github_connected_at = NULL,
    github_last_sync = NULL
  WHERE user_id = user_uuid;
  
  -- Remove GitHub repositories from cv_assets
  DELETE FROM cv_assets 
  WHERE user_id = user_uuid 
    AND asset_type = 'repository' 
    AND metadata ? 'github_id';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update GitHub sync timestamp
CREATE OR REPLACE FUNCTION update_github_sync_timestamp(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_preferences 
  SET github_last_sync = NOW()
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update github_last_updated when repository assets are modified
CREATE OR REPLACE FUNCTION update_github_repository_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.asset_type = 'repository' AND NEW.metadata ? 'github_id' THEN
    NEW.github_last_updated = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER github_repository_update_trigger
  BEFORE INSERT OR UPDATE ON cv_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_github_repository_timestamp();

-- Comments for documentation
COMMENT ON COLUMN user_preferences.github_access_token IS 'Encrypted GitHub OAuth access token';
COMMENT ON COLUMN user_preferences.github_user_data IS 'GitHub user profile data (login, name, avatar_url, etc.)';
COMMENT ON COLUMN user_preferences.github_connected_at IS 'Timestamp when GitHub was first connected';
COMMENT ON COLUMN user_preferences.github_last_sync IS 'Last time repositories were synced from GitHub';
COMMENT ON VIEW github_repository_stats IS 'Aggregated statistics for user GitHub repositories';
COMMENT ON FUNCTION cleanup_github_data IS 'Removes all GitHub-related data for a user';
COMMENT ON FUNCTION update_github_sync_timestamp IS 'Updates the last sync timestamp for GitHub data';