"""
Job Matching Agent - Specialized agent for scoring job compatibility with user preferences.
Uses advanced matching algorithms and AI-powered analysis.
"""

import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple
from datetime import datetime
from dataclasses import dataclass, field
import math

from ..core.base_agent import BaseAgent, AgentAction, AgentObservation, ActionType

logger = logging.getLogger(__name__)


@dataclass
class UserPreferences:
    """User preferences for job matching."""
    skills: List[str] = field(default_factory=list)
    locations: List[str] = field(default_factory=list)
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    experience_years: int = 0
    job_types: List[str] = field(default_factory=list)  # remote, hybrid, onsite
    industries: List[str] = field(default_factory=list)
    company_sizes: List[str] = field(default_factory=list)  # startup, small, medium, large
    role_levels: List[str] = field(default_factory=list)  # junior, mid, senior, lead
    required_skills: List[str] = field(default_factory=list)  # Must-have skills
    preferred_skills: List[str] = field(default_factory=list)  # Nice-to-have skills
    blacklisted_companies: List[str] = field(default_factory=list)
    blacklisted_keywords: List[str] = field(default_factory=list)
    minimum_match_score: float = 0.3


@dataclass 
class JobMatchResult:
    """Result of job matching analysis."""
    job_id: str
    job_title: str
    company: str
    overall_score: float
    recommendation: str  # highly_recommended, recommended, consider, not_recommended
    
    # Detailed scoring breakdown
    skills_score: float = 0.0
    location_score: float = 0.0
    salary_score: float = 0.0
    experience_score: float = 0.0
    job_type_score: float = 0.0
    company_score: float = 0.0
    
    # Analysis details
    matching_skills: List[str] = field(default_factory=list)
    missing_required_skills: List[str] = field(default_factory=list)
    location_details: Dict[str, Any] = field(default_factory=dict)
    salary_analysis: Dict[str, Any] = field(default_factory=dict)
    fit_analysis: str = ""
    confidence_score: float = 0.0
    
    # Metadata
    analyzed_at: datetime = field(default_factory=datetime.utcnow)
    analysis_method: str = "standard"


class JobMatchingAgent(BaseAgent):
    """
    Specialized agent for matching jobs to user preferences.
    
    Capabilities:
    - Multi-factor compatibility scoring
    - Skills relationship mapping
    - Location and remote work analysis
    - Salary range analysis
    - AI-powered fit assessment
    - Batch job processing
    """
    
    def __init__(self, llm_client, config=None):
        super().__init__(
            name="JobMatchingAgent",
            llm_client=llm_client,
            browser_controller=None,  # Doesn't need browser
            config=config
        )
        
        # Skills relationship mapping
        self.skills_relationships = self._build_skills_relationships()
        
        # Location normalization mapping
        self.location_aliases = self._build_location_aliases()
        
        # Experience level mapping
        self.experience_levels = {
            'intern': 0,
            'entry': 1,
            'junior': 2,
            'mid': 4,
            'senior': 7,
            'lead': 10,
            'principal': 12,
            'staff': 15
        }
        
        # Matching configuration
        self.matching_weights = {
            'skills': 0.35,
            'location': 0.15,
            'salary': 0.15,
            'experience': 0.15,
            'job_type': 0.10,
            'company': 0.10
        }
        
        # Recommendation thresholds
        self.recommendation_thresholds = {
            'highly_recommended': 0.8,
            'recommended': 0.6,
            'consider': 0.4,
            'not_recommended': 0.0
        }
        
        # Cache for AI analysis
        self.ai_analysis_cache = {}
        
    async def match_jobs_to_preferences(
        self,
        jobs: List[Dict[str, Any]],
        user_preferences: UserPreferences,
        include_ai_analysis: bool = True
    ) -> Dict[str, Any]:
        """
        Main method to match jobs against user preferences.
        
        Args:
            jobs: List of job dictionaries
            user_preferences: User preferences object
            include_ai_analysis: Whether to include AI-powered analysis
            
        Returns:
            Matching results with scored and ranked jobs
        """
        task = {
            'description': f'Match {len(jobs)} jobs to user preferences',
            'jobs': jobs,
            'user_preferences': user_preferences,
            'include_ai_analysis': include_ai_analysis,
            'strategy': 'comprehensive_matching'
        }
        
        return await self.execute_task(task)
    
    async def _observe(self) -> AgentObservation:
        """Observe the jobs and preferences to be matched."""
        try:
            jobs = self.current_task['jobs']
            user_preferences = self.current_task['user_preferences']
            
            # Validate inputs
            if not jobs:
                return AgentObservation(
                    content={'error': 'No jobs provided for matching'},
                    observation_type='input_error'
                )
            
            if not user_preferences.skills and not user_preferences.required_skills:
                return AgentObservation(
                    content={'error': 'No skills specified in user preferences'},
                    observation_type='input_error'
                )
            
            # Analyze job data quality
            job_analysis = self._analyze_job_data_quality(jobs)
            
            # Prepare matching context
            matching_context = {
                'total_jobs': len(jobs),
                'job_quality_analysis': job_analysis,
                'user_preferences_summary': self._summarize_preferences(user_preferences),
                'matching_strategy': self._determine_matching_strategy(jobs, user_preferences)
            }
            
            return AgentObservation(
                content={
                    'jobs': jobs,
                    'user_preferences': user_preferences,
                    'matching_context': matching_context,
                    'include_ai_analysis': self.current_task.get('include_ai_analysis', True)
                },
                observation_type='ready_for_matching',
                confidence=1.0
            )
            
        except Exception as e:
            logger.error(f"Job matching observation failed: {e}")
            return AgentObservation(
                content={'error': str(e)},
                observation_type='error',
                confidence=0.0
            )
    
    async def _orient(self, observation: AgentObservation) -> Dict[str, Any]:
        """Analyze the matching context and determine approach."""
        content = observation.content
        
        if 'error' in content:
            return {
                'situation': 'error',
                'error': content['error'],
                'next_strategy': 'fail'
            }
        
        jobs = content['jobs']
        user_preferences = content['user_preferences']
        matching_context = content['matching_context']
        
        # Determine matching complexity
        complexity_factors = {
            'job_count': len(jobs),
            'has_required_skills': len(user_preferences.required_skills) > 0,
            'has_salary_requirements': user_preferences.salary_min is not None,
            'has_location_preferences': len(user_preferences.locations) > 0,
            'include_ai_analysis': content['include_ai_analysis']
        }
        
        # Determine processing strategy
        if len(jobs) > 100:
            processing_strategy = 'batch_processing'
        elif content['include_ai_analysis']:
            processing_strategy = 'ai_enhanced_matching'
        else:
            processing_strategy = 'standard_matching'
        
        context = {
            'processing_strategy': processing_strategy,
            'complexity_factors': complexity_factors,
            'estimated_processing_time': self._estimate_processing_time(complexity_factors),
            'matching_approach': matching_context['matching_strategy']
        }
        
        # Store context in memory
        self.memory.update_working_memory('matching_context', context)
        self.memory.update_working_memory('user_preferences', user_preferences)
        
        return {
            'situation': 'ready_to_match',
            'context': context,
            'jobs_count': len(jobs)
        }
    
    async def _decide(self, context: Dict[str, Any]) -> AgentAction:
        """Decide on the matching approach."""
        situation = context['situation']
        
        if situation == 'error':
            return AgentAction(
                action_type=ActionType.CUSTOM,
                parameters={'action': 'handle_error', 'error': context['error']},
                confidence=1.0,
                reasoning="Handle error condition"
            )
        
        elif situation == 'ready_to_match':
            processing_strategy = context['context']['processing_strategy']
            
            return AgentAction(
                action_type=ActionType.CUSTOM,
                parameters={'action': 'perform_matching', 'strategy': processing_strategy},
                confidence=0.9,
                reasoning=f"Perform job matching using {processing_strategy} strategy"
            )
        
        else:
            return AgentAction(
                action_type=ActionType.CUSTOM,
                parameters={'action': 'complete_matching'},
                confidence=1.0,
                reasoning="Complete matching process"
            )
    
    async def _handle_custom_action(self, action: AgentAction) -> Dict[str, Any]:
        """Handle custom matching actions."""
        action_name = action.parameters.get('action')
        
        if action_name == 'handle_error':
            return await self._handle_error_action(action)
        elif action_name == 'perform_matching':
            return await self._perform_matching(action)
        elif action_name == 'complete_matching':
            return await self._complete_matching()
        else:
            return {"success": False, "error": f"Unknown action: {action_name}"}
    
    async def _perform_matching(self, action: AgentAction) -> Dict[str, Any]:
        """Perform the job matching process."""
        strategy = action.parameters.get('strategy', 'standard_matching')
        
        try:
            jobs = self.current_task['jobs']
            user_preferences = self.current_task['user_preferences']
            include_ai_analysis = self.current_task.get('include_ai_analysis', True)
            
            # Pre-filter jobs
            filtered_jobs = self._pre_filter_jobs(jobs, user_preferences)
            logger.info(f"Pre-filtered {len(jobs)} jobs to {len(filtered_jobs)} candidates")
            
            # Perform matching based on strategy
            if strategy == 'batch_processing':
                match_results = await self._batch_match_jobs(filtered_jobs, user_preferences)
            elif strategy == 'ai_enhanced_matching':
                match_results = await self._ai_enhanced_match_jobs(filtered_jobs, user_preferences)
            else:
                match_results = await self._standard_match_jobs(filtered_jobs, user_preferences)
            
            # Sort by overall score
            match_results.sort(key=lambda x: x.overall_score, reverse=True)
            
            # Generate summary statistics
            match_summary = self._generate_match_summary(match_results, user_preferences)
            
            # Store results
            self.memory.update_working_memory('match_results', match_results)
            self.memory.update_working_memory('match_summary', match_summary)
            
            return {
                "success": True,
                "matching_complete": True,
                "total_matches": len(match_results),
                "match_results": match_results,
                "match_summary": match_summary,
                "strategy_used": strategy
            }
            
        except Exception as e:
            logger.error(f"Job matching failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _standard_match_jobs(self, jobs: List[Dict[str, Any]], preferences: UserPreferences) -> List[JobMatchResult]:
        """Perform standard rule-based job matching."""
        results = []
        
        for i, job in enumerate(jobs):
            try:
                # Calculate individual scores
                skills_score = self._calculate_skills_score(job, preferences)
                location_score = self._calculate_location_score(job, preferences)
                salary_score = self._calculate_salary_score(job, preferences)
                experience_score = self._calculate_experience_score(job, preferences)
                job_type_score = self._calculate_job_type_score(job, preferences)
                company_score = self._calculate_company_score(job, preferences)
                
                # Calculate weighted overall score
                overall_score = (
                    skills_score * self.matching_weights['skills'] +
                    location_score * self.matching_weights['location'] +
                    salary_score * self.matching_weights['salary'] +
                    experience_score * self.matching_weights['experience'] +
                    job_type_score * self.matching_weights['job_type'] +
                    company_score * self.matching_weights['company']
                )
                
                # Determine recommendation
                recommendation = self._get_recommendation(overall_score)
                
                # Create detailed analysis
                matching_skills = self._get_matching_skills(job, preferences)
                missing_required = self._get_missing_required_skills(job, preferences)
                
                result = JobMatchResult(
                    job_id=job.get('id', f'job_{i}'),
                    job_title=job.get('title', 'Unknown'),
                    company=job.get('company', 'Unknown'),
                    overall_score=overall_score,
                    recommendation=recommendation,
                    skills_score=skills_score,
                    location_score=location_score,
                    salary_score=salary_score,
                    experience_score=experience_score,
                    job_type_score=job_type_score,
                    company_score=company_score,
                    matching_skills=matching_skills,
                    missing_required_skills=missing_required,
                    location_details=self._analyze_location_match(job, preferences),
                    salary_analysis=self._analyze_salary_match(job, preferences),
                    confidence_score=0.8,  # Standard matching confidence
                    analysis_method="standard"
                )
                
                results.append(result)
                
            except Exception as e:
                logger.error(f"Failed to match job {i}: {e}")
                continue
        
        return results
    
    async def _ai_enhanced_match_jobs(self, jobs: List[Dict[str, Any]], preferences: UserPreferences) -> List[JobMatchResult]:
        """Perform AI-enhanced job matching."""
        # Start with standard matching
        results = await self._standard_match_jobs(jobs, preferences)
        
        # Enhance with AI analysis for top candidates
        top_candidates = [r for r in results if r.overall_score > 0.5][:20]  # Top 20 or score > 0.5
        
        for result in top_candidates:
            try:
                # Find the original job data
                job = next(j for j in jobs if j.get('title') == result.job_title)
                
                # Get AI analysis
                ai_analysis = await self._get_ai_job_analysis(job, preferences)
                
                # Update result with AI insights
                if ai_analysis:
                    result.fit_analysis = ai_analysis.get('fit_analysis', '')
                    
                    # Adjust overall score based on AI analysis
                    ai_score_adjustment = ai_analysis.get('score_adjustment', 0.0)
                    result.overall_score = max(0.0, min(1.0, result.overall_score + ai_score_adjustment))
                    
                    # Update recommendation based on new score
                    result.recommendation = self._get_recommendation(result.overall_score)
                    
                    # Increase confidence for AI-enhanced analysis
                    result.confidence_score = 0.9
                    result.analysis_method = "ai_enhanced"
                
            except Exception as e:
                logger.error(f"AI enhancement failed for {result.job_title}: {e}")
                continue
        
        return results
    
    async def _batch_match_jobs(self, jobs: List[Dict[str, Any]], preferences: UserPreferences) -> List[JobMatchResult]:
        """Perform batch job matching for large datasets."""
        # Process in chunks to avoid memory issues
        chunk_size = 50
        all_results = []
        
        for i in range(0, len(jobs), chunk_size):
            chunk = jobs[i:i + chunk_size]
            chunk_results = await self._standard_match_jobs(chunk, preferences)
            all_results.extend(chunk_results)
            
            # Brief pause to prevent overwhelming the system
            await asyncio.sleep(0.1)
        
        return all_results
    
    def _pre_filter_jobs(self, jobs: List[Dict[str, Any]], preferences: UserPreferences) -> List[Dict[str, Any]]:
        """Pre-filter jobs based on hard requirements."""
        filtered_jobs = []
        
        for job in jobs:
            # Skip blacklisted companies
            company = job.get('company', '').lower()
            if any(blacklisted.lower() in company for blacklisted in preferences.blacklisted_companies):
                continue
            
            # Skip jobs with blacklisted keywords
            job_text = f"{job.get('title', '')} {job.get('description', '')}".lower()
            if any(keyword.lower() in job_text for keyword in preferences.blacklisted_keywords):
                continue
            
            # Check required skills if specified
            if preferences.required_skills:
                job_skills = self._extract_job_skills(job)
                has_required = any(
                    self._skills_match(req_skill, job_skills) 
                    for req_skill in preferences.required_skills
                )
                if not has_required:
                    continue
            
            filtered_jobs.append(job)
        
        return filtered_jobs
    
    def _calculate_skills_score(self, job: Dict[str, Any], preferences: UserPreferences) -> float:
        """Calculate skills compatibility score."""
        job_skills = self._extract_job_skills(job)
        user_skills = preferences.skills + preferences.preferred_skills
        
        if not user_skills or not job_skills:
            return 0.0
        
        # Calculate matches using skills relationships
        matches = 0
        total_weight = 0
        
        for user_skill in user_skills:
            skill_weight = 2.0 if user_skill in preferences.required_skills else 1.0
            total_weight += skill_weight
            
            if self._skills_match(user_skill, job_skills):
                matches += skill_weight
        
        return matches / total_weight if total_weight > 0 else 0.0
    
    def _calculate_location_score(self, job: Dict[str, Any], preferences: UserPreferences) -> float:
        """Calculate location compatibility score."""
        if not preferences.locations:
            return 1.0  # No preference = perfect match
        
        job_location = job.get('location', '').lower()
        job_type = job.get('job_type', '').lower()
        
        # Remote work handling
        if 'remote' in preferences.job_types and ('remote' in job_location or 'remote' in job_type):
            return 1.0
        
        # Location matching
        for pref_location in preferences.locations:
            if self._location_matches(pref_location.lower(), job_location):
                return 1.0
        
        return 0.0
    
    def _calculate_salary_score(self, job: Dict[str, Any], preferences: UserPreferences) -> float:
        """Calculate salary compatibility score."""
        if preferences.salary_min is None and preferences.salary_max is None:
            return 1.0  # No preference = perfect match
        
        job_salary = self._parse_salary_range(job.get('salary_range', ''))
        if not job_salary:
            return 0.5  # Unknown salary = neutral
        
        job_min, job_max = job_salary
        
        # Calculate overlap score
        if preferences.salary_min and preferences.salary_max:
            pref_min, pref_max = preferences.salary_min, preferences.salary_max
            
            # Calculate range overlap
            overlap_start = max(job_min, pref_min)
            overlap_end = min(job_max, pref_max)
            
            if overlap_start <= overlap_end:
                overlap_size = overlap_end - overlap_start
                pref_range_size = pref_max - pref_min
                return min(1.0, overlap_size / pref_range_size)
            else:
                return 0.0
        
        elif preferences.salary_min:
            return 1.0 if job_max >= preferences.salary_min else 0.0
        
        elif preferences.salary_max:
            return 1.0 if job_min <= preferences.salary_max else 0.0
        
        return 0.5
    
    def _calculate_experience_score(self, job: Dict[str, Any], preferences: UserPreferences) -> float:
        """Calculate experience level compatibility score."""
        job_experience = self._parse_experience_level(job.get('experience_level', ''))
        user_experience = preferences.experience_years
        
        if job_experience is None:
            return 0.7  # Unknown experience = slight penalty
        
        # Calculate experience match score
        experience_diff = abs(job_experience - user_experience)
        
        if experience_diff <= 1:
            return 1.0
        elif experience_diff <= 3:
            return 0.8
        elif experience_diff <= 5:
            return 0.6
        else:
            return 0.3
    
    def _calculate_job_type_score(self, job: Dict[str, Any], preferences: UserPreferences) -> float:
        """Calculate job type compatibility score."""
        if not preferences.job_types:
            return 1.0  # No preference = perfect match
        
        job_type = job.get('job_type', '').lower()
        job_location = job.get('location', '').lower()
        
        # Check for job type matches
        for pref_type in preferences.job_types:
            pref_type_lower = pref_type.lower()
            
            if (pref_type_lower in job_type or 
                pref_type_lower in job_location or
                (pref_type_lower == 'remote' and 'remote' in f"{job_type} {job_location}")):
                return 1.0
        
        return 0.0
    
    def _calculate_company_score(self, job: Dict[str, Any], preferences: UserPreferences) -> float:
        """Calculate company compatibility score."""
        # For now, just check if not blacklisted (already filtered)
        # Could be enhanced with company size, industry preferences, etc.
        return 1.0
    
    def _skills_match(self, user_skill: str, job_skills: List[str]) -> bool:
        """Check if a user skill matches any job skill."""
        user_skill_lower = user_skill.lower()
        
        # Direct match
        for job_skill in job_skills:
            if user_skill_lower in job_skill.lower() or job_skill.lower() in user_skill_lower:
                return True
        
        # Related skills match
        related_skills = self.skills_relationships.get(user_skill_lower, [])
        for related in related_skills:
            for job_skill in job_skills:
                if related in job_skill.lower():
                    return True
        
        return False
    
    def _location_matches(self, pref_location: str, job_location: str) -> bool:
        """Check if locations match, considering aliases."""
        if pref_location in job_location:
            return True
        
        # Check aliases
        aliases = self.location_aliases.get(pref_location, [])
        return any(alias in job_location for alias in aliases)
    
    def _extract_job_skills(self, job: Dict[str, Any]) -> List[str]:
        """Extract skills from job data."""
        skills = job.get('skills', [])
        if skills:
            return skills
        
        # Extract from description if skills not explicitly listed
        description = job.get('description', '')
        title = job.get('title', '')
        
        # Common tech skills to look for
        tech_skills = [
            'python', 'javascript', 'java', 'react', 'node.js', 'sql',
            'aws', 'docker', 'kubernetes', 'git', 'html', 'css',
            'typescript', 'go', 'rust', 'c++', 'c#', 'ruby', 'php',
            'angular', 'vue', 'flask', 'django', 'spring', 'mongodb',
            'postgresql', 'redis', 'elasticsearch', 'kafka', 'terraform'
        ]
        
        found_skills = []
        text = f"{title} {description}".lower()
        
        for skill in tech_skills:
            if skill in text:
                found_skills.append(skill)
        
        return found_skills
    
    def _parse_salary_range(self, salary_str: str) -> Optional[Tuple[int, int]]:
        """Parse salary range string into min/max tuple."""
        if not salary_str:
            return None
        
        # Remove currency symbols and commas
        cleaned = re.sub(r'[£$€,]', '', salary_str)
        
        # Look for range patterns
        range_patterns = [
            r'(\d+)\s*-\s*(\d+)',  # 50000 - 70000
            r'(\d+)\s*to\s*(\d+)',  # 50000 to 70000
            r'(\d+)k\s*-\s*(\d+)k',  # 50k - 70k
        ]
        
        for pattern in range_patterns:
            match = re.search(pattern, cleaned, re.IGNORECASE)
            if match:
                min_sal = int(match.group(1))
                max_sal = int(match.group(2))
                
                # Handle k notation
                if 'k' in salary_str.lower():
                    min_sal *= 1000
                    max_sal *= 1000
                
                return (min_sal, max_sal)
        
        # Single number
        single_match = re.search(r'(\d+)', cleaned)
        if single_match:
            salary = int(single_match.group(1))
            if 'k' in salary_str.lower():
                salary *= 1000
            return (salary, salary)
        
        return None
    
    def _parse_experience_level(self, experience_str: str) -> Optional[int]:
        """Parse experience level string into years."""
        if not experience_str:
            return None
        
        experience_lower = experience_str.lower()
        
        # Check predefined levels
        for level, years in self.experience_levels.items():
            if level in experience_lower:
                return years
        
        # Look for year patterns
        year_patterns = [
            r'(\d+)\+?\s*years?',
            r'(\d+)\+?\s*yrs?',
            r'(\d+)-(\d+)\s*years?'
        ]
        
        for pattern in year_patterns:
            match = re.search(pattern, experience_lower)
            if match:
                if len(match.groups()) == 2:  # Range
                    return int(match.group(2))  # Use upper bound
                else:
                    return int(match.group(1))
        
        return None
    
    def _get_recommendation(self, score: float) -> str:
        """Get recommendation based on score."""
        for rec, threshold in sorted(self.recommendation_thresholds.items(), 
                                   key=lambda x: x[1], reverse=True):
            if score >= threshold:
                return rec
        return 'not_recommended'
    
    def _get_matching_skills(self, job: Dict[str, Any], preferences: UserPreferences) -> List[str]:
        """Get list of matching skills between job and user."""
        job_skills = self._extract_job_skills(job)
        user_skills = preferences.skills + preferences.preferred_skills
        
        matching = []
        for user_skill in user_skills:
            if self._skills_match(user_skill, job_skills):
                matching.append(user_skill)
        
        return matching
    
    def _get_missing_required_skills(self, job: Dict[str, Any], preferences: UserPreferences) -> List[str]:
        """Get list of required skills missing from the job."""
        if not preferences.required_skills:
            return []
        
        job_skills = self._extract_job_skills(job)
        missing = []
        
        for req_skill in preferences.required_skills:
            if not self._skills_match(req_skill, job_skills):
                missing.append(req_skill)
        
        return missing
    
    def _analyze_location_match(self, job: Dict[str, Any], preferences: UserPreferences) -> Dict[str, Any]:
        """Analyze location compatibility in detail."""
        job_location = job.get('location', '')
        job_type = job.get('job_type', '')
        
        return {
            'job_location': job_location,
            'job_type': job_type,
            'user_locations': preferences.locations,
            'user_job_types': preferences.job_types,
            'is_remote': 'remote' in f"{job_location} {job_type}".lower(),
            'location_flexible': 'remote' in preferences.job_types
        }
    
    def _analyze_salary_match(self, job: Dict[str, Any], preferences: UserPreferences) -> Dict[str, Any]:
        """Analyze salary compatibility in detail."""
        job_salary = self._parse_salary_range(job.get('salary_range', ''))
        
        analysis = {
            'job_salary_range': job_salary,
            'user_salary_min': preferences.salary_min,
            'user_salary_max': preferences.salary_max,
            'salary_disclosed': job_salary is not None
        }
        
        if job_salary and preferences.salary_min:
            job_min, job_max = job_salary
            analysis['meets_minimum'] = job_max >= preferences.salary_min
            
        return analysis
    
    async def _get_ai_job_analysis(self, job: Dict[str, Any], preferences: UserPreferences) -> Optional[Dict[str, Any]]:
        """Get AI-powered job fit analysis."""
        # Create cache key
        cache_key = f"{job.get('title', '')}{job.get('company', '')}"
        if cache_key in self.ai_analysis_cache:
            return self.ai_analysis_cache[cache_key]
        
        try:
            prompt = self._create_ai_analysis_prompt(job, preferences)
            
            response = await self._call_llm([
                {"role": "user", "content": prompt}
            ], model="gpt-4o-mini", temperature=0.3)
            
            # Parse AI response
            analysis = self._parse_ai_analysis_response(response)
            
            # Cache the result
            self.ai_analysis_cache[cache_key] = analysis
            
            return analysis
            
        except Exception as e:
            logger.error(f"AI job analysis failed: {e}")
            return None
    
    def _create_ai_analysis_prompt(self, job: Dict[str, Any], preferences: UserPreferences) -> str:
        """Create prompt for AI job analysis."""
        return f"""
Analyze how well this job matches the user's profile and preferences:

JOB:
Title: {job.get('title', 'Unknown')}
Company: {job.get('company', 'Unknown')}
Location: {job.get('location', 'Not specified')}
Job Type: {job.get('job_type', 'Not specified')}
Description: {job.get('description', 'No description')[:1000]}
Skills: {job.get('skills', [])}

USER PREFERENCES:
Skills: {preferences.skills}
Required Skills: {preferences.required_skills}
Preferred Skills: {preferences.preferred_skills}
Experience: {preferences.experience_years} years
Locations: {preferences.locations}
Job Types: {preferences.job_types}

Provide analysis as JSON:
{{
    "fit_analysis": "detailed explanation of job fit",
    "score_adjustment": 0.0,  // -0.2 to +0.2 adjustment to base score
    "key_strengths": ["list of match strengths"],
    "key_concerns": ["list of potential issues"],
    "overall_assessment": "brief summary"
}}
"""
    
    def _parse_ai_analysis_response(self, response: str) -> Dict[str, Any]:
        """Parse AI analysis response."""
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # Fallback parsing if JSON is malformed
            return {
                "fit_analysis": response[:500],
                "score_adjustment": 0.0,
                "key_strengths": [],
                "key_concerns": [],
                "overall_assessment": "AI analysis failed to parse"
            }
    
    def _generate_match_summary(self, results: List[JobMatchResult], preferences: UserPreferences) -> Dict[str, Any]:
        """Generate summary statistics for the matching results."""
        if not results:
            return {"total_jobs": 0, "message": "No matching jobs found"}
        
        # Count by recommendation
        recommendation_counts = {}
        for result in results:
            rec = result.recommendation
            recommendation_counts[rec] = recommendation_counts.get(rec, 0) + 1
        
        # Calculate average scores
        avg_overall = sum(r.overall_score for r in results) / len(results)
        avg_skills = sum(r.skills_score for r in results) / len(results)
        
        # Top skills found
        all_matching_skills = []
        for result in results:
            all_matching_skills.extend(result.matching_skills)
        
        from collections import Counter
        top_skills = Counter(all_matching_skills).most_common(10)
        
        return {
            "total_jobs": len(results),
            "recommendation_breakdown": recommendation_counts,
            "average_scores": {
                "overall": avg_overall,
                "skills": avg_skills
            },
            "top_matching_skills": [{"skill": skill, "count": count} for skill, count in top_skills],
            "best_match": results[0] if results else None,
            "jobs_above_threshold": len([r for r in results if r.overall_score >= preferences.minimum_match_score])
        }
    
    def _is_task_complete(self, action_result: Dict[str, Any]) -> bool:
        """Determine if matching is complete."""
        return action_result.get('matching_complete') is True
    
    def _compile_result(self) -> Dict[str, Any]:
        """Compile final matching results."""
        match_results = self.memory.working_memory.get('match_results', [])
        match_summary = self.memory.working_memory.get('match_summary', {})
        
        return {
            "match_results": match_results,
            "match_summary": match_summary,
            "total_matches": len(match_results),
            "success": len(match_results) > 0
        }
    
    # Helper methods for initialization
    
    def _build_skills_relationships(self) -> Dict[str, List[str]]:
        """Build mapping of related skills."""
        return {
            'javascript': ['js', 'typescript', 'node.js', 'react', 'vue', 'angular'],
            'python': ['django', 'flask', 'fastapi', 'pandas', 'numpy'],
            'java': ['spring', 'spring boot', 'hibernate', 'maven'],
            'react': ['javascript', 'jsx', 'redux', 'next.js'],
            'docker': ['kubernetes', 'containerization', 'devops'],
            'aws': ['cloud', 'ec2', 's3', 'lambda', 'cloudformation'],
            'sql': ['mysql', 'postgresql', 'oracle', 'database'],
            'git': ['github', 'gitlab', 'version control'],
            'linux': ['unix', 'bash', 'shell scripting'],
            'machine learning': ['ml', 'ai', 'tensorflow', 'pytorch', 'scikit-learn']
        }
    
    def _build_location_aliases(self) -> Dict[str, List[str]]:
        """Build mapping of location aliases."""
        return {
            'san francisco': ['sf', 'bay area', 'silicon valley'],
            'new york': ['nyc', 'new york city', 'manhattan'],
            'los angeles': ['la', 'los angeles'],
            'london': ['london, uk', 'greater london'],
            'berlin': ['berlin, germany'],
            'toronto': ['toronto, canada', 'gta'],
            'remote': ['work from home', 'distributed', 'anywhere']
        }
    
    def _analyze_job_data_quality(self, jobs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze the quality of job data for matching."""
        total_jobs = len(jobs)
        
        if total_jobs == 0:
            return {"quality": "no_data"}
        
        # Check field completeness
        fields_completeness = {}
        key_fields = ['title', 'company', 'description', 'skills', 'location', 'salary_range']
        
        for field in key_fields:
            complete_count = sum(1 for job in jobs if job.get(field))
            fields_completeness[field] = complete_count / total_jobs
        
        # Overall quality assessment
        avg_completeness = sum(fields_completeness.values()) / len(fields_completeness)
        
        if avg_completeness > 0.8:
            quality = "excellent"
        elif avg_completeness > 0.6:
            quality = "good"
        elif avg_completeness > 0.4:
            quality = "fair"
        else:
            quality = "poor"
        
        return {
            "quality": quality,
            "total_jobs": total_jobs,
            "fields_completeness": fields_completeness,
            "average_completeness": avg_completeness
        }
    
    def _summarize_preferences(self, preferences: UserPreferences) -> Dict[str, Any]:
        """Summarize user preferences for analysis."""
        return {
            "has_skills": len(preferences.skills) > 0,
            "has_required_skills": len(preferences.required_skills) > 0,
            "has_location_prefs": len(preferences.locations) > 0,
            "has_salary_requirements": preferences.salary_min is not None or preferences.salary_max is not None,
            "experience_specified": preferences.experience_years > 0,
            "total_criteria": sum([
                len(preferences.skills) > 0,
                len(preferences.locations) > 0,
                preferences.salary_min is not None,
                preferences.experience_years > 0
            ])
        }
    
    def _determine_matching_strategy(self, jobs: List[Dict[str, Any]], preferences: UserPreferences) -> str:
        """Determine the best matching strategy."""
        job_count = len(jobs)
        has_detailed_prefs = len(preferences.required_skills) > 0 or preferences.salary_min is not None
        
        if job_count > 100:
            return "batch_processing"
        elif has_detailed_prefs:
            return "detailed_analysis"
        else:
            return "standard_matching"
    
    def _estimate_processing_time(self, complexity_factors: Dict[str, Any]) -> float:
        """Estimate processing time in seconds."""
        base_time = 0.1  # Base time per job
        job_count = complexity_factors['job_count']
        
        if complexity_factors['include_ai_analysis']:
            base_time += 0.5  # Additional time for AI analysis
        
        return base_time * job_count
    
    async def _handle_error_action(self, action: AgentAction) -> Dict[str, Any]:
        """Handle error conditions during matching."""
        error = action.parameters.get('error', 'Unknown error')
        logger.warning(f"Job matching error: {error}")
        return {"success": False, "error": error, "final": True}
    
    async def _complete_matching(self) -> Dict[str, Any]:
        """Complete the matching process."""
        return {"success": True, "matching_complete": True}