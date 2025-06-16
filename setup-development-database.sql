-- Setup development database with mock user
-- This creates a complete development environment with proper relationships

-- Step 1: Create the auth user first (this is what Supabase Auth normally does)
-- Using INSERT with ON CONFLICT to avoid errors if user already exists
INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
) VALUES (
    '12345678-1234-1234-1234-123456789012',
    'authenticated', 
    'authenticated',
    'dev@example.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyz', -- Dummy encrypted password
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Development User","email":"dev@example.com"}'
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Create the public users record (this normally happens via trigger)
INSERT INTO public.users (
    id,
    email,
    full_name,
    github_username,
    scholar_url,
    created_at,
    updated_at
) VALUES (
    '12345678-1234-1234-1234-123456789012',
    'dev@example.com',
    'Development User',
    'dev-user',
    'https://scholar.google.com/citations?user=dev-user',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    github_username = EXCLUDED.github_username,
    updated_at = NOW();

-- Step 3: Create user preferences
INSERT INTO user_preferences (
    id,
    user_id,
    preferred_locations,
    preferred_remote,
    preferred_job_types,
    min_salary,
    max_salary,
    preferred_industries,
    preferred_company_sizes,
    skills,
    excluded_companies,
    created_at,
    updated_at
) VALUES (
    'dev-prefs-123',
    '12345678-1234-1234-1234-123456789012',
    ARRAY['Berlin', 'Munich', 'Remote'],
    'hybrid',
    ARRAY['full-time'],
    65000,
    95000,
    ARRAY['Technology', 'Software', 'Fintech'],
    ARRAY['startup', 'medium', 'large'],
    ARRAY['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
    ARRAY[]::UUID[],
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    preferred_locations = EXCLUDED.preferred_locations,
    preferred_remote = EXCLUDED.preferred_remote,
    preferred_job_types = EXCLUDED.preferred_job_types,
    min_salary = EXCLUDED.min_salary,
    max_salary = EXCLUDED.max_salary,
    preferred_industries = EXCLUDED.preferred_industries,
    preferred_company_sizes = EXCLUDED.preferred_company_sizes,
    skills = EXCLUDED.skills,
    updated_at = NOW();

-- Step 4: Verify the setup
SELECT 'Setup complete!' as status,
       (SELECT COUNT(*) FROM auth.users WHERE id = '12345678-1234-1234-1234-123456789012') as auth_users_count,
       (SELECT COUNT(*) FROM public.users WHERE id = '12345678-1234-1234-1234-123456789012') as public_users_count,
       (SELECT COUNT(*) FROM user_preferences WHERE user_id = '12345678-1234-1234-1234-123456789012') as preferences_count;