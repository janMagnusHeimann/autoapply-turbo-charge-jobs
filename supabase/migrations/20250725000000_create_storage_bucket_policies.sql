-- Create storage bucket policies for cv-files bucket
-- Run this after creating the cv-files bucket in the Supabase Dashboard

-- Note: The bucket 'cv-files' must be created manually in the Supabase Dashboard first
-- Go to Storage > Create bucket > Name: cv-files, Privacy: Private

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload files to their own folder
CREATE POLICY "Allow authenticated users to upload CVs" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'cv-files' 
        AND (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Policy: Allow users to view their own uploaded files
CREATE POLICY "Allow users to view own CV files" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'cv-files' 
        AND (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Policy: Allow users to update their own files
CREATE POLICY "Allow users to update own CV files" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'cv-files' 
        AND (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Policy: Allow users to delete their own files
CREATE POLICY "Allow users to delete own CV files" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'cv-files' 
        AND (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Create a helper function to get the first folder name from a path
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[] AS $$
SELECT string_to_array(name, '/')
$$ LANGUAGE SQL IMMUTABLE;

-- Comment with setup instructions
COMMENT ON POLICY "Allow authenticated users to upload CVs" ON storage.objects IS 
'Allows authenticated users to upload CV files to their own folder structure: uploaded_cvs/{user_id}/filename';

-- Note: After running this migration, create the cv-files bucket manually with these settings:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "Create a new bucket"
-- 3. Name: cv-files
-- 4. Privacy: Private (not public)
-- 5. File size limit: 10MB
-- 6. Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document