-- Create storage bucket policies for cv-files bucket
-- Run this after creating the cv-files bucket in the Supabase Dashboard

DO $$
BEGIN
  -- Ensure we have rights to modify storage.objects; skip if not.
  BEGIN
    EXECUTE 'ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping storage.objects policy setup due to insufficient privileges';
      RETURN;
  END;

  -- Helper function for folder parsing
  EXECUTE '
    CREATE OR REPLACE FUNCTION storage.foldername(name text)
    RETURNS text[] LANGUAGE sql AS
    ''SELECT string_to_array(name, ''''/'')'';
  ';

  -- Policies: drop existing ones first to keep migration idempotent
  EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to upload CVs" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Allow users to view own CV files" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Allow users to update own CV files" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Allow users to delete own CV files" ON storage.objects';

  EXECUTE $pol$
    CREATE POLICY "Allow authenticated users to upload CVs" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
            bucket_id = ''cv-files''
            AND (auth.uid())::text = (storage.foldername(name))[1]
        );
  $pol$;

  EXECUTE $pol$
    CREATE POLICY "Allow users to view own CV files" ON storage.objects
        FOR SELECT TO authenticated
        USING (
            bucket_id = ''cv-files''
            AND (auth.uid())::text = (storage.foldername(name))[1]
        );
  $pol$;

  EXECUTE $pol$
    CREATE POLICY "Allow users to update own CV files" ON storage.objects
        FOR UPDATE TO authenticated
        USING (
            bucket_id = ''cv-files''
            AND (auth.uid())::text = (storage.foldername(name))[1]
        );
  $pol$;

  EXECUTE $pol$
    CREATE POLICY "Allow users to delete own CV files" ON storage.objects
        FOR DELETE TO authenticated
        USING (
            bucket_id = ''cv-files''
            AND (auth.uid())::text = (storage.foldername(name))[1]
        );
  $pol$;

  EXECUTE '
    COMMENT ON POLICY "Allow authenticated users to upload CVs" ON storage.objects IS 
    ''Allows authenticated users to upload CV files to their own folder structure: uploaded_cvs/{user_id}/filename'';
  ';
END;
$$;

-- Note: After running this migration, create the cv-files bucket manually with these settings:
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "Create a new bucket"
-- 3. Name: cv-files
-- 4. Privacy: Private (not public)
-- 5. File size limit: 10MB
-- 6. Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
