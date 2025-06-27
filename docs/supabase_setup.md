# Supabase Database Setup Guide

This document provides a comprehensive overview of the Supabase database schema used in the job automation application.

## Database Overview

The application uses Supabase as its primary database, providing a complete job application automation system with GitHub and Google Scholar integrations, CV generation capabilities, and detailed application tracking.

## Core Database Tables

### 🔐 User Management

#### **users** (extends auth.users)

Central user profiles extending Supabase Auth

- `id` (UUID) - Primary key, references auth.users(id)
- `email` (TEXT) - User email address
- `full_name` (TEXT) - User's full name
- `github_username` (TEXT) - Connected GitHub username
- `scholar_url` (TEXT) - Google Scholar profile URL
- `created_at`, `updated_at` (TIMESTAMPTZ) - Timestamps

#### **user_preferences**

User job search preferences and settings

- `user_id` (UUID) - References users(id)
- `preferred_locations` (TEXT[]) - Preferred job locations
- `preferred_remote` (TEXT) - Remote work preference (on-site/remote/hybrid/any)
- `preferred_job_types` (TEXT[]) - Job types (full-time, part-time, contract, intern)
- `min_salary`, `max_salary` (INTEGER) - Salary range expectations
- `skills` (TEXT[]) - User technical skills
- `github_access_token` (TEXT) - Encrypted GitHub OAuth token
- `github_user_data` (JSONB) - GitHub profile data
- `github_token_encrypted` (BOOLEAN) - Token encryption status

### 🏢 Company & Job Management

#### **companies**
Company directory and information
- `id` (UUID) - Primary key
- `name` (TEXT) - Company name
- `description` (TEXT) - Company description
- `industry` (TEXT) - Industry category
- `size_category` (TEXT) - Company size (startup/small/medium/large/enterprise)
- `website_url`, `careers_url` (TEXT) - Company URLs
- `headquarters` (TEXT) - Company location
- `founded_year` (INTEGER) - Year founded

#### **job_listings**
Available job positions discovered by the system
- `id` (UUID) - Primary key
- `company_id` (UUID) - References companies(id)
- `title` (TEXT) - Job position title
- `description`, `requirements` (TEXT) - Job details
- `location` (TEXT) - Job location
- `salary_range` (TEXT) - Salary information
- `job_type` (TEXT) - Employment type
- `remote_option` (TEXT) - Remote work options
- `external_url` (TEXT) - Original job posting URL
- `posted_date`, `discovered_at` (TIMESTAMPTZ) - Timing information

### 📄 CV & Profile Management

#### **cv_assets**
User's CV components and profile assets
- `id` (UUID) - Primary key
- `user_id` (UUID) - References users(id)
- `asset_type` (TEXT) - Type: repository/publication/skill/experience/education/other
- `title` (TEXT) - Asset title
- `description` (TEXT) - Asset description
- `metadata` (JSONB) - Flexible metadata storage
- `tags` (TEXT[]) - Searchable tags
- `external_url` (TEXT) - Related URLs

#### **cv_generations**
Generated CV documents and metadata
- `id` (TEXT) - Primary key
- `user_id` (UUID) - References users(id)
- `job_id` (TEXT) - Associated job application
- `template_id` (TEXT) - CV template used
- `pdf_url` (TEXT) - Generated PDF URL
- `cv_data` (JSONB) - Complete CV content
- `status` (TEXT) - Generation status (generating/ready/failed)

#### **work_experiences**
User employment history
- `user_id` (UUID) - References users(id)
- `company`, `position` (TEXT) - Job details
- `start_date`, `end_date` (TEXT) - Employment period
- `description` (TEXT) - Role description
- `achievements` (TEXT[]) - Key accomplishments
- `technologies` (TEXT[]) - Technologies used

#### **user_skills**
User technical and soft skills
- `user_id` (UUID) - References users(id)
- `name` (TEXT) - Skill name
- `category` (TEXT) - Skill category
- `proficiency_level` (TEXT) - Skill level (beginner/intermediate/advanced/expert)
- `years_of_experience` (INTEGER) - Years of experience

### 🐙 GitHub Integration

#### **selected_repositories**
User-selected GitHub repositories with custom descriptions
- `user_id` (UUID) - References users(id)
- `github_repo_id` (BIGINT) - GitHub repository ID
- `repo_name`, `repo_full_name` (TEXT) - Repository names
- `repo_url` (TEXT) - Repository URL
- `repo_description` (TEXT) - Original GitHub description
- `user_description` (TEXT) - User's custom achievement description
- `programming_languages` (TEXT[]) - Programming languages used
- `topics` (TEXT[]) - Repository topics/tags
- `stars_count`, `forks_count` (INTEGER) - GitHub metrics
- `is_private` (BOOLEAN) - Repository privacy status
- `is_selected` (BOOLEAN) - Selected for CV inclusion

### 🎓 Google Scholar Integration

#### **google_scholar_connections**
User Google Scholar profile connections
- `user_id` (UUID) - References users(id)
- `scholar_profile_url` (TEXT) - Google Scholar profile URL
- `scholar_author_id` (TEXT) - Scholar author ID
- `author_name`, `author_affiliation` (TEXT) - Author information
- `verified` (BOOLEAN) - Profile verification status
- `total_citations`, `h_index`, `i10_index` (INTEGER) - Citation metrics

#### **selected_publications**
User-selected publications with custom descriptions
- `user_id` (UUID) - References users(id)
- `scholar_publication_id` (TEXT) - Unique Scholar publication ID
- `title` (TEXT) - Publication title
- `authors` (TEXT[]) - Authors list
- `publication_venue` (TEXT) - Journal/conference name
- `publication_year` (INTEGER) - Publication year
- `citation_count` (INTEGER) - Citation count
- `abstract` (TEXT) - Publication abstract
- `user_description` (TEXT) - User's custom contribution description
- `keywords` (TEXT[]) - Publication keywords
- `is_selected` (BOOLEAN) - Selected for CV inclusion
- `publication_type` (TEXT) - Type (journal/conference/book/thesis/preprint)

### 📝 Application Management

#### **pending_applications**
Job applications awaiting user approval
- `user_id` (UUID) - References users(id)
- `job_listing_id` (UUID) - References job_listings(id)
- `generated_cv_url` (TEXT) - Generated CV file URL
- `cover_letter` (TEXT) - Generated cover letter
- `match_score` (DECIMAL) - Job match score (0.00-1.00)
- `status` (TEXT) - Application status (pending/approved/rejected)

#### **application_history**
Complete history of submitted job applications
- `user_id` (UUID) - References users(id)
- `job_listing_id` (UUID) - References job_listings(id)
- `company_id` (UUID) - References companies(id)
- `submitted_cv_url` (TEXT) - Submitted CV URL
- `cover_letter` (TEXT) - Cover letter content
- `submission_method` (TEXT) - Submission method (email/api/portal)
- `submitted_at` (TIMESTAMPTZ) - Submission timestamp
- `status` (TEXT) - Application status (submitted/acknowledged/rejected/interview/offer)
- `notes` (TEXT) - Additional notes

## Database Features

### 🔒 Security
- **Row Level Security (RLS)** enabled on all user-related tables
- **GitHub token encryption** for secure OAuth token storage
- **User isolation** ensuring users only access their own data

### ⚡ Performance
- **Comprehensive indexing** for optimized query performance
- **Automated timestamps** with database triggers
- **JSONB storage** for flexible metadata and configurations

### 🔄 Data Integrity
- **Foreign key constraints** maintaining referential integrity
- **Check constraints** for status fields and enums
- **Automated data validation** on inserts and updates

## Setup Instructions

### 1. Environment Variables
Ensure these variables are set in your `.env` file:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Migrations
Run the migration files located in `supabase/migrations/`:
```bash
# Apply all migrations
supabase db push

# Or apply individual migrations
supabase migration up
```

### 3. Row Level Security Policies
The database uses RLS policies to ensure data security:
- Users can only access their own data
- Service role can access all data for system operations
- Anonymous users have no access to user data

### 4. Encryption Setup
For GitHub token encryption, ensure the encryption service is properly configured:
- Web Crypto API support for token encryption
- Fallback to unencrypted storage if encryption fails
- Encryption status tracked per user

## Common Operations

### User Registration Flow
1. User registers via Supabase Auth
2. Profile created in `users` table
3. Default preferences created in `user_preferences`
4. User can connect GitHub and Scholar accounts

### GitHub Integration Flow
1. User initiates OAuth via frontend
2. Backend exchanges code for access token
3. Token encrypted and stored in `user_preferences`
4. Repositories fetched and stored in `selected_repositories`
5. User customizes repository descriptions

### Job Application Flow
1. Jobs discovered and stored in `job_listings`
2. System generates CV based on selected assets
3. Application created in `pending_applications`
4. User approves/rejects application
5. Approved applications moved to `application_history`

## Troubleshooting

### Common Issues
1. **RLS Policy Errors**: Ensure user is authenticated
2. **Missing Foreign Keys**: Check user_id references
3. **Encryption Failures**: Verify browser crypto API support
4. **Migration Errors**: Run migrations in correct order

### Debugging Queries
```sql
-- Check user data
SELECT * FROM users WHERE email = 'user@example.com';

-- View user's selected repositories
SELECT * FROM selected_repositories WHERE user_id = 'user-uuid';

-- Check application status
SELECT * FROM application_history WHERE user_id = 'user-uuid';
```

## API Integration

The Supabase client is configured in `src/integrations/supabase/client.ts` and provides:
- Real-time subscriptions for data updates
- Row-level security enforcement
- Automatic token refresh
- Type-safe database operations

For development mode with `VITE_BYPASS_AUTH=true`, the system falls back to localStorage for some operations while still attempting Supabase operations when possible.