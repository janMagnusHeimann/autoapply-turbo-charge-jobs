"""
Job Discovery Orchestrator - Central coordination system for multi-agent job discovery workflows.
Manages the complete pipeline from career discovery to job matching.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional, Set, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import uuid

from .base_agent import BaseAgent, AgentState
from .agent_memory import AgentMemoryManager
from ..specialized.career_discovery_agent import CareerDiscoveryAgent
from ..specialized.job_extraction_agent import JobExtractionAgent
from ..specialized.job_matching_agent import JobMatchingAgent, UserPreferences
from ..browser.browser_controller import BrowserController, BrowserConfig
from job_automation.infrastructure.clients.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class WorkflowStage(Enum):
    """Stages of the job discovery workflow."""
    INITIALIZATION = "initialization"
    CAREER_DISCOVERY = "career_discovery"
    CAREER_VERIFICATION = "career_verification"
    JOB_EXTRACTION = "job_extraction"
    JOB_MATCHING = "job_matching"
    RESULT_COMPILATION = "result_compilation"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class WorkflowProgress:
    """Progress tracking for job discovery workflow."""
    workflow_id: str
    stage: WorkflowStage
    progress_percentage: float = 0.0
    current_operation: str = ""
    stages_completed: List[WorkflowStage] = field(default_factory=list)
    errors_encountered: List[Dict[str, Any]] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    start_time: datetime = field(default_factory=datetime.utcnow)
    stage_times: Dict[str, float] = field(default_factory=dict)
    estimated_completion: Optional[datetime] = None


@dataclass
class JobDiscoveryRequest:
    """Request for job discovery workflow."""
    company_id: str
    user_id: str
    workflow_config: Optional[Dict[str, Any]] = None
    max_execution_time: int = 300  # 5 minutes default
    force_rediscovery: bool = False # Option to force career page re-discovery
    
    def __post_init__(self):
        self.request_id = str(uuid.uuid4())
        self.created_at = datetime.utcnow()


@dataclass
class JobDiscoveryResult:
    """Result of job discovery workflow."""
    request_id: str
    success: bool
    workflow_progress: WorkflowProgress
    
    # Results from each stage
    career_pages_found: List[Dict[str, Any]] = field(default_factory=list)
    jobs_extracted: List[Dict[str, Any]] = field(default_factory=list)
    job_matches: List[Dict[str, Any]] = field(default_factory=list)
    
    # Statistics and metadata
    total_career_pages: int = 0
    total_jobs_extracted: int = 0
    total_matches: int = 0
    execution_time: float = 0.0
    agent_statistics: Dict[str, Any] = field(default_factory=dict)
    
    # Recommendations
    top_recommendations: List[Dict[str, Any]] = field(default_factory=list)
    match_summary: Dict[str, Any] = field(default_factory=dict)


class JobDiscoveryOrchestrator:
    """
    Central orchestrator for coordinating multiple agents in job discovery workflows.
    
    Manages the complete pipeline:
    1. Career page discovery
    2. Job extraction
    3. Job matching
    4. Result compilation
    """
    
    def __init__(
        self,
        llm_client,
        browser_config: Optional[BrowserConfig] = None,
        config: Optional[Dict[str, Any]] = None
    ):
        self.llm_client = llm_client
        self.browser_config = browser_config or BrowserConfig()
        self.config = config or {}
        self.supabase_client = get_supabase_client()
        
        # Agent instances (lazy initialized)
        self._career_agent: Optional[CareerDiscoveryAgent] = None
        self._extraction_agent: Optional[JobExtractionAgent] = None
        self._matching_agent: Optional[JobMatchingAgent] = None
        self._browser_controller: Optional[BrowserController] = None
        
        # Workflow tracking
        self.active_workflows: Dict[str, WorkflowProgress] = {}
        self.completed_workflows: Dict[str, JobDiscoveryResult] = {}
        
        # Performance monitoring
        self.orchestrator_stats = {
            'workflows_started': 0,
            'workflows_completed': 0,
            'workflows_failed': 0,
            'average_execution_time': 0.0,
            'total_jobs_discovered': 0
        }
        
        # Memory management
        self.memory_manager = AgentMemoryManager(
            agent_name="JobDiscoveryOrchestrator",
            persistence_dir=self.config.get('memory_persistence_dir')
        )
        
        # Progress callbacks
        self.progress_callbacks: List[Callable] = []
        
    async def discover_jobs(self, request: JobDiscoveryRequest) -> JobDiscoveryResult:
        """
        Main method to orchestrate the complete job discovery workflow.
        
        Args:
            request: Job discovery request with all parameters
            
        Returns:
            Complete job discovery results
        """
        workflow_id = request.request_id
        progress = WorkflowProgress(
            workflow_id=workflow_id,
            stage=WorkflowStage.INITIALIZATION,
            current_operation="Starting job discovery workflow"
        )
        
        self.active_workflows[workflow_id] = progress
        self.orchestrator_stats['workflows_started'] += 1
        
        try:
            logger.info(f"Starting job discovery workflow {workflow_id} for company {request.company_id}")

            # Fetch company and user data from Supabase
            company_data = self._fetch_company_data(request.company_id)
            user_preferences = self._fetch_user_preferences(request.user_id)

            if not company_data:
                return await self._handle_workflow_failure(request, progress, "Company not found")
            if not user_preferences:
                return await self._handle_workflow_failure(request, progress, "User preferences not found")

            # Initialize browser and agents
            await self._initialize_agents()
            progress.stage = WorkflowStage.CAREER_DISCOVERY
            await self._update_progress(progress, 10, "Discovering career pages")
            
            # Stage 1: Career Discovery
            career_page_url = company_data.get('careers_url')
            if not career_page_url or request.force_rediscovery:
                discovery_request = {'company_website': company_data['website_url'], 'company_name': company_data['name']}
                career_results = await self._execute_career_discovery(discovery_request, progress)
                
                if career_results.get('success') and career_results.get('best_career_page'):
                    new_career_url = career_results['best_career_page']['url']
                    self._update_company_career_url(request.company_id, new_career_url)
                    career_page_url = new_career_url
                else:
                     return await self._handle_workflow_failure(request, progress, "Career page discovery failed")
            
            progress.stages_completed.append(WorkflowStage.CAREER_DISCOVERY)
            await self._update_progress(progress, 30, "Career discovery completed")

            if not career_page_url:
                return await self._handle_workflow_failure(request, progress, "No career page found")

            # Stage 2: Job Extraction
            progress.stage = WorkflowStage.JOB_EXTRACTION
            await self._update_progress(progress, 40, "Extracting job listings")
            
            extraction_results = await self._execute_job_extraction(
                request, {'url': career_page_url, 'name': company_data['name']}, progress
            )
            progress.stages_completed.append(WorkflowStage.JOB_EXTRACTION)
            await self._update_progress(progress, 70, "Job extraction completed")
            
            # Stage 3: Job Matching
            progress.stage = WorkflowStage.JOB_MATCHING
            await self._update_progress(progress, 80, "Matching jobs to preferences")
            
            matching_results = await self._execute_job_matching(
                request, extraction_results, user_preferences, progress
            )
            
            # Save jobs and matches to Supabase
            if extraction_results.get('jobs'):
                saved_jobs = self._save_job_listings(extraction_results['jobs'], request.company_id)
                if matching_results.get('matches') and saved_jobs:
                    self._save_pending_applications(matching_results['matches'], saved_jobs, request.user_id)

            progress.stages_completed.append(WorkflowStage.JOB_MATCHING)
            await self._update_progress(progress, 90, "Job matching completed")
            
            # Stage 4: Result Compilation
            progress.stage = WorkflowStage.RESULT_COMPILATION
            await self._update_progress(progress, 95, "Compiling final results")
            
            final_result = await self._compile_final_results(
                request, career_results, extraction_results, matching_results, progress
            )
            
            # Complete workflow
            progress.stage = WorkflowStage.COMPLETED
            progress.progress_percentage = 100.0
            progress.current_operation = "Workflow completed successfully"
            
            # Store completed workflow
            self.completed_workflows[workflow_id] = final_result
            del self.active_workflows[workflow_id]
            
            # Update statistics
            self.orchestrator_stats['workflows_completed'] += 1
            self.orchestrator_stats['total_jobs_discovered'] += final_result.total_jobs_extracted
            
            execution_time = (datetime.utcnow() - progress.start_time).total_seconds()
            self._update_average_execution_time(execution_time)
            
            logger.info(f"Workflow {workflow_id} completed successfully in {execution_time:.2f}s")
            
            return final_result
            
        except Exception as e:
            logger.error(f"Workflow {workflow_id} failed: {e}")
            return await self._handle_workflow_failure(request, progress, str(e))
        
        finally:
            # Cleanup
            await self._cleanup_workflow(workflow_id)
    
    async def get_workflow_status(self, workflow_id: str) -> Optional[WorkflowProgress]:
        """Get current status of a workflow."""
        return self.active_workflows.get(workflow_id)
    
    async def cancel_workflow(self, workflow_id: str) -> bool:
        """Cancel an active workflow."""
        if workflow_id in self.active_workflows:
            progress = self.active_workflows[workflow_id]
            progress.stage = WorkflowStage.ERROR
            progress.current_operation = "Workflow cancelled by user"
            
            # Cleanup
            await self._cleanup_workflow(workflow_id)
            del self.active_workflows[workflow_id]
            
            return True
        return False
    
    def add_progress_callback(self, callback: Callable[[WorkflowProgress], None]) -> None:
        """Add a progress callback to be notified of workflow updates."""
        self.progress_callbacks.append(callback)
    
    def get_orchestrator_stats(self) -> Dict[str, Any]:
        """Get statistics about the orchestrator's performance."""
        if self.orchestrator_stats['workflows_completed'] > 0:
            return {
                **self.orchestrator_stats,
                "success_rate": self.orchestrator_stats['workflows_completed'] / self.orchestrator_stats['workflows_started']
            }
        return self.orchestrator_stats
    
    # Private methods
    
    async def _initialize_agents(self) -> None:
        """Initialize all required agents and browser."""
        if self._browser_controller is None:
            self._browser_controller = BrowserController(self.browser_config)
            await self._browser_controller.start()
        
        if self._career_agent is None:
            self._career_agent = CareerDiscoveryAgent(
                self.llm_client, 
                self._browser_controller, 
                self.config.get('career_agent_config')
            )
        
        if self._extraction_agent is None:
            self._extraction_agent = JobExtractionAgent(
                self.llm_client,
                self._browser_controller,
                self.config.get('extraction_agent_config')
            )
        
        if self._matching_agent is None:
            self._matching_agent = JobMatchingAgent(
                self.llm_client,
                self.config.get('matching_agent_config')
            )
    
    async def _execute_career_discovery(
        self,
        request: JobDiscoveryRequest,
        progress: WorkflowProgress
    ) -> Dict[str, Any]:
        """Execute career page discovery stage."""
        start_time = datetime.utcnow()
        
        try:
            result = await self._career_agent.discover_career_pages(
                company_website=request.company_website,
                company_name=request.company_name,
                max_depth=2
            )
            
            # Store results in memory
            self.memory_manager.add_observation(
                content=result,
                observation_type="career_discovery_result",
                importance=0.8,
                tags=["career_discovery", request.company_name]
            )
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            progress.stage_times["career_discovery"] = execution_time
            
            return result
            
        except Exception as e:
            progress.errors_encountered.append({
                'stage': 'career_discovery',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
            raise
    
    async def _execute_job_extraction(
        self,
        request: JobDiscoveryRequest,
        career_results: Dict[str, Any],
        progress: WorkflowProgress
    ) -> Dict[str, Any]:
        """Execute job extraction stage."""
        start_time = datetime.utcnow()
        
        try:
            career_pages = career_results.get('discovered_career_pages', [])
            all_jobs = []
            
            # Extract jobs from each discovered career page
            for i, career_page in enumerate(career_pages):
                career_url = career_page.get('url')
                if not career_url:
                    continue
                
                await self._update_progress(
                    progress, 
                    40 + (i / len(career_pages)) * 30,
                    f"Extracting jobs from {career_page.get('url', 'career page')} ({i+1}/{len(career_pages)})"
                )
                
                try:
                    extraction_result = await self._extraction_agent.extract_jobs_from_page(
                        page_url=career_url,
                        company_name=request.company_name,
                        extract_all_pages=request.extract_all_pages,
                        max_pages=request.max_pages_per_site
                    )
                    
                    if extraction_result.get('success'):
                        jobs = extraction_result.get('jobs_extracted', [])
                        all_jobs.extend(jobs)
                        
                        # Store successful extraction
                        self.memory_manager.add_observation(
                            content=extraction_result,
                            observation_type="job_extraction_result",
                            importance=0.7,
                            tags=["job_extraction", request.company_name]
                        )
                    
                except Exception as e:
                    logger.warning(f"Job extraction failed for {career_url}: {e}")
                    progress.warnings.append(f"Failed to extract jobs from {career_url}: {str(e)}")
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            progress.stage_times["job_extraction"] = execution_time
            
            return {
                "success": True,
                "jobs_extracted": all_jobs,
                "total_jobs": len(all_jobs),
                "pages_processed": len(career_pages)
            }
            
        except Exception as e:
            progress.errors_encountered.append({
                'stage': 'job_extraction',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
            raise
    
    async def _execute_job_matching(
        self,
        request: JobDiscoveryRequest,
        extraction_results: Dict[str, Any],
        user_preferences: UserPreferences,
        progress: WorkflowProgress
    ) -> Dict[str, Any]:
        """Execute job matching stage."""
        start_time = datetime.utcnow()
        
        try:
            jobs = extraction_results.get('jobs_extracted', [])
            
            if not jobs:
                logger.info("No jobs to match - skipping matching stage")
                return {
                    "success": True,
                    "match_results": [],
                    "match_summary": {"total_jobs": 0, "message": "No jobs found to match"}
                }
            
            matching_result = await self._matching_agent.match_jobs_to_preferences(
                jobs=jobs,
                user_preferences=user_preferences,
                include_ai_analysis=request.include_ai_analysis
            )
            
            # Store matching results
            self.memory_manager.add_observation(
                content=matching_result,
                observation_type="job_matching_result",
                importance=0.9,
                tags=["job_matching", request.company_name]
            )
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            progress.stage_times["job_matching"] = execution_time
            
            return matching_result
            
        except Exception as e:
            progress.errors_encountered.append({
                'stage': 'job_matching',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
            raise
    
    async def _compile_final_results(
        self,
        request: JobDiscoveryRequest,
        career_results: Dict[str, Any],
        extraction_results: Dict[str, Any],
        matching_results: Dict[str, Any],
        progress: WorkflowProgress
    ) -> JobDiscoveryResult:
        """Compile final workflow results."""
        
        # Extract data from results
        career_pages = career_results.get('discovered_career_pages', [])
        jobs_extracted = extraction_results.get('jobs_extracted', [])
        match_results = matching_results.get('match_results', [])
        match_summary = matching_results.get('match_summary', {})
        
        # Calculate execution time
        execution_time = (datetime.utcnow() - progress.start_time).total_seconds()
        
        # Generate top recommendations
        top_recommendations = []
        if match_results:
            # Sort by score and take top 10
            sorted_matches = sorted(match_results, key=lambda x: x.overall_score, reverse=True)
            top_recommendations = [
                {
                    'job_title': match.job_title,
                    'company': match.company,
                    'overall_score': match.overall_score,
                    'recommendation': match.recommendation,
                    'matching_skills': match.matching_skills,
                    'location_details': match.location_details
                }
                for match in sorted_matches[:10]
            ]
        
        # Compile agent statistics
        agent_stats = {
            'career_agent': self._career_agent.get_status() if self._career_agent else {},
            'extraction_agent': self._extraction_agent.get_status() if self._extraction_agent else {},
            'matching_agent': self._matching_agent.get_status() if self._matching_agent else {},
            'browser_controller': self._browser_controller.get_stats() if self._browser_controller else {}
        }
        
        return JobDiscoveryResult(
            request_id=request.request_id,
            success=True,
            workflow_progress=progress,
            career_pages_found=career_pages,
            jobs_extracted=jobs_extracted,
            job_matches=match_results,
            total_career_pages=len(career_pages),
            total_jobs_extracted=len(jobs_extracted),
            total_matches=len(match_results),
            execution_time=execution_time,
            agent_statistics=agent_stats,
            top_recommendations=top_recommendations,
            match_summary=match_summary
        )
    
    async def _handle_workflow_failure(
        self,
        request: JobDiscoveryRequest,
        progress: WorkflowProgress,
        error_message: str
    ) -> JobDiscoveryResult:
        """Handle workflow failure and create error result."""
        progress.stage = WorkflowStage.ERROR
        progress.current_operation = f"Workflow failed: {error_message}"
        progress.errors_encountered.append({
            'stage': 'workflow',
            'error': error_message,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        execution_time = (datetime.utcnow() - progress.start_time).total_seconds()
        
        # Update statistics
        self.orchestrator_stats['workflows_failed'] += 1
        
        # Remove from active workflows
        if request.request_id in self.active_workflows:
            del self.active_workflows[request.request_id]
        
        return JobDiscoveryResult(
            request_id=request.request_id,
            success=False,
            workflow_progress=progress,
            execution_time=execution_time,
            match_summary={"error": error_message}
        )
    
    async def _update_progress(
        self,
        progress: WorkflowProgress,
        percentage: float,
        operation: str
    ) -> None:
        """Update workflow progress and notify callbacks."""
        progress.progress_percentage = percentage
        progress.current_operation = operation
        
        # Notify progress callbacks
        for callback in self.progress_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(progress)
                else:
                    callback(progress)
            except Exception as e:
                logger.error(f"Progress callback failed: {e}")
    
    async def _cleanup_workflow(self, workflow_id: str) -> None:
        """Clean up resources after a workflow is complete."""
        # Future cleanup logic can go here
        pass
    
    def _update_average_execution_time(self, new_time: float) -> None:
        """Update average execution time statistics."""
        completed = self.orchestrator_stats['workflows_completed']
        if completed == 1:
            self.orchestrator_stats['average_execution_time'] = new_time
        else:
            current_avg = self.orchestrator_stats['average_execution_time']
            self.orchestrator_stats['average_execution_time'] = (
                (current_avg * (completed - 1) + new_time) / completed
            )
    
    async def close(self) -> None:
        """Cleanup orchestrator resources."""
        try:
            if self._browser_controller:
                await self._browser_controller.close()
            
            # Cancel all active workflows
            for workflow_id in list(self.active_workflows.keys()):
                await self.cancel_workflow(workflow_id)
            
            logger.info("Job discovery orchestrator closed successfully")
            
        except Exception as e:
            logger.error(f"Error closing orchestrator: {e}")
    
    async def __aenter__(self):
        await self._initialize_agents()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    def _fetch_company_data(self, company_id: str) -> Optional[Dict[str, Any]]:
        """Fetch company data from Supabase."""
        if not self.supabase_client: return None
        try:
            result = self.supabase_client.table('companies').select('*').eq('id', company_id).single().execute()
            return result.data
        except Exception as e:
            logger.error(f"Failed to fetch company data for {company_id}: {e}")
            return None

    def _fetch_user_preferences(self, user_id: str) -> Optional[UserPreferences]:
        """Fetch user preferences from Supabase."""
        if not self.supabase_client: return None
        try:
            result = self.supabase_client.table('user_preferences').select('*').eq('user_id', user_id).single().execute()
            return UserPreferences(**result.data) if result.data else None
        except Exception as e:
            logger.error(f"Failed to fetch user preferences for {user_id}: {e}")
            return None

    def _update_company_career_url(self, company_id: str, career_url: str):
        """Update the career URL for a company in Supabase."""
        if not self.supabase_client: return
        try:
            self.supabase_client.table('companies').update({'careers_url': career_url}).eq('id', company_id).execute()
        except Exception as e:
            logger.error(f"Failed to update career URL for {company_id}: {e}")

    def _save_job_listings(self, jobs: List[Dict[str, Any]], company_id: str) -> List[Dict[str, Any]]:
        """Save extracted job listings to Supabase."""
        if not self.supabase_client: return []
        
        records_to_insert = []
        for job in jobs:
            records_to_insert.append({
                'company_id': company_id,
                'title': job.get('title'),
                'description': job.get('description'),
                'requirements': job.get('requirements'),
                'location': job.get('location'),
                'salary_range': f"{job.get('salary_min')} - {job.get('salary_max')}" if job.get('salary_min') else None,
                'job_type': job.get('job_type'),
                'remote_option': job.get('remote_option'),
                'external_url': job.get('application_url')
            })

        try:
            result = self.supabase_client.table('job_listings').insert(records_to_insert).execute()
            return result.data
        except Exception as e:
            logger.error(f"Failed to save job listings: {e}")
            return []

    def _save_pending_applications(self, matches: List[Dict[str, Any]], saved_jobs: List[Dict[str, Any]], user_id: str):
        """Save matched jobs as pending applications for the user."""
        if not self.supabase_client: return

        job_map = {job['external_url']: job['id'] for job in saved_jobs}
        
        records_to_insert = []
        for match in matches:
            job_id = job_map.get(match.get('application_url'))
            if job_id:
                records_to_insert.append({
                    'user_id': user_id,
                    'job_listing_id': job_id,
                    'match_score': match.get('match_score'),
                    'status': 'pending'
                })

        if records_to_insert:
            try:
                self.supabase_client.table('pending_applications').insert(records_to_insert).execute()
            except Exception as e:
                logger.error(f"Failed to save pending applications: {e}")