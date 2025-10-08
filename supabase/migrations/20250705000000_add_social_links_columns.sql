-- Add additional social media columns to user_profiles table
-- This migration adds support for Twitter/X, Medium, Blog, YouTube, Behance, Dribbble, and Stack Overflow

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS medium_url TEXT,
ADD COLUMN IF NOT EXISTS blog_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS behance_url TEXT,
ADD COLUMN IF NOT EXISTS dribbble_url TEXT,
ADD COLUMN IF NOT EXISTS stackoverflow_url TEXT,
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.twitter_url IS 'User''s Twitter/X profile URL';
COMMENT ON COLUMN user_profiles.medium_url IS 'User''s Medium blog URL';
COMMENT ON COLUMN user_profiles.blog_url IS 'User''s personal blog URL';
COMMENT ON COLUMN user_profiles.youtube_url IS 'User''s YouTube channel URL';
COMMENT ON COLUMN user_profiles.behance_url IS 'User''s Behance portfolio URL';
COMMENT ON COLUMN user_profiles.dribbble_url IS 'User''s Dribbble portfolio URL';
COMMENT ON COLUMN user_profiles.stackoverflow_url IS 'User''s Stack Overflow profile URL';
COMMENT ON COLUMN user_profiles.years_of_experience IS 'Total years of professional experience';