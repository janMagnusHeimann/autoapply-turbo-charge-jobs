-- Insert mock companies
INSERT INTO public.companies (id, name, description, industry, size_category, website_url, careers_url, headquarters, founded_year) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'TechFlow Solutions', 'Leading provider of cloud infrastructure and DevOps solutions', 'Technology', 'medium', 'https://techflow.com', 'https://techflow.com/careers', 'San Francisco, CA', 2018),
('550e8400-e29b-41d4-a716-446655440002', 'DataVision Analytics', 'AI-powered business intelligence and data analytics platform', 'Data & Analytics', 'startup', 'https://datavision.com', 'https://datavision.com/jobs', 'Austin, TX', 2020),
('550e8400-e29b-41d4-a716-446655440003', 'GreenTech Innovations', 'Sustainable technology solutions for renewable energy', 'Clean Energy', 'small', 'https://greentech.com', 'https://greentech.com/careers', 'Seattle, WA', 2019),
('550e8400-e29b-41d4-a716-446655440004', 'FinanceCore Systems', 'Enterprise financial software and banking solutions', 'Fintech', 'large', 'https://financecore.com', 'https://financecore.com/careers', 'New York, NY', 2015),
('550e8400-e29b-41d4-a716-446655440005', 'HealthTech Partners', 'Digital health platforms and medical device software', 'Healthcare', 'medium', 'https://healthtech.com', 'https://healthtech.com/join', 'Boston, MA', 2017),
('550e8400-e29b-41d4-a716-446655440006', 'CyberGuard Security', 'Cybersecurity solutions and threat intelligence', 'Cybersecurity', 'medium', 'https://cyberguard.com', 'https://cyberguard.com/careers', 'Denver, CO', 2016),
('550e8400-e29b-41d4-a716-446655440007', 'EduTech Learning', 'Online education platforms and learning management systems', 'Education', 'startup', 'https://edutech.com', 'https://edutech.com/jobs', 'Chicago, IL', 2021),
('550e8400-e29b-41d4-a716-446655440008', 'CloudScale Infrastructure', 'Cloud computing and enterprise infrastructure services', 'Technology', 'large', 'https://cloudscale.com', 'https://cloudscale.com/careers', 'Portland, OR', 2014),
('550e8400-e29b-41d4-a716-446655440009', 'RetailTech Solutions', 'E-commerce platforms and retail technology', 'Retail Tech', 'medium', 'https://retailtech.com', 'https://retailtech.com/careers', 'Los Angeles, CA', 2019),
('550e8400-e29b-41d4-a716-446655440010', 'GameDev Studios', 'Mobile and web game development', 'Gaming', 'startup', 'https://gamedev.com', 'https://gamedev.com/jobs', 'San Diego, CA', 2022);

-- Insert mock job listings
INSERT INTO public.job_listings (id, company_id, title, description, requirements, location, salary_range, job_type, remote_option, external_url, posted_date) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Senior Full Stack Developer', 'Join our team to build scalable web applications using React and Node.js. You will work on cloud infrastructure projects that serve millions of users.', 'React, Node.js, TypeScript, AWS, 5+ years experience', 'San Francisco, CA', '$120,000 - $160,000', 'full-time', 'hybrid', 'https://techflow.com/jobs/senior-fullstack', NOW() - INTERVAL '2 days'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Data Scientist', 'Lead data science initiatives using machine learning to drive business insights. Work with large datasets and build predictive models.', 'Python, SQL, TensorFlow, 3+ years ML experience', 'Austin, TX', '$100,000 - $140,000', 'full-time', 'remote', 'https://datavision.com/careers/data-scientist', NOW() - INTERVAL '1 day'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'Frontend Developer', 'Build beautiful and responsive user interfaces for our clean energy management platform using modern frontend technologies.', 'React, JavaScript, CSS, 2+ years experience', 'Seattle, WA', '$80,000 - $110,000', 'full-time', 'hybrid', 'https://greentech.com/jobs/frontend-dev', NOW() - INTERVAL '3 days'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'DevOps Engineer', 'Manage and optimize our cloud infrastructure. Implement CI/CD pipelines and ensure system reliability and security.', 'AWS, Docker, Kubernetes, Terraform, 4+ years experience', 'New York, NY', '$110,000 - $150,000', 'full-time', 'on-site', 'https://financecore.com/careers/devops', NOW() - INTERVAL '1 day'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'Mobile App Developer', 'Develop native mobile applications for healthcare providers. Focus on iOS and Android development with emphasis on user experience.', 'Swift, Kotlin, React Native, 3+ years mobile dev', 'Boston, MA', '$95,000 - $130,000', 'full-time', 'hybrid', 'https://healthtech.com/jobs/mobile-dev', NOW() - INTERVAL '4 days'),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 'Security Engineer', 'Strengthen our cybersecurity posture by implementing security measures and conducting vulnerability assessments.', 'Cybersecurity, Penetration Testing, Python, 3+ years security', 'Denver, CO', '$105,000 - $145,000', 'full-time', 'remote', 'https://cyberguard.com/careers/security-eng', NOW() - INTERVAL '2 days'),
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', 'Backend Developer', 'Build scalable APIs and microservices for our education platform. Work with modern backend technologies and databases.', 'Node.js, PostgreSQL, REST APIs, 2+ years experience', 'Chicago, IL', '$85,000 - $115,000', 'full-time', 'remote', 'https://edutech.com/jobs/backend-dev', NOW() - INTERVAL '1 day'),
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440008', 'Cloud Architect', 'Design and implement enterprise cloud solutions. Lead technical decisions for large-scale infrastructure projects.', 'AWS, Azure, System Design, 6+ years experience', 'Portland, OR', '$140,000 - $180,000', 'full-time', 'hybrid', 'https://cloudscale.com/careers/cloud-architect', NOW() - INTERVAL '3 days'),
('660e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440009', 'Product Manager', 'Lead product strategy for our e-commerce platform. Work closely with engineering and design teams to deliver user-centric features.', 'Product Management, Agile, Analytics, 4+ years PM experience', 'Los Angeles, CA', '$115,000 - $155,000', 'full-time', 'hybrid', 'https://retailtech.com/careers/pm', NOW() - INTERVAL '2 days'),
('660e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440010', 'Game Developer', 'Create engaging mobile games using Unity. Work on game mechanics, performance optimization, and user engagement features.', 'Unity, C#, Game Development, 2+ years experience', 'San Diego, CA', '$75,000 - $105,000', 'full-time', 'on-site', 'https://gamedev.com/jobs/unity-dev', NOW() - INTERVAL '1 day');

-- Create a mock user (this would normally be created by Supabase Auth)
-- Note: In production, this would be handled by the authentication trigger
INSERT INTO auth.users (id, email, created_at, updated_at, email_confirmed_at) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'demo@autoapply.com', NOW(), NOW(), NOW());

-- Insert mock user profile
INSERT INTO public.users (id, email, full_name, github_username, scholar_url) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'demo@autoapply.com', 'Alex Johnson', 'alexjohnson', 'https://scholar.google.com/citations?user=example');

-- Insert mock CV assets for the demo user
INSERT INTO public.cv_assets (user_id, asset_type, title, description, metadata, tags, external_url) VALUES
-- Repositories
('770e8400-e29b-41d4-a716-446655440001', 'repository', 'E-commerce Platform', 'Full-stack e-commerce application built with React and Node.js', '{"language": "JavaScript", "stars": 42, "forks": 12, "framework": "React"}', ARRAY['React', 'Node.js', 'JavaScript', 'E-commerce'], 'https://github.com/alexjohnson/ecommerce-platform'),
('770e8400-e29b-41d4-a716-446655440001', 'repository', 'Machine Learning Toolkit', 'Python library for common ML algorithms and data preprocessing', '{"language": "Python", "stars": 156, "forks": 34, "framework": "TensorFlow"}', ARRAY['Python', 'Machine Learning', 'TensorFlow', 'Data Science'], 'https://github.com/alexjohnson/ml-toolkit'),
('770e8400-e29b-41d4-a716-446655440001', 'repository', 'Cloud Infrastructure Scripts', 'Terraform and AWS CloudFormation templates for scalable architectures', '{"language": "HCL", "stars": 23, "forks": 8, "framework": "Terraform"}', ARRAY['AWS', 'Terraform', 'DevOps', 'Infrastructure'], 'https://github.com/alexjohnson/cloud-infrastructure'),
('770e8400-e29b-41d4-a716-446655440001', 'repository', 'Mobile Weather App', 'React Native weather application with real-time data', '{"language": "JavaScript", "stars": 67, "forks": 19, "framework": "React Native"}', ARRAY['React Native', 'Mobile', 'JavaScript', 'API Integration'], 'https://github.com/alexjohnson/weather-app'),

-- Publications
('770e8400-e29b-41d4-a716-446655440001', 'publication', 'Optimizing Web Performance in React Applications', 'Research on performance optimization techniques for large-scale React applications', '{"journal": "Journal of Web Engineering", "year": 2023, "citations": 15}', ARRAY['React', 'Performance', 'Web Development'], 'https://scholar.google.com/citations?view_op=view_citation&hl=en&user=example&citation_for_view=1'),
('770e8400-e29b-41d4-a716-446655440001', 'publication', 'Machine Learning Approaches for Code Quality Assessment', 'Novel ML techniques for automated code review and quality metrics', '{"conference": "ICSE 2023", "year": 2023, "citations": 8}', ARRAY['Machine Learning', 'Code Quality', 'Software Engineering'], 'https://scholar.google.com/citations?view_op=view_citation&hl=en&user=example&citation_for_view=2'),

-- Skills
('770e8400-e29b-41d4-a716-446655440001', 'skill', 'React & Frontend Development', 'Expert-level proficiency in React, TypeScript, and modern frontend frameworks', '{"proficiency": "expert", "years": 5}', ARRAY['React', 'TypeScript', 'Frontend', 'JavaScript'], NULL),
('770e8400-e29b-41d4-a716-446655440001', 'skill', 'Node.js & Backend Development', 'Advanced backend development with Node.js, Express, and database design', '{"proficiency": "advanced", "years": 4}', ARRAY['Node.js', 'Express', 'Backend', 'API Development'], NULL),
('770e8400-e29b-41d4-a716-446655440001', 'skill', 'AWS & Cloud Infrastructure', 'Cloud architecture design and implementation using AWS services', '{"proficiency": "advanced", "years": 3, "certifications": ["AWS Solutions Architect"]}', ARRAY['AWS', 'Cloud', 'Infrastructure', 'DevOps'], NULL),
('770e8400-e29b-41d4-a716-446655440001', 'skill', 'Machine Learning & Data Science', 'Python-based ML model development and data analysis', '{"proficiency": "intermediate", "years": 2}', ARRAY['Python', 'Machine Learning', 'Data Science', 'TensorFlow'], NULL),

-- Experience
('770e8400-e29b-41d4-a716-446655440001', 'experience', 'Senior Software Engineer at TechCorp', 'Led development of microservices architecture serving 1M+ users', '{"company": "TechCorp", "duration": "2021-2023", "location": "San Francisco, CA"}', ARRAY['Leadership', 'Microservices', 'React', 'Node.js'], NULL),
('770e8400-e29b-41d4-a716-446655440001', 'experience', 'Full Stack Developer at StartupXYZ', 'Built MVP and scaled to 100K users using React and Python', '{"company": "StartupXYZ", "duration": "2019-2021", "location": "Austin, TX"}', ARRAY['React', 'Python', 'Startup', 'Full Stack'], NULL),

-- Education
('770e8400-e29b-41d4-a716-446655440001', 'education', 'M.S. Computer Science', 'Masters degree with focus on software engineering and machine learning', '{"university": "Stanford University", "graduation": "2019", "gpa": "3.8"}', ARRAY['Computer Science', 'Software Engineering', 'Machine Learning'], NULL),
('770e8400-e29b-41d4-a716-446655440001', 'education', 'B.S. Computer Engineering', 'Bachelor degree with emphasis on systems and software development', '{"university": "UC Berkeley", "graduation": "2017", "gpa": "3.7"}', ARRAY['Computer Engineering', 'Systems', 'Software Development'], NULL);

-- Insert mock user preferences
INSERT INTO public.user_preferences (user_id, preferred_locations, preferred_remote, preferred_job_types, min_salary, max_salary, preferred_industries, preferred_company_sizes, skills) VALUES
('770e8400-e29b-41d4-a716-446655440001', 
 ARRAY['San Francisco, CA', 'Austin, TX', 'Seattle, WA'], 
 'hybrid', 
 ARRAY['full-time'], 
 100000, 
 160000, 
 ARRAY['Technology', 'Data & Analytics', 'Fintech'], 
 ARRAY['startup', 'medium', 'large'], 
 ARRAY['React', 'Node.js', 'TypeScript', 'AWS', 'Python']);

-- Insert some mock pending applications
INSERT INTO public.pending_applications (user_id, job_listing_id, generated_cv_url, cover_letter, match_score, status) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '/cv/alex-johnson-techflow.pdf', 'Dear TechFlow Solutions team, I am excited to apply for the Senior Full Stack Developer position...', 0.92, 'pending'),
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '/cv/alex-johnson-datavision.pdf', 'Dear DataVision Analytics team, My experience in machine learning and data science makes me an ideal candidate...', 0.88, 'pending'),
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440004', '/cv/alex-johnson-financecore.pdf', 'Dear FinanceCore Systems team, I am interested in the DevOps Engineer position and bringing my AWS expertise...', 0.85, 'pending');

-- Insert some mock application history
INSERT INTO public.application_history (user_id, job_listing_id, company_id, submitted_cv_url, cover_letter, submission_method, submitted_at, status, notes) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '/cv/alex-johnson-greentech.pdf', 'Application for Frontend Developer position', 'email', NOW() - INTERVAL '5 days', 'interview', 'Scheduled for next week'),
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', '/cv/alex-johnson-healthtech.pdf', 'Application for Mobile App Developer position', 'portal', NOW() - INTERVAL '8 days', 'rejected', 'Looking for more mobile experience'),
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', '/cv/alex-johnson-edutech.pdf', 'Application for Backend Developer position', 'api', NOW() - INTERVAL '10 days', 'submitted', 'Awaiting response');