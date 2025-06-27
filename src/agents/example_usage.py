"""
Example usage of the multi-agent job discovery system.
Demonstrates how to use the system programmatically and via API.
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import Dict, Any

from .core.agent_orchestrator import JobDiscoveryOrchestrator
from .browser.browser_controller import BrowserConfig
from .models import (
    JobDiscoveryRequest, UserPreferences, JobType, ExperienceLevel
)
from .config import get_config_manager, validate_configuration

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def example_basic_usage():
    """
    Basic example of using the job discovery system.
    """
    logger.info("=== Basic Usage Example ===")
    
    try:
        # Initialize configuration
        config_manager = get_config_manager()
        
        # Validate configuration
        validation_result = validate_configuration()
        if not validation_result["valid"]:
            logger.error(f"Configuration validation failed: {validation_result['issues']}")
            return
        
        if validation_result["warnings"]:
            for warning in validation_result["warnings"]:
                logger.warning(warning)
        
        # Get LLM client (you need to implement this based on your LLM provider)
        from openai import AsyncOpenAI
        llm_client = AsyncOpenAI()  # Uses OPENAI_API_KEY from environment
        
        # Create browser configuration
        browser_config = BrowserConfig(
            headless=True,
            save_screenshots=False,
            intercept_requests=True
        )
        
        # Create user preferences
        user_preferences = UserPreferences(
            skills=["python", "javascript", "react", "nodejs"],
            required_skills=["python"],
            preferred_skills=["fastapi", "postgresql"],
            experience_years=5,
            locations=["remote", "san francisco", "new york"],
            job_types=[JobType.REMOTE, JobType.HYBRID],
            salary_min=80000,
            salary_max=150000,
            minimum_match_score=0.4
        )
        
        # Create job discovery request
        request = JobDiscoveryRequest(
            company_name="N26",
            company_website="https://n26.com",
            user_preferences=user_preferences,
            max_execution_time=300,
            include_ai_analysis=True,
            extract_all_pages=True,
            max_pages_per_site=5
        )
        
        # Initialize orchestrator
        async with JobDiscoveryOrchestrator(
            llm_client=llm_client,
            browser_config=browser_config
        ) as orchestrator:
            
            logger.info(f"Starting job discovery for {request.company_name}")
            
            # Execute job discovery
            result = await orchestrator.discover_jobs(request)
            
            # Print results
            logger.info(f"Job discovery completed: success={result.success}")
            logger.info(f"Career pages found: {result.total_career_pages}")
            logger.info(f"Jobs extracted: {result.total_jobs_extracted}")
            logger.info(f"Job matches: {result.total_matches}")
            logger.info(f"Execution time: {result.execution_time:.2f}s")
            
            # Show top recommendations
            if result.top_recommendations:
                logger.info("\n=== Top Job Recommendations ===")
                for i, rec in enumerate(result.top_recommendations[:5], 1):
                    logger.info(f"{i}. {rec['job_title']} at {rec['company']}")
                    logger.info(f"   Score: {rec['overall_score']:.2f} ({rec['recommendation']})")
                    logger.info(f"   Skills: {', '.join(rec['matching_skills'][:3])}")
                    logger.info("")
            
            # Show match summary
            if result.match_summary:
                logger.info(f"Match Summary: {json.dumps(result.match_summary, indent=2)}")
            
            return result
            
    except Exception as e:
        logger.error(f"Basic usage example failed: {e}")
        raise


async def example_individual_agents():
    """
    Example of using individual agents separately.
    """
    logger.info("=== Individual Agents Example ===")
    
    try:
        from openai import AsyncOpenAI
        from .specialized.career_discovery_agent import CareerDiscoveryAgent
        from .specialized.job_extraction_agent import JobExtractionAgent
        from .specialized.job_matching_agent import JobMatchingAgent
        from .browser.browser_controller import BrowserController
        
        llm_client = AsyncOpenAI()
        
        # Initialize browser controller
        browser_config = BrowserConfig(headless=True)
        async with BrowserController(browser_config) as browser:
            
            # 1. Career Discovery
            logger.info("1. Discovering career pages...")
            career_agent = CareerDiscoveryAgent(llm_client, browser)
            
            career_result = await career_agent.discover_career_pages(
                company_website="https://stripe.com",
                company_name="Stripe",
                max_depth=2
            )
            
            logger.info(f"Found {len(career_result.get('discovered_career_pages', []))} career pages")
            
            # 2. Job Extraction
            if career_result.get('discovered_career_pages'):
                logger.info("2. Extracting jobs...")
                extraction_agent = JobExtractionAgent(llm_client, browser)
                
                career_page_url = career_result['discovered_career_pages'][0]['url']
                extraction_result = await extraction_agent.extract_jobs_from_page(
                    page_url=career_page_url,
                    company_name="Stripe",
                    extract_all_pages=False,
                    max_pages=3
                )
                
                jobs = extraction_result.get('jobs_extracted', [])
                logger.info(f"Extracted {len(jobs)} jobs")
                
                # 3. Job Matching
                if jobs:
                    logger.info("3. Matching jobs...")
                    matching_agent = JobMatchingAgent(llm_client)
                    
                    user_preferences = UserPreferences(
                        skills=["python", "api development", "payments"],
                        experience_years=3,
                        locations=["remote"],
                        job_types=[JobType.REMOTE],
                        salary_min=70000
                    )
                    
                    matching_result = await matching_agent.match_jobs_to_preferences(
                        jobs=jobs,
                        user_preferences=user_preferences,
                        include_ai_analysis=True
                    )
                    
                    matches = matching_result.get('match_results', [])
                    logger.info(f"Found {len(matches)} matches")
                    
                    # Show best matches
                    if matches:
                        best_matches = sorted(matches, key=lambda x: x.overall_score, reverse=True)[:3]
                        logger.info("\nTop 3 matches:")
                        for i, match in enumerate(best_matches, 1):
                            logger.info(f"{i}. {match.job_title} - Score: {match.overall_score:.2f}")
            
    except Exception as e:
        logger.error(f"Individual agents example failed: {e}")
        raise


async def example_api_client():
    """
    Example of using the API client to interact with the job discovery system.
    """
    logger.info("=== API Client Example ===")
    
    try:
        import httpx
        
        base_url = "http://localhost:8000"
        
        # Create request payload
        request_data = {
            "company_name": "GitHub",
            "company_website": "https://github.com",
            "user_preferences": {
                "skills": ["python", "go", "kubernetes"],
                "required_skills": ["python"],
                "experience_years": 4,
                "locations": ["remote"],
                "job_types": ["remote"],
                "salary_min": 90000,
                "minimum_match_score": 0.5
            },
            "include_ai_analysis": True,
            "extract_all_pages": True,
            "max_pages_per_site": 3
        }
        
        async with httpx.AsyncClient(timeout=600) as client:
            # Start job discovery
            logger.info("Starting job discovery via API...")
            response = await client.post(
                f"{base_url}/api/multi-agent-job-discovery",
                json=request_data
            )
            response.raise_for_status()
            
            start_result = response.json()
            workflow_id = start_result["workflow_id"]
            logger.info(f"Workflow started: {workflow_id}")
            
            # Poll for status
            completed = False
            while not completed:
                await asyncio.sleep(5)  # Wait 5 seconds
                
                status_response = await client.get(
                    f"{base_url}/api/workflow-status/{workflow_id}"
                )
                status_response.raise_for_status()
                
                status_data = status_response.json()
                if status_data["found"] and status_data["progress"]:
                    progress = status_data["progress"]
                    logger.info(
                        f"Progress: {progress['progress_percentage']:.1f}% - "
                        f"{progress['stage']} - {progress['current_operation']}"
                    )
                    
                    if progress["stage"] in ["completed", "error"]:
                        completed = True
                else:
                    # Workflow completed, check results
                    completed = True
            
            # Get final results
            logger.info("Getting final results...")
            result_response = await client.get(
                f"{base_url}/api/workflow-result/{workflow_id}"
            )
            
            if result_response.status_code == 200:
                result_data = result_response.json()
                
                logger.info(f"Job discovery completed successfully!")
                logger.info(f"Jobs found: {result_data['total_jobs_extracted']}")
                logger.info(f"Matches: {result_data['total_matches']}")
                
                # Show top recommendations
                if result_data.get("top_recommendations"):
                    logger.info("\nTop recommendations:")
                    for i, rec in enumerate(result_data["top_recommendations"][:3], 1):
                        logger.info(f"{i}. {rec['job_title']} - Score: {rec['overall_score']:.2f}")
                
            elif result_response.status_code == 202:
                logger.info("Workflow still running...")
            else:
                logger.error(f"Failed to get results: {result_response.status_code}")
            
    except Exception as e:
        logger.error(f"API client example failed: {e}")
        raise


async def example_custom_configuration():
    """
    Example of using custom configuration.
    """
    logger.info("=== Custom Configuration Example ===")
    
    try:
        # Create custom configuration
        custom_config = {
            "career_agent_config": {
                "llm_model": "gpt-4o-mini",
                "max_retries": 2,
                "timeout_seconds": 45,
                "headless_browser": True
            },
            "extraction_agent_config": {
                "llm_model": "gpt-4o-mini", 
                "max_retries": 3,
                "timeout_seconds": 60,
                "headless_browser": True
            },
            "matching_agent_config": {
                "llm_model": "gpt-4o",
                "max_retries": 2,
                "timeout_seconds": 30
            },
            "max_concurrent_workflows": 5,
            "workflow_timeout": 300,
            "enable_detailed_logging": True
        }
        
        # You would typically save this to a config file or pass it to the orchestrator
        logger.info("Custom configuration created")
        logger.info(f"Configuration: {json.dumps(custom_config, indent=2)}")
        
    except Exception as e:
        logger.error(f"Custom configuration example failed: {e}")
        raise


async def run_examples():
    """Run all examples."""
    logger.info("Starting Multi-Agent Job Discovery System Examples")
    logger.info("=" * 60)
    
    try:
        # Run basic usage example
        await example_basic_usage()
        
        # Add delay between examples
        await asyncio.sleep(2)
        
        # Run individual agents example
        await example_individual_agents()
        
        # Add delay
        await asyncio.sleep(2)
        
        # Run custom configuration example
        await example_custom_configuration()
        
        # Note: API client example requires the API server to be running
        # Uncomment the following lines if you have the API server running:
        # await asyncio.sleep(2)
        # await example_api_client()
        
        logger.info("=" * 60)
        logger.info("All examples completed successfully!")
        
    except Exception as e:
        logger.error(f"Examples failed: {e}")
        raise


if __name__ == "__main__":
    # Run examples
    asyncio.run(run_examples())