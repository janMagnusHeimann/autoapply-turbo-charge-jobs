# Supabase Configuration for CV Upload Feature

## Overview
This document outlines the Supabase database tables and storage bucket configuration required for the CV upload persistence feature.

## Database Tables

### 1. `uploaded_cvs` Table
This table stores metadata about uploaded CV files.

```sql
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
```

#### Column Descriptions:
- **id** (TEXT, PRIMARY KEY): Unique identifier for the CV (UUID format)
- **user_id** (UUID): Reference to the user who uploaded the CV
- **filename** (TEXT): Original filename of the uploaded CV
- **file_path** (TEXT): Path to the file in storage (format: `uploaded_cvs/{user_id}/{filename}`)
- **file_url** (TEXT, nullable): URL to access the file or base64 encoded data fallback
- **content_type** (TEXT): MIME type of the file (e.g., 'application/pdf')
- **file_size** (INTEGER): Size of the file in bytes
- **file_hash** (TEXT): SHA-256 hash of the file for duplicate detection
- **extracted_data** (JSONB): Parsed CV data in JSON format
- **extraction_status** (TEXT): Status of CV processing:
  - `pending`: File uploaded but not processed
  - `basic`: Basic text extraction completed
  - `ai_processed`: Full AI analysis completed
  - `failed`: Processing failed
- **created_at** (TIMESTAMPTZ): Timestamp of when the CV was uploaded
- **updated_at** (TIMESTAMPTZ): Last update timestamp

### 2. Required Indexes
```sql
CREATE INDEX idx_uploaded_cvs_user_id ON uploaded_cvs(user_id);
CREATE INDEX idx_uploaded_cvs_created_at ON uploaded_cvs(created_at);
```

### 3. Row Level Security (RLS) Policies
The table should have RLS enabled with the following policies:

```sql
-- Enable RLS
ALTER TABLE uploaded_cvs ENABLE ROW LEVEL SECURITY;

-- Users can view their own uploaded CVs
CREATE POLICY "Users can view own uploaded CVs" ON uploaded_cvs
  FOR SELECT USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Users can insert their own uploaded CVs
CREATE POLICY "Users can insert own uploaded CVs" ON uploaded_cvs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Users can update their own uploaded CVs
CREATE POLICY "Users can update own uploaded CVs" ON uploaded_cvs
  FOR UPDATE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);

-- Users can delete their own uploaded CVs
CREATE POLICY "Users can delete own uploaded CVs" ON uploaded_cvs
  FOR DELETE USING (auth.uid() = user_id OR user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid);
```

Note: The UUID `ebbae036-5dbf-4571-a29d-2318e1ce0eed` is the demo user ID for testing purposes.

### 4. Update Trigger
```sql
-- Function to update the updated_at column (should already exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_uploaded_cvs_updated_at
  BEFORE UPDATE ON uploaded_cvs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Storage Bucket Configuration

### 1. Create Storage Bucket
The CV files are stored in a Supabase Storage bucket named `cv-files`.

**Manual Setup Required:**
1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click **"Create a new bucket"**
4. Configure with these settings:
   - **Name**: `cv-files`
   - **Privacy**: Private (not public)
   - **File size limit**: 10MB
   - **Allowed MIME types**:
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `text/plain`
     - `text/markdown`

### 2. Storage Bucket Policies
After creating the bucket, the following RLS policies should be applied to the `storage.objects` table:

```sql
-- Enable RLS on storage.objects if not already enabled
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- Helper function to extract folder name from path
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[] AS $$
SELECT string_to_array(name, '/')
$$ LANGUAGE SQL IMMUTABLE;

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
```

These policies ensure that:
- Users can only upload files to their own user folder (`{user_id}/filename`)
- Users can only view, update, and delete their own files
- Files are private and not accessible to other users

## File Structure
CV files are stored with the following path structure:
```
cv-files/
└── {user_id}/
    └── {timestamp}_{filename}
```

Example: `cv-files/123e4567-e89b-12d3-a456-426614174000/1704067200000_resume.pdf`

## Migration Status

### Already Applied
The following migrations have already been applied to the database:
- ✅ `20250707000001_add_application_agent_tables.sql` - Creates the `uploaded_cvs` table with initial structure
- ✅ `20250724090346_create_missing_application_tables.sql` - Ensures table exists with IF NOT EXISTS clause
- ✅ `20250725000000_create_storage_bucket_policies.sql` - Creates storage bucket policies

### Manual Steps Required
1. **Create the storage bucket** in Supabase Dashboard (see Storage Bucket Configuration section)
2. **Verify RLS policies** are active on both the `uploaded_cvs` table and `storage.objects` table
3. **Test file upload** with a sample PDF to ensure everything works

## Environment Variables
Ensure these environment variables are set:

### Backend (.env)
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For backend operations
```

### Frontend (.env.local)
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key  # For frontend operations
```

## API Endpoints
The CV upload feature uses these endpoints:

### Backend CV API (Port 8001)
- `POST /upload-cv` - Upload a CV file
  - Body: FormData with `user_id` and `file`
  - Returns: CV metadata including ID and storage path

- `GET /user-cvs/{user_id}` - Get all CVs for a user
  - Returns: Array of CV metadata

- `DELETE /delete-cv/{cv_id}` - Delete a specific CV
  - Returns: Success/failure status

## Troubleshooting

### Common Issues

1. **"Storage bucket not found" error**
   - Solution: Create the `cv-files` bucket in Supabase Dashboard

2. **"Permission denied" when uploading**
   - Solution: Check that RLS policies are correctly applied to `storage.objects`
   - Verify user is authenticated

3. **Files not persisting**
   - Solution: Ensure `uploaded_cvs` table exists with correct schema
   - Check that backend has proper Supabase service role key

4. **Cannot see uploaded files in UI**
   - Solution: Verify RLS policies on `uploaded_cvs` table
   - Check that user_id matches between upload and fetch

## Testing Checklist
- [ ] Create `cv-files` storage bucket in Supabase Dashboard
- [ ] Upload a test CV file through the UI
- [ ] Verify file appears in "Previously Uploaded CVs" section
- [ ] Refresh the page and confirm CV persists
- [ ] Select a different CV and verify selection state
- [ ] Delete a CV and confirm it's removed from both UI and storage
- [ ] Test with different file types (PDF, TXT, MD)
- [ ] Verify file size limit (10MB) is enforced