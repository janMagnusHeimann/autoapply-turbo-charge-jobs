-- First, create the auth user (this bypasses normal Supabase auth)
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
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
) VALUES (
    '12345678-1234-1234-1234-123456789012',
    'authenticated',
    'authenticated',
    'dev@example.com',
    crypt('devpassword123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Development User"}',
    false,
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

-- Then create the public users record
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
    updated_at = NOW();

-- Create mock user preferences
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
    updated_at = NOW();