-- Fix companies table RLS policies to allow authenticated users to add companies

-- First, add a created_by column to track who created each company (if it doesn't exist)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Drop the existing SELECT-only policy if it exists
DROP POLICY IF EXISTS "Companies are publicly readable" ON public.companies;

-- Enable RLS on companies table (if not already enabled)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for companies

-- Policy: Everyone can view all companies
CREATE POLICY "Companies are publicly readable"
ON public.companies
FOR SELECT
USING (true);

-- Policy: Authenticated users can insert companies
CREATE POLICY "Authenticated users can insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
-- Allow any authenticated user to insert
auth.uid() IS NOT NULL
);

-- Policy: Authenticated users can update companies they created or demo user can update any
CREATE POLICY "Users can update companies they created"
ON public.companies
FOR UPDATE
TO authenticated
USING (
-- Users can update companies they created or demo user can update any
created_by = auth.uid()
OR auth.uid() = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid
OR created_by IS NULL -- Allow updating companies without a created_by (legacy data)
)
WITH CHECK (
-- Same check for the updated row
created_by = auth.uid()
OR auth.uid() = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid
OR created_by IS NULL
);

-- Policy: Authenticated users can delete companies they created
CREATE POLICY "Users can delete companies they created"
ON public.companies
FOR DELETE
TO authenticated
USING (
-- Users can delete companies they created or demo user can delete any
created_by = auth.uid()
OR auth.uid() = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid
OR created_by IS NULL -- Allow deleting companies without a created_by (legacy data)
);

-- Update existing companies to have created_by as NULL (for backwards compatibility)
-- This ensures existing demo companies can be modified by anyone
UPDATE public.companies
SET created_by = NULL
WHERE created_by IS NULL;

-- Add comment to explain the created_by column
COMMENT ON COLUMN public.companies.created_by IS 'User who created this company entry. NULL for system/demo companies.';