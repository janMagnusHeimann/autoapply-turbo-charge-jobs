-- Create Google Scholar tables in Supabase
-- Run this in your Supabase Dashboard → SQL Editor

-- Create Google Scholar connections table
CREATE TABLE IF NOT EXISTS google_scholar_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scholar_profile_url TEXT NOT NULL,
  scholar_author_id TEXT,
  author_name TEXT,
  author_affiliation TEXT,
  author_email TEXT,
  verified BOOLEAN DEFAULT false,
  total_citations INTEGER DEFAULT 0,
  h_index INTEGER DEFAULT 0,
  i10_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create selected publications table
CREATE TABLE IF NOT EXISTS selected_publications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scholar_publication_id TEXT NOT NULL,
  title TEXT NOT NULL,
  authors TEXT[] DEFAULT '{}',
  publication_venue TEXT,
  publication_year INTEGER,
  citation_count INTEGER DEFAULT 0,
  pdf_link TEXT,
  scholar_link TEXT,
  abstract TEXT,
  user_description TEXT NOT NULL DEFAULT '',
  keywords TEXT[] DEFAULT '{}',
  is_selected BOOLEAN DEFAULT true,
  publication_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, scholar_publication_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_google_scholar_connections_user_id ON google_scholar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_selected_publications_user_id ON selected_publications(user_id);
CREATE INDEX IF NOT EXISTS idx_selected_publications_selected ON selected_publications(user_id, is_selected);

-- Enable Row Level Security (RLS)
ALTER TABLE google_scholar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE selected_publications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for authenticated users)
CREATE POLICY "Users can manage google_scholar_connections" ON google_scholar_connections
  FOR ALL USING (true);

CREATE POLICY "Users can manage selected_publications" ON selected_publications
  FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON google_scholar_connections TO authenticated;
GRANT ALL ON selected_publications TO authenticated;

-- Confirm tables are created
SELECT 'google_scholar_connections created' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_scholar_connections');

SELECT 'selected_publications created' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'selected_publications');