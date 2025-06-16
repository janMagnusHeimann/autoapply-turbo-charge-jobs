-- Create mock user for development mode (with correct schema)
INSERT INTO users (
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

-- Create mock user preferences (with correct schema)
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