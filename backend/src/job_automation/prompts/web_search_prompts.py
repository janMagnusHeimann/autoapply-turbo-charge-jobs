"""
Web Search Optimized Prompts for Job Discovery
"""

from typing import List, Dict, Any
from ..core.models.user_preferences import UserPreferences

class WebSearchPrompts:
    """Prompts optimized for OpenAI web search integration"""
    
    @staticmethod
    def build_web_search_query_prompt(
        company: str, 
        user_preferences: UserPreferences,
        search_focus: str = "general"
    ) -> str:
        """
        Build prompt for generating web search queries
        
        Args:
            company: Company name
            user_preferences: User job preferences
            search_focus: Type of search (careers, linkedin, ats, recent, location)
        """
        
        skills = user_preferences.skills[:5] if user_preferences.skills else []
        locations = user_preferences.locations[:3] if user_preferences.locations else ['Remote']
        job_types = [str(jt) for jt in user_preferences.job_types] if user_preferences.job_types else ['full-time']
        
        base_prompt = f"""
        Generate targeted web search queries to find job openings at {company}.
        
        User Profile:
        - Skills: {', '.join(skills)}
        - Preferred Locations: {', '.join(locations)}
        - Job Types: {', '.join(job_types)}
        - Experience Level: {user_preferences.experience_level or 'mid-level'}
        
        """
        
        if search_focus == "careers":
            return base_prompt + f"""
            Focus: Direct company career pages and official job postings
            
            Generate 3 search queries that will find:
            1. Official {company} careers page
            2. {company} job postings on their website
            3. {company} official job announcements
            
            Return queries optimized for finding direct company job postings.
            """
            
        elif search_focus == "linkedin":
            return base_prompt + f"""
            Focus: LinkedIn job postings and professional network
            
            Generate 3 search queries for LinkedIn that will find:
            1. {company} jobs on LinkedIn
            2. {company} roles for specific skills
            3. Recent {company} job postings
            
            Include "site:linkedin.com" in queries.
            """
            
        elif search_focus == "ats":
            return base_prompt + f"""
            Focus: Applicant Tracking System (ATS) platforms
            
            Generate 3 search queries targeting:
            1. {company} jobs on Greenhouse
            2. {company} positions on Lever  
            3. {company} openings on Workday
            
            Include ATS platform names in queries.
            """
            
        elif search_focus == "recent":
            return base_prompt + f"""
            Focus: Recently posted jobs (last 30 days)
            
            Generate 3 search queries that emphasize:
            1. Recent {company} job postings
            2. New {company} openings
            3. Latest {company} positions
            
            Include time-based keywords like "recent", "new", "latest".
            """
            
        else:  # general
            return base_prompt + f"""
            Generate 5 diverse search queries that will comprehensively find {company} job opportunities:
            
            1. Direct company career page search
            2. Job board platform search (LinkedIn, Indeed, etc.)
            3. Skill-specific role search
            4. Location-based search
            5. Recent postings search
            
            Return 5 distinct search queries, one per line.
            """
    
    @staticmethod
    def build_job_analysis_prompt(
        job_data: Dict[str, Any], 
        user_preferences: UserPreferences
    ) -> str:
        """
        Build prompt for analyzing job match quality
        """
        
        return f"""
        Analyze how well this job matches the candidate's profile and preferences.
        
        JOB POSTING:
        Title: {job_data.get('title', 'N/A')}
        Company: {job_data.get('source', 'N/A')}
        Description: {job_data.get('snippet', 'N/A')}
        Location: {job_data.get('location', 'N/A')}
        URL: {job_data.get('url', 'N/A')}
        
        CANDIDATE PROFILE:
        Skills: {', '.join(user_preferences.skills or [])}
        Preferred Locations: {', '.join(user_preferences.locations or [])}
        Job Types: {', '.join([str(jt) for jt in user_preferences.job_types]) if user_preferences.job_types else 'Any'}
        Experience Level: {user_preferences.experience_level or 'Mid-level'}
        Years of Experience: {user_preferences.experience_years or 'Not specified'}
        Salary Range: {user_preferences.salary_min or 'N/A'} - {user_preferences.salary_max or 'N/A'}
        
        ANALYSIS REQUIREMENTS:
        1. Calculate overall match score (0.0 to 1.0)
        2. Break down specific match areas:
           - Skills alignment
           - Location compatibility  
           - Experience level fit
           - Job type preference
        3. Identify missing requirements
        4. Highlight key strengths
        5. Provide actionable reasoning
        
        Return analysis in this JSON format:
        {{
            "match_score": 0.85,
            "reasoning": "Detailed explanation of match quality and why",
            "skill_match": 0.9,
            "location_match": 0.8,
            "experience_match": 0.85,
            "job_type_match": 1.0,
            "missing_requirements": ["requirement1", "requirement2"],
            "key_strengths": ["strength1", "strength2"],
            "recommendation": "apply|consider|skip",
            "confidence": 0.9
        }}
        """
    
    @staticmethod
    def build_job_extraction_prompt(job_url: str) -> str:
        """
        Build prompt for extracting detailed job information from URL
        """
        
        return f"""
        Extract comprehensive job information from this job posting URL: {job_url}
        
        Please access the webpage and extract all available job details.
        
        Return the information in this JSON format:
        {{
            "title": "Complete job title",
            "company": "Company name",
            "location": "Job location(s)",
            "employment_type": "Full-time/Part-time/Contract/Internship",
            "experience_level": "Entry/Mid/Senior/Lead/Principal",
            "description": "Full job description",
            "requirements": [
                "Required skill/qualification 1",
                "Required skill/qualification 2"
            ],
            "responsibilities": [
                "Main responsibility 1",
                "Main responsibility 2"
            ],
            "benefits": [
                "Benefit 1",
                "Benefit 2"
            ],
            "salary_range": "Salary information if available",
            "application_deadline": "Application deadline if mentioned",
            "posted_date": "When job was posted",
            "application_url": "Direct application URL",
            "application_method": "Online form/Email/External link",
            "remote_policy": "Remote/Hybrid/On-site",
            "visa_sponsorship": "Available/Not mentioned/Not available",
            "education_requirements": "Education requirements if any",
            "certifications": "Required certifications if any"
        }}
        
        If any field is not available, use null or "Not specified".
        """
    
    @staticmethod
    def build_search_result_filtering_prompt(
        search_results: List[Dict[str, Any]], 
        company: str,
        user_preferences: UserPreferences
    ) -> str:
        """
        Build prompt for filtering and ranking search results
        """
        
        results_text = "\n".join([
            f"Result {i+1}: {result.get('title', 'N/A')} - {result.get('snippet', 'N/A')[:100]}..."
            for i, result in enumerate(search_results[:10])
        ])
        
        return f"""
        Filter and rank these web search results for job opportunities at {company}.
        
        SEARCH RESULTS:
        {results_text}
        
        USER PREFERENCES:
        - Target Company: {company}
        - Skills: {', '.join(user_preferences.skills or [])}
        - Locations: {', '.join(user_preferences.locations or [])}
        - Experience Level: {user_preferences.experience_level or 'Any'}
        
        FILTERING CRITERIA:
        1. Must be actual job postings (not news, articles, or company info)
        2. Must be for {company} or clearly related roles
        3. Should match user's skill set and experience level
        4. Recent postings preferred (avoid very old listings)
        5. Legitimate job boards and company pages only
        
        Return the filtered results as a JSON array with relevance scores:
        [
            {{
                "result_index": 1,
                "relevance_score": 0.95,
                "is_job_posting": true,
                "is_target_company": true,
                "freshness_score": 0.9,
                "reasoning": "Why this result is relevant"
            }}
        ]
        
        Only include results with relevance_score > 0.6.
        """