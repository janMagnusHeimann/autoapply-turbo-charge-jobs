"""
Job Discovery Orchestrator - Coordinates the multi-agent job discovery workflow
"""

import asyncio
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
import logging

from ..core.agents.career_discovery_agent import CareerDiscoveryAgent
from ..core.agents.job_extraction_agent import JobExtractionAgent
from ..core.agents.job_matching_agent import JobMatchingAgent
from ..infrastructure.browser.browser_controller import BrowserController
from ..infrastructure.clients.openai_client import OpenAIClient

logger = logging.getLogger(__name__)

class JobDiscoveryOrchestrator:
    """
    Orchestrates the multi-agent job discovery workflow
    Coordinates the 4-step process with progress tracking
    """
    
    def __init__(
        self,
        openai_client: OpenAIClient,
        browser_controller: Optional[BrowserController] = None,
        progress_callback: Optional[Callable] = None
    ):
        self.openai_client = openai_client
        self.browser_controller = browser_controller
        self.progress_callback = progress_callback
        
        # Initialize agents
        self.career_agent = CareerDiscoveryAgent(
            llm_client=openai_client,
            use_vision=True
        )
        
        self.extraction_agent = JobExtractionAgent(
            llm_client=openai_client,
            browser_controller=browser_controller,
            use_vision=True
        )
        
        self.matching_agent = JobMatchingAgent(
            llm_client=openai_client
        )
        
        logger.info("✅ Job Discovery Orchestrator initialized")
    
    async def discover_jobs(
        self,
        company: str,
        website: str,
        user_preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute the complete job discovery workflow
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"🚀 Starting job discovery for {company}")
            
            # Step 1: Career Page Discovery
            await self._report_progress("🔍 Discovering career page...", 0.25)
            career_result = await self.career_agent.execute({
                "company_name": company,
                "website_url": website
            })
            
            if career_result["status"] != "success":
                return {
                    "status": "error",
                    "message": f"Failed to find career page: {career_result.get('message', 'Unknown error')}",
                    "company": company,
                    "execution_time": (datetime.utcnow() - start_time).total_seconds()
                }
            
            career_url = career_result["career_page_url"]
            await self._report_progress(f"✅ Found career page: {career_url}", 0.4)
            
            # Step 2: Job Extraction
            await self._report_progress("📊 Extracting job listings...", 0.6)
            extraction_result = await self.extraction_agent.execute({
                "career_page_url": career_url,
                "company_name": company
            })
            
            if extraction_result["status"] != "success":
                return {
                    "status": "error",
                    "message": f"Failed to extract jobs: {extraction_result.get('message', 'Unknown error')}",
                    "company": company,
                    "career_page_url": career_url,
                    "execution_time": (datetime.utcnow() - start_time).total_seconds()
                }
            
            jobs = extraction_result["jobs"]
            await self._report_progress(f"📋 Found {len(jobs)} job listings", 0.75)
            
            # Step 3: Job Matching (if user preferences provided)
            matched_jobs = jobs
            if user_preferences and jobs:
                await self._report_progress("🎯 Matching jobs to preferences...", 0.9)
                matching_result = await self.matching_agent.execute({
                    "jobs": jobs,
                    "user_preferences": user_preferences
                })
                
                if matching_result["status"] == "success":
                    matched_jobs = matching_result["matched_jobs"]
                    await self._report_progress(f"✨ Matched {len(matched_jobs)} jobs", 0.95)
            
            await self._report_progress("✅ Job discovery complete!", 1.0)
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "status": "success",
                "company": company,
                "career_page_url": career_url,
                "total_jobs": len(jobs),
                "matched_jobs": matched_jobs,
                "extraction_method": extraction_result.get("extraction_method", "unknown"),
                "used_browser": extraction_result.get("used_browser", False),
                "discovery_method": career_result.get("discovery_method", "unknown"),
                "execution_time": execution_time,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Job discovery failed for {company}: {e}")
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "status": "error",
                "message": str(e),
                "company": company,
                "execution_time": execution_time
            }
    
    async def discover_jobs_parallel(
        self,
        companies: List[Dict[str, str]],
        user_preferences: Dict[str, Any],
        max_concurrent: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Discover jobs from multiple companies in parallel
        """
        if not companies:
            return []
        
        logger.info(f"🔄 Starting parallel job discovery for {len(companies)} companies")
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_company(company_data: Dict[str, str]) -> Dict[str, Any]:
            async with semaphore:
                try:
                    return await self.discover_jobs(
                        company=company_data["name"],
                        website=company_data["website"],
                        user_preferences=user_preferences
                    )
                except Exception as e:
                    logger.error(f"Error processing {company_data['name']}: {e}")
                    return {
                        "status": "error",
                        "company": company_data["name"],
                        "message": str(e)
                    }
        
        # Create tasks for all companies
        tasks = [process_company(company) for company in companies]
        
        # Execute all tasks
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle exceptions and format results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    "status": "error",
                    "company": companies[i]["name"],
                    "message": str(result)
                })
            else:
                processed_results.append(result)
        
        # Log summary
        successful = sum(1 for r in processed_results if r.get("status") == "success")
        total_jobs = sum(r.get("total_jobs", 0) for r in processed_results if r.get("status") == "success")
        
        logger.info(f"✅ Parallel discovery complete: {successful}/{len(companies)} successful, {total_jobs} total jobs found")
        
        return processed_results
    
    async def discover_jobs_batch(
        self,
        request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Batch job discovery with comprehensive result aggregation
        """
        companies = request.get("companies", [])
        user_preferences = request.get("user_preferences", {})
        max_concurrent = request.get("max_concurrent", 3)
        
        start_time = datetime.utcnow()
        
        # Execute parallel discovery
        results = await self.discover_jobs_parallel(
            companies=companies,
            user_preferences=user_preferences,
            max_concurrent=max_concurrent
        )
        
        # Aggregate results
        successful_results = [r for r in results if r.get("status") == "success"]
        failed_results = [r for r in results if r.get("status") == "error"]
        
        # Collect all matched jobs and sort by score
        all_matched_jobs = []
        for result in successful_results:
            matched_jobs = result.get("matched_jobs", [])
            for job in matched_jobs:
                job["source_company"] = result["company"]
                job["source_career_page"] = result.get("career_page_url", "")
                all_matched_jobs.append(job)
        
        # Sort by match score if available
        all_matched_jobs.sort(
            key=lambda x: x.get("match_score", 0), 
            reverse=True
        )
        
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        
        return {
            "status": "success",
            "results": results,
            "summary": {
                "companies_processed": len(companies),
                "successful_searches": len(successful_results),
                "failed_searches": len(failed_results),
                "total_jobs_found": sum(r.get("total_jobs", 0) for r in successful_results),
                "total_matched_jobs": len(all_matched_jobs),
                "execution_time": execution_time
            },
            "top_matches": all_matched_jobs[:20],  # Top 20 matches across all companies
            "companies_with_jobs": [
                {
                    "company": r["company"],
                    "jobs_found": r.get("total_jobs", 0),
                    "career_page": r.get("career_page_url", ""),
                    "extraction_method": r.get("extraction_method", ""),
                    "used_browser": r.get("used_browser", False)
                }
                for r in successful_results
            ],
            "failed_companies": [
                {
                    "company": r["company"],
                    "error": r.get("message", "Unknown error")
                }
                for r in failed_results
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _report_progress(self, message: str, progress: float):
        """Report progress to callback if provided"""
        if self.progress_callback:
            try:
                await self.progress_callback({
                    "message": message,
                    "progress": progress,
                    "timestamp": datetime.utcnow().isoformat()
                })
            except Exception as e:
                logger.warning(f"Progress callback failed: {e}")
        
        logger.info(f"[{progress*100:.0f}%] {message}")
    
    async def cleanup(self):
        """Clean up resources"""
        if self.browser_controller:
            await self.browser_controller.cleanup()
        logger.info("✅ Orchestrator cleanup completed")

# Factory function for easy initialization
async def create_orchestrator(
    openai_client: OpenAIClient,
    use_browser: bool = True,
    progress_callback: Optional[Callable] = None
) -> JobDiscoveryOrchestrator:
    """Create and initialize orchestrator with optional browser"""
    browser_controller = None
    
    if use_browser:
        try:
            browser_controller = BrowserController()
            if await browser_controller.initialize():
                logger.info("✅ Browser controller ready")
            else:
                logger.warning("⚠️ Browser initialization failed - using static extraction only")
                browser_controller = None
        except Exception as e:
            logger.warning(f"⚠️ Browser setup failed: {e} - using static extraction only")
            browser_controller = None
    
    return JobDiscoveryOrchestrator(
        openai_client=openai_client,
        browser_controller=browser_controller,
        progress_callback=progress_callback
    ) 