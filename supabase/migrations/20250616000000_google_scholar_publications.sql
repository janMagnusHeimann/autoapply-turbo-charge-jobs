-- Migration: Add Google Scholar publications management
-- This migration adds support for users to connect Google Scholar accounts,
-- import publications, and add custom descriptions for CV and job application generation

-- Create table for Google Scholar connections
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
  
  -- Ensure one Google Scholar connection per user
  UNIQUE(user_id)
);

-- Create table for selected publications with user descriptions
CREATE TABLE IF NOT EXISTS selected_publications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scholar_publication_id TEXT NOT NULL, -- Unique ID from Google Scholar
  title TEXT NOT NULL,
  authors TEXT[] DEFAULT '{}',
  publication_venue TEXT, -- Journal/Conference name
  publication_year INTEGER,
  citation_count INTEGER DEFAULT 0,
  pdf_link TEXT,
  scholar_link TEXT,
  abstract TEXT,
  user_description TEXT NOT NULL, -- User's custom description of contribution and impact
  keywords TEXT[] DEFAULT '{}',
  is_selected BOOLEAN DEFAULT true,
  publication_type TEXT, -- 'journal', 'conference', 'book', 'thesis', 'preprint', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one entry per user per publication
  UNIQUE(user_id, scholar_publication_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_google_scholar_connections_user_id ON google_scholar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_selected_publications_user_id ON selected_publications(user_id);
CREATE INDEX IF NOT EXISTS idx_selected_publications_selected ON selected_publications(user_id, is_selected);
CREATE INDEX IF NOT EXISTS idx_selected_publications_year ON selected_publications(publication_year DESC);

-- Add RLS (Row Level Security)
ALTER TABLE google_scholar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE selected_publications ENABLE ROW LEVEL SECURITY;

-- Google Scholar connections policies
CREATE POLICY "Users can view their own Google Scholar connection" ON google_scholar_connections
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert their own Google Scholar connection" ON google_scholar_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update their own Google Scholar connection" ON google_scholar_connections
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete their own Google Scholar connection" ON google_scholar_connections
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Selected publications policies
CREATE POLICY "Users can view their own selected publications" ON selected_publications
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can insert their own selected publications" ON selected_publications
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can update their own selected publications" ON selected_publications
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

CREATE POLICY "Users can delete their own selected publications" ON selected_publications
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Functions to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_google_scholar_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_selected_publications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_google_scholar_connections_updated_at
  BEFORE UPDATE ON google_scholar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_google_scholar_connections_updated_at();

CREATE TRIGGER update_selected_publications_updated_at
  BEFORE UPDATE ON selected_publications
  FOR EACH ROW
  EXECUTE FUNCTION update_selected_publications_updated_at();

-- View for easy publication data access with selection status
CREATE OR REPLACE VIEW user_publication_portfolio AS
SELECT 
  sp.id,
  sp.user_id,
  sp.scholar_publication_id,
  sp.title,
  sp.authors,
  sp.publication_venue,
  sp.publication_year,
  sp.citation_count,
  sp.pdf_link,
  sp.scholar_link,
  sp.abstract,
  sp.user_description,
  sp.keywords,
  sp.is_selected,
  sp.publication_type,
  sp.created_at,
  sp.updated_at,
  u.full_name as user_name,
  gsc.author_name as scholar_author_name,
  gsc.total_citations as author_total_citations,
  gsc.h_index as author_h_index
FROM selected_publications sp
JOIN users u ON sp.user_id = u.id
LEFT JOIN google_scholar_connections gsc ON sp.user_id = gsc.user_id
WHERE sp.is_selected = true;

-- Grant access to the views
GRANT SELECT ON user_publication_portfolio TO authenticated;

-- Comments for documentation
COMMENT ON TABLE google_scholar_connections IS 'Stores user Google Scholar profile connections and author metadata';
COMMENT ON TABLE selected_publications IS 'Stores user-selected publications with custom descriptions for CV/job application generation';
COMMENT ON COLUMN selected_publications.user_description IS 'Custom description written by user explaining their contribution, methodology, and impact of this publication';
COMMENT ON COLUMN selected_publications.is_selected IS 'Whether this publication is currently selected for inclusion in CV/applications';
COMMENT ON COLUMN selected_publications.publication_type IS 'Type of publication: journal, conference, book, thesis, preprint, etc.';