"""
Gemini Job Search Agent - AI-powered job discovery using Google Search
"""

import logging
import asyncio
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import asdict

from ..models.user_preferences import UserPreferences
from ..models.job_listing import JobListing, RankedJob, JobSearchResult, JobSource
from ...infrastructure.clients.gemini_client import GeminiClient
from ...prompts.search_prompts import SearchPrompts
from ...config import config

logger = logging.getLogger(__name__)

class GeminiJobSearchAgent:
    """Primary agent for job discovery using Gemini's search capabilities"""
    
    def __init__(self, gemini_client: Optional[GeminiClient] = None):
        self.client = gemini_client or GeminiClient()
        self.search_history = []
        self.prompts = SearchPrompts()
        
        # Performance settings
        self.max_search_queries = 6
        self.max_jobs_per_query = 20
        self.min_match_score_threshold = 40
        
        logger.info("Initialized Gemini Job Search Agent")
    
    async def find_matching_jobs(
        self,
        company: str,
        company_website: str,
        user_preferences: UserPreferences,
        top_k: int = 10
    ) -> JobSearchResult:
        """
        Main method to find top K matching jobs for a user at a specific company
        
        Args:
            company: Target company name
            company_website: Company website URL
            user_preferences: User's job preferences and profile
            top_k: Number of top matches to return
            
        Returns:
            JobSearchResult with ranked job matches
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Starting job search for {company}")
            
            # Step 1: Generate targeted search queries
            search_queries = await self._generate_search_queries(company, user_preferences)
            logger.info(f"Generated {len(search_queries)} search queries")
            
            # Step 2: Execute searches in parallel
            search_results = await self._execute_parallel_searches(search_queries)
            logger.info(f"Completed {len(search_results)} searches")
            
            # Step 3: Extract structured job data
            all_jobs = await self._extract_jobs_from_results(search_results, company)
            logger.info(f"Extracted {len(all_jobs)} job listings")
            
            # Step 4: Deduplicate jobs
            unique_jobs = self._deduplicate_jobs(all_jobs)
            logger.info(f"After deduplication: {len(unique_jobs)} unique jobs")
            
            # Step 5: Score and rank jobs
            ranked_jobs = await self._rank_jobs(unique_jobs, user_preferences)
            logger.info(f"Ranked {len(ranked_jobs)} jobs")
            
            # Step 6: Filter and select top K
            top_matches = self._select_top_matches(ranked_jobs, top_k)
            
            # Calculate metrics
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            result = JobSearchResult(
                company=company,
                company_website=company_website,
                search_timestamp=start_time,
                total_jobs_found=len(all_jobs),
                jobs_processed=len(unique_jobs),
                top_matches=top_matches,
                search_queries_used=search_queries,
                sources_searched=self._get_sources_used(search_queries),
                search_duration_seconds=duration,
                average_match_score=sum(job.match_score for job in top_matches) / len(top_matches) if top_matches else 0,
                jobs_above_threshold=len([job for job in ranked_jobs if job.match_score >= 70])
            )
            
            # Store in search history
            self.search_history.append(result)
            
            logger.info(f"Job search completed for {company}: {len(top_matches)} top matches found")
            return result
            
        except Exception as e:
            logger.error(f"Job search failed for {company}: {e}")
            # Return empty result with error info
            return JobSearchResult(
                company=company,
                company_website=company_website,
                search_timestamp=start_time,
                total_jobs_found=0,
                jobs_processed=0,
                top_matches=[],
                search_queries_used=[],
                sources_searched=[],
                search_duration_seconds=(datetime.utcnow() - start_time).total_seconds()
            )
    
    async def _generate_search_queries(self, company: str, user_preferences: UserPreferences) -> List[str]:
        """Generate multiple targeted search queries"""
        try:
            # Use predefined query templates
            template_queries = self.prompts.build_targeted_search_queries(company, user_preferences)
            
            # Also generate AI-powered queries for more creativity
            user_context = f"""
            Skills: {', '.join(user_preferences.skills[:5])}
            Experience: {user_preferences.experience_level.value} ({user_preferences.experience_years} years)
            Preferred roles: {', '.join(user_preferences.desired_roles)}
            Locations: {', '.join(user_preferences.locations)}
            Work type: {', '.join([jt.value for jt in user_preferences.job_types])}
            """
            
            ai_queries = await self.client.generate_search_queries(
                base_query=f"{company} jobs",
                user_context=user_context,
                num_queries=3
            )
            
            # Combine and deduplicate
            all_queries = template_queries + ai_queries
            unique_queries = list(dict.fromkeys(all_queries))  # Preserve order, remove duplicates
            
            return unique_queries[:self.max_search_queries]
            
        except Exception as e:
            logger.warning(f"Failed to generate AI queries, using templates: {e}")
            return self.prompts.build_targeted_search_queries(company, user_preferences)
    
    async def _execute_parallel_searches(self, queries: List[str]) -> List[str]:
        """Execute multiple searches in parallel with rate limiting"""
        async def search_with_delay(query: str, delay: float) -> str:
            if delay > 0:
                await asyncio.sleep(delay)
            try:
                return await self.client.search_with_context(
                    query=query,
                    context="Focus on current job openings from the last 30 days. Include job titles, requirements, locations, and application links."
                )
            except Exception as e:
                logger.warning(f"Search failed for query '{query}': {e}")
                return ""
        
        # Create search tasks with staggered delays to respect rate limits
        search_tasks = [
            search_with_delay(query, i * 1.5)  # 1.5 second delays between searches
            for i, query in enumerate(queries)
        ]
        
        # Execute searches
        results = await asyncio.gather(*search_tasks, return_exceptions=True)
        
        # Filter out exceptions and empty results
        valid_results = [
            result for result in results 
            if isinstance(result, str) and result.strip()
        ]
        
        return valid_results
    
    async def _extract_jobs_from_results(self, search_results: List[str], company: str) -> List[JobListing]:
        """Extract structured job listings from search results"""
        all_jobs = []
        
        for i, result in enumerate(search_results):
            if not result.strip():
                continue
                
            try:
                # Create extraction prompt
                extraction_prompt = self.prompts.build_job_extraction_prompt(result, company)
                
                # Extract structured data
                jobs_data = await self.client.extract_structured_data(
                    content=result,
                    schema="Array of job listing objects",
                    instructions=extraction_prompt
                )
                
                # Parse jobs data
                if isinstance(jobs_data, list):
                    jobs_list = jobs_data
                elif isinstance(jobs_data, dict) and 'jobs' in jobs_data:
                    jobs_list = jobs_data['jobs']
                else:
                    logger.warning(f"Unexpected jobs data format in result {i}: {type(jobs_data)}")
                    continue
                
                # Convert to JobListing objects
                for job_data in jobs_list:
                    if isinstance(job_data, dict):
                        try:
                            job = self._create_job_listing(job_data, company)
                            if job:
                                all_jobs.append(job)
                        except Exception as e:
                            logger.warning(f"Failed to create job listing: {e}")
                            continue
                
            except Exception as e:
                logger.warning(f"Failed to extract jobs from result {i}: {e}")
                continue
        
        return all_jobs
    
    def _create_job_listing(self, job_data: Dict[str, Any], company: str) -> Optional[JobListing]:
        """Create JobListing object from extracted data"""
        try:
            # Map source string to enum
            source_mapping = {
                "company_website": JobSource.COMPANY_WEBSITE,
                "linkedin": JobSource.LINKEDIN,
                "indeed": JobSource.INDEED,
                "glassdoor": JobSource.GLASSDOOR,
                "greenhouse": JobSource.GREENHOUSE,
                "lever": JobSource.LEVER,
                "workday": JobSource.WORKDAY
            }
            
            # Parse posted date
            posted_date = None
            if job_data.get('posted_date'):
                try:
                    posted_date = datetime.fromisoformat(job_data['posted_date'].replace('Z', '+00:00'))
                except:
                    # If parsing fails, assume recent
                    posted_date = datetime.utcnow() - timedelta(days=7)
            
            # Create job listing
            job = JobListing(
                title=job_data.get('title', '').strip(),
                company=job_data.get('company', company).strip(),
                location=job_data.get('location', '').strip(),
                job_type=job_data.get('job_type'),
                department=job_data.get('department'),
                experience_level=job_data.get('experience_level'),
                employment_type=job_data.get('employment_type'),
                required_skills=job_data.get('required_skills', []),
                nice_to_have_skills=job_data.get('nice_to_have_skills', []),
                experience_years_min=job_data.get('experience_years_min'),
                experience_years_max=job_data.get('experience_years_max'),
                salary_min=job_data.get('salary_min'),
                salary_max=job_data.get('salary_max'),
                salary_currency=job_data.get('salary_currency'),
                equity_offered=job_data.get('equity_offered'),
                description=job_data.get('description', '').strip(),
                application_url=job_data.get('application_url'),
                posted_date=posted_date,
                source=source_mapping.get(job_data.get('source', 'other'), JobSource.OTHER),
                benefits=job_data.get('benefits', []),
                technologies=job_data.get('technologies', [])
            )
            
            # Validate required fields
            if not job.title or not job.company:
                return None
            
            return job
            
        except Exception as e:
            logger.warning(f"Failed to create job listing from data: {e}")
            return None
    
    def _deduplicate_jobs(self, jobs: List[JobListing]) -> List[JobListing]:
        """Remove duplicate job listings"""
        seen_jobs = set()
        unique_jobs = []
        
        for job in jobs:
            # Create a signature for duplicate detection
            signature = (
                job.title.lower().strip(),
                job.company.lower().strip(),
                job.location.lower().strip()
            )
            
            if signature not in seen_jobs:
                seen_jobs.add(signature)
                unique_jobs.append(job)
        
        return unique_jobs
    
    async def _rank_jobs(self, jobs: List[JobListing], user_preferences: UserPreferences) -> List[RankedJob]:
        """Score and rank jobs based on user preferences"""
        if not jobs:
            return []
        
        try:
            # Build ranking prompt
            ranking_prompt = self.prompts.build_job_ranking_prompt(jobs, user_preferences)
            
            # Get AI rankings
            ranking_results = await self.client.analyze_and_rank(
                items=[asdict(job) for job in jobs],
                criteria=f"User preferences: {asdict(user_preferences)}",
                instructions=ranking_prompt
            )
            
            # Convert to RankedJob objects
            ranked_jobs = []
            for i, ranking in enumerate(ranking_results):
                try:
                    # Find corresponding job
                    job_index = ranking.get('job_index', i)
                    if 0 <= job_index < len(jobs):
                        job = jobs[job_index]
                    else:
                        job = jobs[i] if i < len(jobs) else jobs[0]
                    
                    ranked_job = RankedJob(
                        job=job,
                        match_score=float(ranking.get('match_score', 0)),
                        skill_match_score=float(ranking.get('skill_match_score', 0)),
                        location_match_score=float(ranking.get('location_match_score', 0)),
                        experience_match_score=float(ranking.get('experience_match_score', 0)),
                        salary_match_score=float(ranking.get('salary_match_score', 0)),
                        culture_match_score=float(ranking.get('culture_match_score', 50)),
                        match_explanation=ranking.get('match_explanation', ''),
                        missing_skills=ranking.get('missing_skills', []),
                        matching_skills=ranking.get('matching_skills', []),
                        recommendation=ranking.get('recommendation', 'Maybe'),
                        improvement_suggestions=ranking.get('improvement_suggestions', [])
                    )
                    
                    ranked_jobs.append(ranked_job)
                    
                except Exception as e:
                    logger.warning(f"Failed to create ranked job {i}: {e}")
                    continue
            
            # Sort by match score (highest first)
            ranked_jobs.sort(key=lambda x: x.match_score, reverse=True)
            
            return ranked_jobs
            
        except Exception as e:
            logger.error(f"Job ranking failed: {e}")
            # Fallback: create basic rankings
            return [
                RankedJob(
                    job=job,
                    match_score=50.0,  # Default score
                    skill_match_score=50.0,
                    location_match_score=50.0,
                    experience_match_score=50.0,
                    salary_match_score=50.0,
                    match_explanation="Ranking unavailable - fallback scoring",
                    recommendation="Maybe"
                )
                for job in jobs
            ]
    
    def _select_top_matches(self, ranked_jobs: List[RankedJob], top_k: int) -> List[RankedJob]:
        """Select top K matches with quality filtering"""
        # Filter by minimum score threshold
        quality_jobs = [
            job for job in ranked_jobs 
            if job.match_score >= self.min_match_score_threshold
        ]
        
        # If we don't have enough quality jobs, lower the threshold
        if len(quality_jobs) < min(top_k, 3):
            quality_jobs = ranked_jobs
        
        return quality_jobs[:top_k]
    
    def _get_sources_used(self, queries: List[str]) -> List[JobSource]:
        """Determine which sources were likely used based on queries"""
        sources = set()
        
        for query in queries:
            query_lower = query.lower()
            if 'site:' in query_lower:
                if 'linkedin' in query_lower:
                    sources.add(JobSource.LINKEDIN)
                elif 'greenhouse' in query_lower:
                    sources.add(JobSource.GREENHOUSE)
                elif 'lever' in query_lower:
                    sources.add(JobSource.LEVER)
                elif 'workday' in query_lower:
                    sources.add(JobSource.WORKDAY)
                else:
                    sources.add(JobSource.COMPANY_WEBSITE)
            else:
                sources.add(JobSource.OTHER)
        
        return list(sources)
    
    async def analyze_job_fit(
        self,
        job_url: str,
        user_preferences: UserPreferences
    ) -> Dict[str, Any]:
        """Detailed analysis of how well a specific job matches user"""
        try:
            # First, search for the job details
            job_search_result = await self.client.search_with_context(
                query=f"job details {job_url}",
                context="Extract detailed job information including requirements, responsibilities, and company info"
            )
            
            # Extract job data
            job_data = await self.client.extract_structured_data(
                content=job_search_result,
                schema="Job listing object",
                instructions="Extract complete job details"
            )
            
            # Analyze fit
            user_profile = asdict(user_preferences)
            
            fit_analysis = await self.client.analyze_job_fit(job_data, user_profile)
            
            return fit_analysis
            
        except Exception as e:
            logger.error(f"Job fit analysis failed for {job_url}: {e}")
            raise
    
    def get_search_history(self, limit: Optional[int] = None) -> List[JobSearchResult]:
        """Get recent search history"""
        history = sorted(self.search_history, key=lambda x: x.search_timestamp, reverse=True)
        return history[:limit] if limit else history
    
    def clear_search_history(self) -> None:
        """Clear search history"""
        self.search_history.clear()
        logger.info("Search history cleared")
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        if not self.search_history:
            return {"total_searches": 0}
        
        total_searches = len(self.search_history)
        total_jobs_found = sum(result.total_jobs_found for result in self.search_history)
        avg_duration = sum(result.search_duration_seconds for result in self.search_history) / total_searches
        avg_match_score = sum(result.average_match_score for result in self.search_history) / total_searches
        
        return {
            "total_searches": total_searches,
            "total_jobs_found": total_jobs_found,
            "average_duration_seconds": avg_duration,
            "average_match_score": avg_match_score,
            "jobs_per_search": total_jobs_found / total_searches if total_searches > 0 else 0
        }
