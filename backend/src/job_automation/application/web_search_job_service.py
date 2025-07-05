"""
Web Search Job Discovery Service - Simplified service using OpenAI web search
"""

import asyncio
from typing import List, Dict, Any, Optional, Callable
import logging

from ..core.agents.web_search_job_agent import WebSearchJobAgent
from ..infrastructure.clients.openai_client import OpenAIClient
from ..core.models.user_preferences import UserPreferences
from ..config import Config

logger = logging.getLogger(__name__)

class WebSearchJobService:
    """
    Simplified job discovery service using OpenAI web search
    Replaces complex multi-agent orchestration with direct web search
    """
    
    def __init__(self, config: Config):
        self.config = config
        self.openai_client = OpenAIClient(
            api_key=config.openai_api_key,
            model=config.openai_model,
            temperature=config.llm_temperature,
            max_tokens=config.llm_max_tokens
        )
        self.agent = WebSearchJobAgent(self.openai_client)
    
    async def discover_jobs_for_company(
        self,
        company: Dict[str, str],
        user_preferences: UserPreferences,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
        max_jobs: int = 20
    ) -> Dict[str, Any]:
        """
        Discover jobs for a single company using web search
        
        Args:
            company: Company information
            user_preferences: User job preferences
            progress_callback: Optional callback for progress updates
            max_jobs: Maximum number of jobs to return
            
        Returns:
            Job discovery results
        """
        
        if progress_callback:
            progress_callback({"current_operation": f"Starting job search for {company.get('name')}"})
        
        if not self.agent.is_available():
            raise Exception("OpenAI client not available - web search requires OpenAI API")
        
        try:
            if progress_callback:
                progress_callback({"current_operation": "Generating search queries"})
            
            # Use the web search agent
            results = await self.agent.discover_jobs_for_company(
                company, 
                user_preferences, 
                max_jobs
            )
            
            if progress_callback:
                progress_callback({"current_operation": f"Found {results.get('total_jobs', 0)} jobs, analyzing matches"})
            
            # Convert to expected format for compatibility
            formatted_results = self._format_results(results)
            
            if progress_callback:
                progress_callback({"current_operation": "Job discovery completed"})
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Web search job discovery failed: {e}")
            if progress_callback:
                progress_callback({"current_operation": f"Error: {str(e)}"})
            
            return {
                'success': False,
                'error': str(e),
                'company': company.get('name'),
                'total_jobs': 0,
                'matched_jobs': [],
                'jobs': []
            }
    
    async def discover_jobs_for_multiple_companies(
        self,
        companies: List[Dict[str, str]],
        user_preferences: UserPreferences,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
        max_concurrent: int = 3,
        max_jobs_per_company: int = 10
    ) -> Dict[str, Any]:
        """
        Discover jobs for multiple companies concurrently
        
        Args:
            companies: List of company information
            user_preferences: User job preferences
            progress_callback: Optional callback for progress updates
            max_concurrent: Maximum concurrent searches
            max_jobs_per_company: Max jobs per company
            
        Returns:
            Aggregated job discovery results
        """
        
        if progress_callback:


            progress_callback({"current_operation": f"Starting multi-company search for {len(companies)} companies"})
        
        # Use semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def search_company(company):
            async with semaphore:
                return await self.discover_jobs_for_company(
                    company, 
                    user_preferences, 
                    progress_callback, 
                    max_jobs_per_company
                )
        
        # Execute searches concurrently
        tasks = [search_company(company) for company in companies]
        company_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Aggregate results
        all_jobs = []
        successful_companies = 0
        total_jobs = 0
        
        for i, result in enumerate(company_results):
            if isinstance(result, dict) and result.get('success'):
                successful_companies += 1
                jobs = result.get('matched_jobs', [])
                total_jobs += len(jobs)
                
                # Add company info to each job
                for job in jobs:
                    job['source_company'] = companies[i].get('name')
                    all_jobs.append(job)
        
        # Sort all jobs by match score
        all_jobs.sort(key=lambda x: x.get('match_score', 0), reverse=True)
        
        if progress_callback:
            progress_callback({"current_operation": f"Multi-company search completed: {total_jobs} jobs from {successful_companies} companies"})
        
        return {
            'success': successful_companies > 0,
            'total_companies': len(companies),
            'successful_companies': successful_companies,
            'total_jobs': total_jobs,
            'matched_jobs': all_jobs,
            'jobs': all_jobs,  # For compatibility
            'agent_system_used': 'web_search_service'
        }
    
    def _format_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Format results for compatibility with existing frontend"""
        
        matched_jobs = results.get('matched_jobs', [])
        
        # Convert web search results to job listing format
        formatted_jobs = []
        for job in matched_jobs:
            formatted_job = {
                'title': job.get('title', 'Unknown Title'),
                'description': job.get('snippet', ''),
                'location': job.get('location', 'Not specified'),
                'application_url': job.get('url', '#'),
                'salary_range': job.get('salary', None),
                'match_score': job.get('match_score', 0.5),
                'source': job.get('source', 'Web Search'),
                'posted_date': job.get('posted_date', None),
                'requirements': [],  # Would be extracted from full job details
                'company_name': results.get('company', 'Unknown Company')
            }
            formatted_jobs.append(formatted_job)
        
        return {
            'success': results.get('success', False),
            'company': results.get('company'),
            'total_jobs': results.get('total_jobs', 0),
            'matched_jobs': formatted_jobs,
            'jobs': formatted_jobs,  # For compatibility
            'career_page_url': results.get('career_page_url'),
            'agent_system_used': 'web_search_agent',
            'execution_time': results.get('execution_time', 0),
            'search_queries_used': results.get('search_queries_used', [])
        }
    
    
    def is_available(self) -> bool:
        """Check if the service is available"""
        return self.agent.is_available()