"""
Web Search Job Discovery Agent - Simplified agent using OpenAI web search
"""

from typing import List, Dict, Any, Optional
import logging

from ...infrastructure.clients.openai_client import OpenAIClient
from ..models.user_preferences import UserPreferences

logger = logging.getLogger(__name__)

class WebSearchJobAgent:
    """
    Simplified job discovery agent using OpenAI web search capabilities
    Replaces complex browser automation with direct web search API calls
    """
    
    def __init__(self, openai_client: OpenAIClient):
        self.client = openai_client
        
    async def discover_jobs_for_company(
        self,
        company: Dict[str, str],
        user_preferences: UserPreferences,
        max_jobs: int = 20
    ) -> Dict[str, Any]:
        """
        Discover jobs for a specific company using web search
        
        Args:
            company: Company info with name, website, etc.
            user_preferences: User job preferences
            max_jobs: Maximum number of jobs to return
            
        Returns:
            Dictionary with search results and matched jobs
        """
        logger.info(f"Starting web search job discovery for {company.get('name')}")
        
        try:
            # Simplified approach: Use OpenAI web search to find careers page and jobs
            company_website = company.get('website_url', '').replace('https://', '').replace('http://', '')
            company_name = company.get('name', '')
            
            # Get user skills for targeted search
            user_skills = user_preferences.skills[:10] if user_preferences.skills else ['software engineer', 'developer']
            
            # Step 1: Find careers page
            careers_url = await self.client.find_company_careers_page(company_name, company_website)
            
            if not careers_url:
                logger.warning(f"❌ No valid careers page found for {company_name}")
                return {
                    'success': False,
                    'error': f'No valid careers page found for {company_name}',
                    'company': company_name,
                    'total_jobs': 0,
                    'matched_jobs': []
                }
            
            # Step 2: Search for jobs directly on the careers page
            job_results = await self.client.search_jobs_on_careers_page(
                careers_url=careers_url,
                company_name=company_name,
                user_skills=user_skills, 
                num_results=max_jobs,
                company_website=company_website
            )
            
            # Step 3: Analyze job matches
            matched_jobs = []
            for job in job_results:
                match_analysis = await self.client.analyze_job_match(
                    job, 
                    self._user_preferences_to_dict(user_preferences)
                )
                
                # Only include jobs with decent match scores
                if match_analysis.get('match_score', 0) > 0.3:
                    job_with_score = {**job, **match_analysis}
                    matched_jobs.append(job_with_score)
            
            # Sort by match score
            matched_jobs.sort(key=lambda x: x.get('match_score', 0), reverse=True)
            
            return {
                'success': True,
                'company': company.get('name'),
                'career_page_url': careers_url,
                'total_jobs': len(job_results),
                'matched_jobs': matched_jobs[:max_jobs],
                'search_queries_used': [f"{company_name} careers search"],
                'agent_system_used': 'web_search_agent',
                'execution_time': 0  # Would track actual time in production
            }
            
        except Exception as e:
            logger.error(f"Job discovery failed for {company.get('name')}: {e}")
            return {
                'success': False,
                'error': str(e),
                'company': company.get('name'),
                'total_jobs': 0,
                'matched_jobs': []
            }
    
    async def _generate_search_queries(
        self, 
        company: Dict[str, str], 
        user_preferences: UserPreferences
    ) -> List[str]:
        """Generate targeted search queries for job discovery"""
        
        company_name = company.get('name', '')
        website = company.get('website_url', '')
        
        # Build user context
        skills = user_preferences.skills[:5] if user_preferences.skills else []
        locations = user_preferences.locations[:3] if user_preferences.locations else ['Remote']
        job_types = [str(jt) for jt in user_preferences.job_types] if user_preferences.job_types else ['full-time']
        
        # Generate queries using prompt template
        query_prompt = f"""
        Generate 5 targeted job search queries for finding positions at {company_name}.
        
        Company: {company_name}
        Website: {website}
        Target Skills: {', '.join(skills)}
        Preferred Locations: {', '.join(locations)}
        Job Types: {', '.join(job_types)}
        
        Create search queries that will find:
        1. Direct company career page jobs
        2. Job board postings (LinkedIn, Indeed, etc.)
        3. ATS system postings (Greenhouse, Lever, etc.)
        4. Recent job postings (last 30 days)
        5. Location-specific searches
        
        Return 5 search queries as a simple list, one per line.
        """
        
        try:
            response = await self.client.generate(query_prompt)
            queries = [q.strip() for q in response.split('\n') if q.strip()]
            
            # Fallback queries if generation fails
            if not queries:
                queries = [
                    f"{company_name} careers jobs",
                    f"{company_name} software engineer jobs",
                    f"site:linkedin.com {company_name} jobs",
                    f"{company_name} {' '.join(skills[:2])} jobs",
                    f"{company_name} jobs {locations[0] if locations else 'remote'}"
                ]
            
            return queries[:5]
            
        except Exception as e:
            logger.error(f"Query generation failed: {e}")
            # Return basic fallback queries
            return [
                f"{company_name} careers",
                f"{company_name} jobs",
                f"site:linkedin.com {company_name}",
                f"{company_name} software engineer",
                f"{company_name} developer jobs"
            ]
    
    def _user_preferences_to_dict(self, preferences: UserPreferences) -> Dict[str, Any]:
        """Convert UserPreferences to dictionary for analysis"""
        return {
            'skills': preferences.skills or [],
            'locations': preferences.locations or [],
            'job_types': [str(jt) for jt in preferences.job_types] if preferences.job_types else [],
            'salary_min': preferences.salary_min,
            'salary_max': preferences.salary_max,
            'experience_level': str(preferences.experience_level) if preferences.experience_level else 'mid',
            'experience_years': preferences.experience_years or 3
        }
    
    async def get_job_details(self, job_url: str) -> Dict[str, Any]:
        """Get detailed information about a specific job posting"""
        return await self.client.extract_job_details(job_url)
    
    def is_available(self) -> bool:
        """Check if the agent is available (OpenAI client configured)"""
        return self.client.is_available()