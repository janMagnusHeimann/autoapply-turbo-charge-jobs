-- Migration: Add github_token_encrypted field for enhanced security
-- This field indicates whether the stored GitHub token is encrypted

-- Add github_token_encrypted field to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS github_token_encrypted BOOLEAN DEFAULT FALSE;

-- Add comment to explain the purpose of the field
COMMENT ON COLUMN user_preferences.github_token_encrypted IS 'Indicates whether the GitHub access token is encrypted using client-side encryption';

-- Update existing records to mark them as unencrypted (for backward compatibility)
UPDATE user_preferences 
SET github_token_encrypted = FALSE 
WHERE github_access_token IS NOT NULL AND github_token_encrypted IS NULL; 