"""
Browser Use Job Discovery Agent
Automated job searching and application using browser automation
"""

import asyncio
import json
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

from browser_use import Agent, Browser, BrowserConfig
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class JobSearchConfig:
    """Configuration for job search parameters"""
    keywords: List[str]
    location: str = "Remote"
    experience_level: str = "Mid-level"
    salary_range: Optional[str] = None
    remote_only: bool = True
    max_results: int = 10

class BrowserUseJobAgent:
    """Base class for browser automation job agents"""
    
    def __init__(self, config: JobSearchConfig, headless: bool = False):
        self.config = config
        self.llm = ChatOpenAI(
            model="gpt-4o",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.1
        )
        
        import uuid
        self.browser_config = BrowserConfig(
            headless=headless,
            wait_for_network_idle_page_load_time=3.0,
            highlight_elements=True,
            keep_alive=False,
            user_data_dir=f"~/.config/browseruse/profiles/session_{uuid.uuid4().hex[:8]}",
            new_context_config={
                "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            }
        )
    
    async def create_agent(self, task: str) -> Agent:
        """Create a new browser agent with the given task"""
        return Agent(
            task=task,
            llm=self.llm,
            browser=Browser(config=self.browser_config)
        )

class JobDiscoveryAgent(BrowserUseJobAgent):
    """Agent specialized in discovering job opportunities"""
    
    async def search_company_jobs(self, company_name: str, career_page_url: str) -> Dict[str, Any]:
        """Search for jobs at a specific company"""
        
        search_keywords = " OR ".join(self.config.keywords)
        
        task = f"""
        Search for job opportunities at {company_name} on their career page: {career_page_url}
        
        COMPLETION CRITERIA:
        - Find and extract the TOP 5 most relevant job listings that match the search criteria
        - Rank jobs by relevance to keywords: {search_keywords}
        - For each job, extract the direct application URL/link
        - STOP immediately after finding 5 relevant jobs (do not continue searching)
        - If fewer than 5 jobs exist, extract all available and stop
        
        Search Criteria:
        - Keywords: {search_keywords}
        - Location preference: {self.config.location}
        - Experience level: {self.config.experience_level}
        - Remote work: {"Required" if self.config.remote_only else "Preferred"}
        - Maximum results: {self.config.max_results}
        
        Instructions:
        1. Navigate to the career page URL
        2. Look for job search filters or search functionality
        3. Apply relevant filters based on the search criteria
        4. Search for positions matching the keywords
        5. For each relevant job found, extract (MAXIMUM 5 JOBS):
           - Job title
           - Department/team
           - Location (including remote status)
           - Employment type (full-time, part-time, contract)
           - Experience level required
           - Salary range (if available)
           - Job description summary (first 2-3 sentences)
           - Key requirements (top 5 skills/qualifications)
           - Application URL or direct apply link (CRITICAL - must get the actual application link)
           - Posted date (if available)
           - Job ID (if available)
           - Relevance score (1-10 based on keyword match)
        
        Search Strategy:
        - Use the site's search functionality if available
        - Try common job title variations (Software Engineer, Developer, etc.)
        - Look for engineering, technology, or development departments
        - Check for remote work indicators in job listings
        - Focus on positions that match the experience level
        
        Error Handling:
        - If the career page doesn't load, try common variations like /careers, /jobs, /opportunities
        - If search doesn't work, browse through departments manually
        - If no jobs match criteria, note this in the results
        - Handle any popups, cookie banners, or login prompts appropriately
        
        Return the results as a structured JSON object with EXACTLY this format:
        {{
            "company_name": "{company_name}",
            "career_page_url": "{career_page_url}",
            "search_timestamp": "ISO datetime",
            "total_found": "number of jobs found (max 5)",
            "jobs": [
                {{
                    "title": "Job Title",
                    "department": "Department",
                    "location": "Location",
                    "remote_status": "Remote/Hybrid/On-site",
                    "employment_type": "Full-time/Contract/etc",
                    "experience_level": "Junior/Mid/Senior",
                    "salary_range": "Salary if available",
                    "description_summary": "Brief description",
                    "key_requirements": ["requirement1", "requirement2"],
                    "application_url": "Direct application link (MUST be clickable URL)",
                    "posted_date": "Date if available",
                    "job_id": "ID if available",
                    "relevance_score": 8.5
                }}
            ],
            "search_method": "browser_use_automation",
            "notes": "Top 5 most relevant matches found"
        }}
        
        IMPORTANT: After finding 5 relevant jobs, immediately complete the task and return results.
        
        Save this JSON data to a file named 'job_results_{company_name.lower().replace(" ", "_")}.json'
        """
        
        try:
            logger.info(f"Starting job search for {company_name} at {career_page_url}")
            agent = await self.create_agent(task)
            result = await agent.run()
            
            logger.info(f"Job search completed for {company_name}")
            return {
                "success": True,
                "company_name": company_name,
                "career_page_url": career_page_url,
                "result": result,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Job search failed for {company_name}: {str(e)}")
            return {
                "success": False,
                "company_name": company_name,
                "career_page_url": career_page_url,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def search_multiple_platforms(self) -> Dict[str, Any]:
        """Search for jobs across multiple platforms"""
        
        search_keywords = " OR ".join(self.config.keywords)
        location_filter = self.config.location if not self.config.remote_only else "remote"
        
        task = f"""
        Search for job opportunities across multiple job platforms with these criteria:
        
        Search Parameters:
        - Keywords: {search_keywords}
        - Location: {location_filter}
        - Experience Level: {self.config.experience_level}
        - Remote Work: {"Required" if self.config.remote_only else "Preferred"}
        - Maximum Results: {self.config.max_results} per platform
        
        Platforms to Search (in order of priority):
        1. LinkedIn Jobs (linkedin.com/jobs)
        2. Indeed (indeed.com)
        3. AngelList/Wellfound (wellfound.com) - for startups
        4. Glassdoor (glassdoor.com)
        5. Stack Overflow Jobs (if still available)
        
        For each platform:
        1. Navigate to the job search page
        2. Enter search terms and apply filters
        3. Sort by relevance or date posted
        4. Extract job information from the first {self.config.max_results} relevant results
        
        For each job, extract:
        - Job title and company name
        - Location and remote status
        - Salary range (if listed)
        - Job description summary
        - Required skills/experience
        - Application method (direct apply, company website, etc.)
        - Posted date
        - Platform source
        
        Handle platform-specific requirements:
        - LinkedIn: May require login - skip if login required
        - Indeed: Use their search and filter system
        - AngelList: Focus on startup/tech companies
        - Glassdoor: Extract salary insights if available
        
        Return consolidated results as JSON:
        {{
            "search_timestamp": "ISO datetime",
            "search_criteria": {{
                "keywords": {self.config.keywords},
                "location": "{location_filter}",
                "experience_level": "{self.config.experience_level}",
                "remote_only": {self.config.remote_only}
            }},
            "platforms_searched": ["platform1", "platform2"],
            "total_jobs_found": "total number",
            "jobs_by_platform": {{
                "platform_name": [
                    {{
                        "title": "Job Title",
                        "company": "Company Name",
                        "location": "Location",
                        "remote_status": "Remote/Hybrid/On-site",
                        "salary_range": "Salary if available",
                        "description_summary": "Brief description",
                        "required_skills": ["skill1", "skill2"],
                        "application_url": "Link",
                        "posted_date": "Date",
                        "platform": "Source platform"
                    }}
                ]
            }},
            "search_notes": "Any issues or observations"
        }}
        
        Save results to 'multi_platform_job_search.json'
        """
        
        try:
            logger.info("Starting multi-platform job search")
            agent = await self.create_agent(task)
            result = await agent.run()
            
            logger.info("Multi-platform job search completed")
            return {
                "success": True,
                "result": result,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Multi-platform job search failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

class ApplicationAgent(BrowserUseJobAgent):
    """Agent specialized in submitting job applications"""
    
    def __init__(self, config: JobSearchConfig, applicant_profile: Dict[str, Any], headless: bool = False):
        super().__init__(config, headless)
        self.profile = applicant_profile
    
    async def apply_to_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply to a specific job"""
        
        task = f"""
        Apply to this job position using the provided applicant information:
        
        Job Details:
        - Title: {job_data.get('title', 'N/A')}
        - Company: {job_data.get('company', 'N/A')}
        - Application URL: {job_data.get('application_url', 'N/A')}
        
        Applicant Profile:
        - Name: {self.profile.get('name', 'N/A')}
        - Email: {self.profile.get('email', 'N/A')}
        - Phone: {self.profile.get('phone', 'N/A')}
        - Location: {self.profile.get('location', 'N/A')}
        - LinkedIn: {self.profile.get('linkedin_url', 'N/A')}
        - GitHub: {self.profile.get('github_url', 'N/A')}
        - Portfolio: {self.profile.get('portfolio_url', 'N/A')}
        - Resume File: {self.profile.get('resume_path', 'N/A')}
        
        Application Process:
        1. Navigate to the application URL
        2. Fill out all required application fields with the profile information
        3. Upload resume file if required (path: {self.profile.get('resume_path', 'Not provided')})
        4. Write a customized cover letter that:
           - Addresses the specific company and position
           - Highlights relevant experience for the role
           - Shows enthusiasm for the company/mission
           - Keeps it concise (2-3 paragraphs)
        5. Review all information for accuracy
        6. Submit the application (only if all fields are properly filled)
        
        Important Guidelines:
        - Only fill out forms with accurate information from the profile
        - Do not make up or fabricate any information
        - If required fields cannot be filled with available data, note this in the results
        - Handle any errors gracefully (CAPTCHAs, technical issues, etc.)
        - Save confirmation details if the application is successful
        
        Return results as JSON:
        {{
            "application_timestamp": "ISO datetime",
            "job_title": "{job_data.get('title', 'N/A')}",
            "company_name": "{job_data.get('company', 'N/A')}",
            "application_status": "submitted/failed/skipped",
            "confirmation_number": "If available",
            "application_url": "{job_data.get('application_url', 'N/A')}",
            "notes": "Any issues or observations",
            "fields_filled": ["field1", "field2"],
            "files_uploaded": ["resume.pdf"],
            "cover_letter_generated": true/false
        }}
        
        Log the result to 'application_log.json'
        """
        
        try:
            logger.info(f"Starting application to {job_data.get('company', 'Unknown')} - {job_data.get('title', 'Unknown')}")
            agent = await self.create_agent(task)
            result = await agent.run()
            
            logger.info(f"Application completed for {job_data.get('company', 'Unknown')}")
            return {
                "success": True,
                "job_data": job_data,
                "result": result,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Application failed for {job_data.get('company', 'Unknown')}: {str(e)}")
            return {
                "success": False,
                "job_data": job_data,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

# Utility functions for the FastAPI endpoint
async def search_company_jobs_api(company_name: str, career_page_url: str, search_config: Dict[str, Any]) -> Dict[str, Any]:
    """API wrapper for company job search"""
    
    config = JobSearchConfig(
        keywords=search_config.get('keywords', ['Software Engineer']),
        location=search_config.get('location', 'Remote'),
        experience_level=search_config.get('experience_level', 'Mid-level'),
        remote_only=search_config.get('remote_only', True),
        max_results=search_config.get('max_results', 10)
    )
    
    agent = JobDiscoveryAgent(config, headless=True)
    result = await agent.search_company_jobs(company_name, career_page_url)
    
    return result

async def apply_to_jobs_api(job_list: List[Dict[str, Any]], applicant_profile: Dict[str, Any], search_config: Dict[str, Any]) -> List[Dict[str, Any]]:
    """API wrapper for job applications"""
    
    config = JobSearchConfig(
        keywords=search_config.get('keywords', ['Software Engineer']),
        location=search_config.get('location', 'Remote'),
        experience_level=search_config.get('experience_level', 'Mid-level'),
        remote_only=search_config.get('remote_only', True),
        max_results=search_config.get('max_results', 10)
    )
    
    agent = ApplicationAgent(config, applicant_profile, headless=True)
    results = []
    
    for job_data in job_list:
        result = await agent.apply_to_job(job_data)
        results.append(result)
    
    return results