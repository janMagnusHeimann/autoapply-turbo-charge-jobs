"""
OpenAI Job Search Agent - AI-powered job discovery using OpenAI with Web Search
"""

import logging
import asyncio
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import asdict

from ..models.user_preferences import UserPreferences
from ..models.job_listing import JobListing, RankedJob, JobSearchResult, JobSource
from ...infrastructure.clients.openai_client import OpenAIClient
from ...prompts.search_prompts import SearchPrompts
from ...config import config

logger = logging.getLogger(__name__)

class OpenAIJobSearchAgent:
    """Primary agent for job discovery using OpenAI's search capabilities"""
    
    def __init__(self, openai_client: Optional[OpenAIClient] = None):
        self.client = openai_client or OpenAIClient()
        self.search_history = []
        self.prompts = SearchPrompts()
        
        # Performance settings
        self.max_search_queries = 6
        self.max_jobs_per_query = 20
        self.min_match_score_threshold = 40
        
        logger.info("Initialized OpenAI Job Search Agent")
    
    async def find_matching_jobs_enhanced(
        self,
        company: str,
        company_website: str,
        user_preferences: UserPreferences,
        preferred_locations: List[str] = None,
        top_k: int = 10,
        use_enhanced_prompting: bool = True
    ) -> JobSearchResult:
        """
        Enhanced job search method using modern prompting techniques
        
        Args:
            company: Target company name
            company_website: Company website URL
            user_preferences: User's job preferences and profile
            preferred_locations: Override user locations with specific preferences
            top_k: Number of top matches to return
            use_enhanced_prompting: Whether to use the enhanced prompt system
            
        Returns:
            JobSearchResult with ranked job matches
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Starting enhanced job search for {company}")
            
            if use_enhanced_prompting:
                # Use enhanced prompt system for better results
                enhanced_prompt = self.prompts.build_enhanced_job_search_prompt(
                    company=company,
                    company_website=company_website,
                    user_preferences=user_preferences,
                    preferred_locations=preferred_locations
                )
                
                # Execute direct enhanced search
                logger.info("Using enhanced prompting for direct job search")
                search_result = await self.client.search_with_context(
                    query=f"{company} jobs careers hiring",
                    context=enhanced_prompt
                )
                
                # Parse enhanced search results
                jobs_data = await self._parse_enhanced_search_results(search_result, company)
                logger.info(f"Enhanced search extracted {len(jobs_data)} job listings")
                
                # Convert to JobListing objects
                all_jobs = []
                for job_data in jobs_data:
                    job_listing = self._create_job_listing_from_enhanced_data(job_data, company)
                    if job_listing:
                        all_jobs.append(job_listing)
                
            else:
                # Fall back to original multi-query approach
                logger.info("Using traditional multi-query search approach")
                
                # Step 1: Generate targeted search queries
                search_queries = await self._generate_search_queries(company, user_preferences)
                logger.info(f"Generated {len(search_queries)} search queries")
                
                # Step 2: Execute searches in parallel
                search_results = await self._execute_parallel_searches(search_queries)
                logger.info(f"Completed {len(search_results)} searches")
                
                # Step 3: Extract structured job data
                all_jobs = await self._extract_jobs_from_results(search_results, company)
                logger.info(f"Extracted {len(all_jobs)} job listings")
            
            # Log if no jobs found
            if len(all_jobs) == 0:
                logger.warning(f"No jobs found for {company}")
            
            # Step 4: Deduplicate jobs
            unique_jobs = self._deduplicate_jobs(all_jobs)
            logger.info(f"After deduplication: {len(unique_jobs)} unique jobs")
            
            # Step 5: Apply location filtering if preferred_locations specified
            if preferred_locations:
                location_filtered_jobs = self._filter_jobs_by_location(unique_jobs, preferred_locations)
                logger.info(f"After location filtering: {len(location_filtered_jobs)} jobs")
                unique_jobs = location_filtered_jobs
            
            # Step 6: Score and rank jobs
            ranked_jobs = await self._rank_jobs(unique_jobs, user_preferences)
            logger.info(f"Ranked {len(ranked_jobs)} jobs")
            
            # Step 7: Filter and select top K
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
                search_queries_used=[f"Enhanced prompt search for {company}"] if use_enhanced_prompting else await self._generate_search_queries(company, user_preferences),
                sources_searched=[JobSource.AI_GENERATED] if use_enhanced_prompting else self._get_sources_used(await self._generate_search_queries(company, user_preferences)),
                search_duration_seconds=duration,
                average_match_score=sum(job.match_score for job in top_matches) / len(top_matches) if top_matches else 0,
                jobs_above_threshold=len([job for job in ranked_jobs if job.match_score >= 70])
            )
            
            # Store in search history
            self.search_history.append(result)
            
            logger.info(f"Enhanced job search completed for {company}: {len(top_matches)} top matches found")
            return result
            
        except Exception as e:
            logger.error(f"Enhanced job search failed for {company}: {e}")
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
        # Use enhanced method by default
        return await self.find_matching_jobs_enhanced(
            company=company,
            company_website=company_website,
            user_preferences=user_preferences,
            preferred_locations=None,
            top_k=top_k,
            use_enhanced_prompting=True
        )
    
    async def _generate_search_queries(self, company: str, user_preferences: UserPreferences) -> List[str]:
        """Generate multiple targeted search queries"""
        try:
            # Use predefined query templates
            template_queries = self.prompts.build_targeted_search_queries(company, user_preferences)
            
            # Also generate AI-powered queries for more creativity
            user_context = f"""
            Skills: {', '.join(user_preferences.skills[:5])}
            Experience: {str(user_preferences.experience_level)} ({user_preferences.experience_years} years)
            Preferred roles: {', '.join(user_preferences.desired_roles)}
            Locations: {', '.join(user_preferences.locations)}
            Work type: {', '.join([str(jt) for jt in user_preferences.job_types])}
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
            search_with_delay(query, i * 0.75)  # 0.75 second delays between searches (faster than Gemini)
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
    
    async def _parse_enhanced_search_results(self, search_result: str, company: str) -> List[Dict[str, Any]]:
        """Parse results from enhanced search prompt into structured job data"""
        try:
            # The enhanced prompt should return JSON directly
            jobs_data = await self.client.extract_structured_data(
                content=search_result,
                schema="Array of enhanced job listing objects",
                instructions=f"Parse the search results and extract job listings for {company} in the enhanced format"
            )
            
            # Handle different response formats
            if isinstance(jobs_data, list):
                return jobs_data
            elif isinstance(jobs_data, dict):
                if 'jobs' in jobs_data:
                    return jobs_data['jobs']
                elif 'job_listings' in jobs_data:
                    return jobs_data['job_listings']
                else:
                    # Single job object
                    return [jobs_data] if 'job_title' in jobs_data else []
            else:
                logger.warning(f"Unexpected enhanced search data format: {type(jobs_data)}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to parse enhanced search results: {e}")
            return []
    
    def _create_job_listing_from_enhanced_data(self, job_data: Dict[str, Any], company: str) -> Optional[JobListing]:
        """Create JobListing object from enhanced search data format"""
        try:
            from datetime import datetime
            from ..models.job_listing import JobType, ExperienceLevel, JobListing
            
            # Map enhanced data fields to JobListing format
            job_type_mapping = {
                'remote': JobType.REMOTE,
                'hybrid': JobType.HYBRID,
                'onsite': JobType.ONSITE,
                'full-time': JobType.FULL_TIME,
                'part-time': JobType.PART_TIME,
                'contract': JobType.CONTRACT,
                'internship': JobType.INTERNSHIP
            }
            
            experience_mapping = {
                'entry': ExperienceLevel.ENTRY,
                'junior': ExperienceLevel.ENTRY,
                'mid': ExperienceLevel.MID,
                'senior': ExperienceLevel.SENIOR,
                'lead': ExperienceLevel.LEAD,
                'principal': ExperienceLevel.PRINCIPAL,
                'staff': ExperienceLevel.PRINCIPAL
            }
            
            # Extract basic information
            title = job_data.get('job_title', '').strip()
            if not title:
                return None
                
            location = job_data.get('location', '').strip()
            location_type = job_data.get('location_type', 'onsite').lower()
            job_type = job_type_mapping.get(location_type, JobType.ONSITE)
            
            # Handle employment type
            employment_type = job_data.get('employment_type', 'full-time').lower()
            if employment_type in job_type_mapping:
                job_type = job_type_mapping[employment_type]
            
            # Experience level
            exp_level_str = job_data.get('experience_level', 'mid').lower()
            experience_level = experience_mapping.get(exp_level_str, ExperienceLevel.MID)
            
            # Skills
            required_skills = job_data.get('required_skills', [])
            nice_to_have_skills = job_data.get('nice_to_have_skills', [])
            
            # Salary information
            salary_range = job_data.get('salary_range', {})
            salary_min = salary_range.get('min') if isinstance(salary_range, dict) else None
            salary_max = salary_range.get('max') if isinstance(salary_range, dict) else None
            salary_currency = salary_range.get('currency', 'USD') if isinstance(salary_range, dict) else 'USD'
            
            # Experience years
            years_exp = job_data.get('years_experience_required', {})
            min_years = years_exp.get('minimum') if isinstance(years_exp, dict) else None
            max_years = years_exp.get('preferred') if isinstance(years_exp, dict) else None
            
            # URLs
            application_url = job_data.get('application_url', '').strip()
            source_url = job_data.get('source_url', '').strip()
            
            # Description
            description = job_data.get('job_description_summary', '').strip()
            
            # Posted date
            posted_date_str = job_data.get('posted_date')
            posted_date = None
            if posted_date_str:
                try:
                    posted_date = datetime.strptime(posted_date_str, '%Y-%m-%d').date()
                except ValueError:
                    pass
            
            # Create JobListing object
            job_listing = JobListing(
                title=title,
                company_id=company,  # Using company name as ID
                description=description,
                location=location,
                job_type=job_type,
                department=job_data.get('department'),
                experience_level=experience_level,
                employment_type=job_data.get('employment_type'),
                required_skills=required_skills,
                nice_to_have_skills=nice_to_have_skills,
                experience_years_min=min_years,
                experience_years_max=max_years,
                salary_min=salary_min,
                salary_max=salary_max,
                salary_currency=salary_currency,
                equity_offered=salary_range.get('equity') if isinstance(salary_range, dict) else None,
                application_url=application_url if application_url else None,
                posted_date=posted_date,
                benefits=job_data.get('benefits_highlights', []),
                technologies=required_skills + nice_to_have_skills  # Combine skills as technologies
            )
            
            return job_listing
            
        except Exception as e:
            logger.error(f"Failed to create job listing from enhanced data: {e}")
            logger.debug(f"Job data: {job_data}")
            return None
    
    def _filter_jobs_by_location(self, jobs: List[JobListing], preferred_locations: List[str]) -> List[JobListing]:
        """Filter jobs by preferred locations"""
        if not preferred_locations:
            return jobs
        
        filtered_jobs = []
        preferred_locations_lower = [loc.lower() for loc in preferred_locations]
        
        for job in jobs:
            job_location = job.location.lower() if job.location else ""
            
            # Check if job matches any preferred location
            location_match = False
            
            # Check for remote work
            if any(keyword in job_location for keyword in ['remote', 'anywhere', 'work from home']):
                if any(remote_keyword in preferred_locations_lower for remote_keyword in ['remote', 'anywhere']):
                    location_match = True
            
            # Check for specific location matches
            for pref_loc in preferred_locations_lower:
                if pref_loc in job_location or any(part in job_location for part in pref_loc.split(',')):
                    location_match = True
                    break
            
            # Check job type for remote work
            if job.job_type and str(job.job_type).lower() in ['remote', 'hybrid']:
                if any(remote_keyword in preferred_locations_lower for remote_keyword in ['remote', 'anywhere', 'hybrid']):
                    location_match = True
            
            if location_match:
                filtered_jobs.append(job)
        
        return filtered_jobs
    
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
    
