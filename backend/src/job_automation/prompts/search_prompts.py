"""
Search prompts for Gemini Job Search Agent
"""

from typing import List, Dict, Any
from ..core.models.user_preferences import UserPreferences
from ..core.models.job_listing import JobListing

class SearchPrompts:
    """Centralized search prompts for job discovery"""
    
    @staticmethod
    def build_enhanced_job_search_prompt(
        company: str, 
        company_website: str, 
        user_preferences: UserPreferences,
        preferred_locations: List[str] = None
    ) -> str:
        """
        Build enhanced job search prompt following modern prompting guidelines
        
        Modern techniques used:
        - Clear role definition
        - Step-by-step reasoning
        - Specific constraints and filters
        - Structured output format
        - Chain-of-thought approach
        - Error handling instructions
        """
        
        # Prepare user profile data
        skills_primary = user_preferences.skills[:5] if user_preferences.skills else []
        skills_secondary = user_preferences.skills[5:10] if len(user_preferences.skills) > 5 else []
        desired_roles = user_preferences.desired_roles[:3] if user_preferences.desired_roles else []
        experience_years = user_preferences.experience_years or 0
        experience_level = str(user_preferences.experience_level) if user_preferences.experience_level else "mid"
        
        # Handle preferred locations
        if preferred_locations:
            location_filter = preferred_locations
        else:
            location_filter = user_preferences.locations[:3] if user_preferences.locations else ["Remote"]
        
        # Build work type preferences
        work_types = [str(jt) for jt in user_preferences.job_types] if user_preferences.job_types else ["full-time"]
        
        # Build salary information
        salary_info = ""
        if user_preferences.salary_min and user_preferences.salary_max:
            currency = getattr(user_preferences, 'salary_currency', 'USD')
            salary_info = f"Salary expectations: {currency} {user_preferences.salary_min:,} - {user_preferences.salary_max:,}"
        
        return f"""# ROLE
You are an expert job search specialist with deep knowledge of recruitment practices, job boards, and career sites. Your mission is to find current job openings that precisely match a candidate's profile.

# OBJECTIVE
Find and extract current job opportunities at **{company}** that match the candidate profile below. Focus ONLY on {company} - do not include jobs from other companies.

# TARGET COMPANY ANALYSIS
**Company:** {company}
**Website:** {company_website}
**Search Focus:** Look specifically for {company}'s official career pages, job listings, and hiring announcements

# CANDIDATE PROFILE
## Core Skills (Must Match)
{', '.join(skills_primary)}

## Additional Skills (Nice to Have)
{', '.join(skills_secondary) if skills_secondary else 'None specified'}

## Experience Profile
- **Level:** {experience_level.title()} level
- **Years:** {experience_years} years of experience
- **Target Roles:** {', '.join(desired_roles) if desired_roles else 'Software Engineering roles'}

## Location & Work Preferences
- **Preferred Locations:** {', '.join(location_filter)}
- **Work Types:** {', '.join(work_types)}
- **Relocation:** {'Yes' if getattr(user_preferences, 'willing_to_relocate', False) else 'No'}

## Compensation
{salary_info if salary_info else 'Salary expectations: Not specified'}

# SEARCH STRATEGY
Follow this step-by-step approach:

## Step 1: Company-Specific Search
Search these {company} sources in order of priority:
1. **Official Career Page:** {company_website}/careers, {company_website}/jobs
2. **ATS Systems:** Look for {company} on Greenhouse, Lever, Workday, BambooHR
3. **Professional Networks:** LinkedIn {company} job postings
4. **Job Boards:** Indeed, Glassdoor listings for {company}

## Step 2: Location Filtering
CRITICAL: Only include jobs that match these location criteria:
- Jobs in: {', '.join(location_filter)}
- Remote positions (if applicable to role)
- Hybrid roles in acceptable locations
- EXCLUDE: Jobs in locations NOT listed above

## Step 3: Role Matching
Match jobs based on:
- **Primary Match:** Contains 3+ of these skills: {', '.join(skills_primary[:3])}
- **Secondary Match:** Contains 1-2 primary skills + relevant role title
- **Experience Level:** Appropriate for {experience_level} level ({experience_years} years)

# OUTPUT FORMAT
For each qualifying job, provide this EXACT JSON structure:

```json
{{
    "company_verification": "{company}",
    "job_title": "Exact job title from posting",
    "location": "City, Country OR Remote",
    "location_type": "onsite|hybrid|remote",
    "department": "Engineering/Product/Data/etc",
    "experience_level": "entry|mid|senior|lead|principal",
    "employment_type": "full-time|part-time|contract|internship",
    "posted_date": "YYYY-MM-DD or null",
    "application_deadline": "YYYY-MM-DD or null",
    "job_description_summary": "2-3 sentence summary focusing on key responsibilities",
    "required_skills": ["skill1", "skill2", "skill3"],
    "nice_to_have_skills": ["skill1", "skill2"],
    "years_experience_required": {{
        "minimum": number_or_null,
        "preferred": number_or_null
    }},
    "salary_range": {{
        "min": number_or_null,
        "max": number_or_null,
        "currency": "USD|EUR|GBP|etc",
        "equity": true_or_false_or_null
    }},
    "benefits_highlights": ["benefit1", "benefit2", "benefit3"],
    "application_url": "Direct application link",
    "source_url": "Where job was found",
    "match_reasoning": "Why this job matches the candidate profile",
    "location_match": "How this job meets location requirements",
    "skill_match_score": "percentage_0_to_100",
    "red_flags": ["any_concerning_requirements_or_null"]
}}
```

# QUALITY FILTERS
ONLY include jobs that meet ALL criteria:
- ✅ **Company Match:** Job is at {company} (verify company name in posting)
- ✅ **Location Match:** Job location is in {', '.join(location_filter)} OR explicitly remote
- ✅ **Recency:** Posted within last 60 days (prefer last 30 days)
- ✅ **Skill Relevance:** Requires at least 1 of: {', '.join(skills_primary[:3])}
- ✅ **Experience Fit:** Appropriate for {experience_level} level
- ✅ **Active Posting:** Not marked as "closed" or "filled"

# EXCLUSION CRITERIA
DO NOT include:
- ❌ Jobs at companies other than {company}
- ❌ Jobs in locations not listed in preferred locations
- ❌ Internships (unless candidate is entry-level)
- ❌ Jobs requiring {experience_years + 5}+ years experience (too senior)
- ❌ Jobs requiring 0 years experience if candidate is {experience_level} level (too junior)
- ❌ Roles completely unrelated to candidate skills
- ❌ Duplicate postings from multiple sources

# ERROR HANDLING
If no jobs found:
- Return empty array: []
- In separate field, explain: "No current openings at {company} match the location requirements ({', '.join(location_filter)}) and skill set ({', '.join(skills_primary[:3])})"

If company career page not accessible:
- Search alternative sources (LinkedIn, job boards)
- Note in response: "Career page inaccessible, searched alternative sources"

# FINAL OUTPUT
Return valid JSON array of job objects. Include 0-10 jobs maximum, prioritized by:
1. Skill match percentage
2. Location preference alignment  
3. Experience level fit
4. Posting recency

Begin search now for {company} positions matching this profile.
        """.strip()
    
    @staticmethod
    def build_job_search_prompt(company: str, company_website: str, user_preferences: UserPreferences) -> str:
        """Build comprehensive job search prompt"""
        skills_text = user_preferences.get_skills_summary(5)
        locations_text = user_preferences.get_location_summary()
        
        return f"""
Find current job openings at {company} that match this candidate profile:

🎯 TARGET COMPANY: {company}
📍 Company Website: {company_website}

👤 CANDIDATE PROFILE:
• Skills: {skills_text}
• Experience: {str(user_preferences.experience_level)} level ({user_preferences.experience_years} years)
• Desired Roles: {', '.join(user_preferences.desired_roles[:3])}
• Locations: {locations_text}
• Work Type: {', '.join([str(jt) for jt in user_preferences.job_types])}
• Salary Range: {user_preferences.salary_currency} {user_preferences.salary_min:,} - {user_preferences.salary_max:,}

🔍 SEARCH REQUIREMENTS:
Search for job opportunities from these sources:
1. {company} careers page and job listings
2. LinkedIn jobs posted by {company}
3. Job boards (Indeed, Glassdoor) featuring {company} positions
4. ATS systems (Greenhouse, Lever, Workday) used by {company}
5. Recent job postings (last 30 days preferred)

📋 FOR EACH JOB FOUND, EXTRACT:
• Job title and department
• Location (city/country or "Remote")
• Work arrangement (remote/hybrid/onsite)
• Experience level required
• Required skills and technologies
• Nice-to-have skills
• Years of experience needed
• Salary range (if mentioned)
• Job description summary
• Direct application URL
• Posting date

✅ FOCUS ON JOBS THAT:
• Match the candidate's skills ({skills_text})
• Are appropriate for {str(user_preferences.experience_level)} level
• Support {', '.join([str(jt) for jt in user_preferences.job_types])} work
• Are in preferred locations or remote-friendly
• Are actively hiring (not "pipeline" positions)

Provide comprehensive, current job listings with all available details.
        """.strip()
    
    @staticmethod
    def build_targeted_search_queries(company: str, user_preferences: UserPreferences) -> List[str]:
        """Build multiple targeted search queries"""
        skills = user_preferences.skills[:3]  # Top 3 skills
        roles = user_preferences.desired_roles[:2]  # Top 2 roles
        locations = user_preferences.locations[:2]  # Top 2 locations
        
        queries = [
            # Company careers page
            f"site:{SearchPrompts._extract_domain(company)} careers {' '.join(roles)} {' '.join(skills)}",
            
            # LinkedIn specific
            f"site:linkedin.com/jobs {company} {str(user_preferences.experience_level)} {' '.join(skills)}",
            
            # Job boards with salary
            f"{company} jobs {' '.join(roles)} {user_preferences.salary_currency} {user_preferences.salary_min}-{user_preferences.salary_max}",
            
            # ATS systems
            f"{company} (site:greenhouse.io OR site:lever.co OR site:workday.com) {' '.join(skills)}",
            
            # Location-specific
            f"{company} remote {' '.join(roles)} {' '.join(skills)}" if "remote" in [str(jt) for jt in user_preferences.job_types] else f"{company} {locations[0] if locations else ''} {' '.join(roles)}",
            
            # General job search
            f"{company} hiring {str(user_preferences.experience_level)} {' '.join(skills)} 2024 2025"
        ]
        
        return [q.strip() for q in queries if q.strip()]
    
    @staticmethod
    def build_job_extraction_prompt(search_results: str, company: str) -> str:
        """Build prompt for extracting structured job data"""
        return f"""
Extract job listings from the search results below for {company}.

For each job found, create a JSON object with these exact fields:
{{
    "title": "Job title",
    "company": "{company}",
    "location": "City, Country" or "Remote",
    "job_type": "remote" or "hybrid" or "onsite",
    "department": "Engineering/Product/etc or null",
    "experience_level": "entry" or "mid" or "senior" or "lead" or null,
    "employment_type": "Full-time/Part-time/Contract or null",
    "required_skills": ["skill1", "skill2"],
    "nice_to_have_skills": ["skill1", "skill2"],
    "experience_years_min": number or null,
    "experience_years_max": number or null,
    "salary_min": number or null,
    "salary_max": number or null,
    "salary_currency": "EUR/USD/GBP or null",
    "equity_offered": true/false or null,
    "description": "Brief job description",
    "application_url": "Direct application URL or null",
    "posted_date": "YYYY-MM-DD or null",
    "source": "company_website" or "linkedin" or "indeed" or "other",
    "benefits": ["benefit1", "benefit2"],
    "technologies": ["tech1", "tech2"]
}}

IMPORTANT RULES:
1. Only extract real, current job postings (ignore old or example listings)
2. Remove duplicates (same job from multiple sources)
3. Ensure all URLs are valid and direct application links
4. Parse salary information carefully (convert to numbers)
5. Normalize job titles (e.g., "Sr. Software Engineer" → "Senior Software Engineer")
6. Extract location properly ("Berlin, Germany" not just "Berlin")
7. If remote work is mentioned, set job_type as "remote" or "hybrid"
8. Be conservative with experience_level mapping

Return as a JSON array of job objects. If no jobs found, return [].

SEARCH RESULTS TO ANALYZE:
{search_results}
        """.strip()
    
    @staticmethod
    def build_job_ranking_prompt(jobs: List[JobListing], user_preferences: UserPreferences) -> str:
        """Build prompt for ranking jobs against user preferences"""
        user_profile = {
            "skills": user_preferences.skills,
            "experience_years": user_preferences.experience_years,
            "experience_level": str(user_preferences.experience_level),
            "desired_roles": user_preferences.desired_roles,
            "locations": user_preferences.locations,
            "job_types": [str(jt) for jt in user_preferences.job_types],
            "salary_range": f"{user_preferences.salary_currency} {user_preferences.salary_min:,} - {user_preferences.salary_max:,}",
            "company_sizes": [str(cs) for cs in user_preferences.company_sizes],
            "willing_to_relocate": user_preferences.willing_to_relocate
        }
        
        jobs_data = [
            {
                "title": job.title,
                "location": job.location,
                "job_type": str(job.job_type) if job.job_type else None,
                "experience_level": str(job.experience_level) if job.experience_level else None,
                "required_skills": job.required_skills,
                "nice_to_have_skills": job.nice_to_have_skills,
                "salary_min": job.salary_min,
                "salary_max": job.salary_max,
                "description": job.description,
                "application_url": str(job.application_url) if job.application_url else None
            }
            for job in jobs
        ]
        
        return f"""
Rank these job opportunities for a candidate with the following profile:

👤 CANDIDATE PROFILE:
{user_profile}

🎯 SCORING CRITERIA:
• Skill Match ({user_preferences.skill_weight:.0%}): How well job requirements match candidate skills
• Location Match ({user_preferences.location_weight:.0%}): Location/remote work compatibility
• Experience Match ({user_preferences.experience_weight:.0%}): Appropriate experience level
• Salary Match ({user_preferences.salary_weight:.0%}): Salary range alignment
• Culture/Fit ({user_preferences.culture_weight:.0%}): Overall role and company fit

💼 JOBS TO RANK:
{jobs_data}

📊 FOR EACH JOB, PROVIDE:
{{
    "job_index": index_in_original_list,
    "title": "job title",
    "match_score": overall_score_0_to_100,
    "skill_match_score": skill_score_0_to_100,
    "location_match_score": location_score_0_to_100,
    "experience_match_score": experience_score_0_to_100,
    "salary_match_score": salary_score_0_to_100,
    "culture_match_score": culture_score_0_to_100,
    "match_explanation": "detailed explanation of why this is/isn't a good match",
    "matching_skills": ["skills from candidate that match job"],
    "missing_skills": ["job requirements candidate lacks"],
    "recommendation": "Apply" or "Maybe" or "Don't Apply",
    "improvement_suggestions": ["what candidate can do to improve match"]
}}

🎯 SCORING GUIDELINES:
• 90-100: Excellent match, strong recommendation to apply
• 80-89: Very good match, should apply
• 70-79: Good match, worth considering
• 60-69: Fair match, apply if interested
• 50-59: Weak match, probably not ideal
• 0-49: Poor match, not recommended

Return as JSON array sorted by match_score (highest first).
        """.strip()
    
    @staticmethod
    def build_job_fit_analysis_prompt(job_data: Dict[str, Any], user_profile: Dict[str, Any]) -> str:
        """Build detailed job fit analysis prompt"""
        return f"""
Perform a detailed analysis of how well this job fits the candidate's profile.

👤 CANDIDATE PROFILE:
{user_profile}

💼 JOB DETAILS:
{job_data}

🔍 PROVIDE COMPREHENSIVE ANALYSIS:

1. SKILL ANALYSIS:
   • Which of the candidate's skills match job requirements?
   • What required skills is the candidate missing?
   • How critical are the missing skills?
   • Can missing skills be learned quickly?

2. EXPERIENCE ANALYSIS:
   • Is the candidate's experience level appropriate?
   • Does their background align with job requirements?
   • Are they over/under-qualified?

3. LOCATION & WORK TYPE:
   • Does the job location work for the candidate?
   • Is the work arrangement (remote/hybrid/onsite) compatible?
   • Would relocation be required?

4. COMPENSATION ANALYSIS:
   • How does job salary compare to candidate expectations?
   • Is the compensation competitive for the role/location?
   • Are there other benefits mentioned?

5. CAREER FIT:
   • Does this role align with candidate's career goals?
   • Is it a step forward in their desired career path?
   • Would it provide growth opportunities?

6. APPLICATION STRATEGY:
   • Should the candidate apply?
   • What should they emphasize in their application?
   • How can they address any skill gaps?

Return detailed analysis as JSON with this structure:
{{
    "match_score": overall_score_0_to_100,
    "skill_match_score": 0_to_100,
    "location_match_score": 0_to_100, 
    "experience_match_score": 0_to_100,
    "salary_match_score": 0_to_100,
    "culture_match_score": 0_to_100,
    "match_explanation": "comprehensive explanation",
    "matching_skills": ["skills that match"],
    "missing_skills": ["skills candidate lacks"],
    "recommendation": "Apply/Maybe/Don't Apply",
    "improvement_suggestions": ["specific actions to improve candidacy"],
    "application_strategy": ["tips for applying to this specific role"]
}}
        """.strip()
    
    @staticmethod
    def _extract_domain(company_name: str) -> str:
        """Extract likely domain from company name"""
        # Simple heuristic to guess company domain
        clean_name = company_name.lower().replace(" ", "").replace(".", "")
        
        # Common company domain patterns
        domain_mapping = {
            "google": "careers.google.com",
            "microsoft": "careers.microsoft.com",
            "apple": "jobs.apple.com",
            "amazon": "amazon.jobs",
            "meta": "careers.meta.com",
            "facebook": "careers.meta.com",
            "netflix": "jobs.netflix.com",
            "spotify": "lifeatspotify.com",
            "uber": "uber.com/careers",
            "airbnb": "careers.airbnb.com",
            "salesforce": "salesforce.com/careers",
            "adobe": "adobe.com/careers"
        }
        
        if clean_name in domain_mapping:
            return domain_mapping[clean_name]
        
        # Default pattern
        return f"{clean_name}.com"
