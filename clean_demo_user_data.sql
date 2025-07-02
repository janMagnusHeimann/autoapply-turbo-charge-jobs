-- Clean up demo user CV assets (experiences and education)
-- Run this in Supabase SQL editor to remove existing demo data

DELETE FROM public.cv_assets 
WHERE user_id = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed'::uuid 
  AND asset_type IN ('experience', 'education');