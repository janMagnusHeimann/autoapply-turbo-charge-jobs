"""
Job Extraction Agent - Extracts job listings from career pages
"""

import re
import json
import aiohttp
from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup
from .base_agent import BaseAgent
import logging

logger = logging.getLogger(__name__)

class JobExtractionAgent(BaseAgent):
    """
    Extracts job listings from career pages
    Handles both static and dynamic (JavaScript) content
    """
    
    def __init__(self, browser_controller=None, **kwargs):
        super().__init__(name="JobExtractionAgent", **kwargs)
        self.browser_controller = browser_controller
        self.extraction_strategies = [
            "json_ld_extraction",
            "html_pattern_extraction", 
            "ai_content_extraction"
        ]
    
    async def observe(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Observe career page content"""
        url = task["career_page_url"]
        company = task["company_name"]
        
        # Try static extraction first
        static_content = await self._fetch_static_content(url)
        static_jobs = self._quick_job_check(static_content)
        
        observation = {
            "url": url,
            "company": company,
            "static_content": static_content,
            "static_job_count": len(static_jobs),
            "requires_browser": False
        }
        
        # Check if browser automation needed
        if len(static_jobs) == 0 and self._detect_javascript_rendering(static_content):
            observation["requires_browser"] = True
            if self.browser_controller:
                logger.info("🌐 Using browser automation for dynamic content")
                browser_content = await self.browser_controller.get_rendered_content(url)
                observation["browser_content"] = browser_content
                observation["screenshot"] = await self.browser_controller.capture_screenshot(url)
        
        return observation
    
    async def orient(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Determine best extraction strategy"""
        content = observation.get("browser_content", observation["static_content"])
        
        # Try extraction strategies in order
        strategies_tried = []
        
        for strategy in self.extraction_strategies:
            result = await self._try_extraction_strategy(strategy, content, observation)
            strategies_tried.append({
                "strategy": strategy,
                "success": result["success"],
                "job_count": len(result.get("jobs", []))
            })
            
            if result["success"] and result["jobs"]:
                return {
                    "best_strategy": strategy,
                    "jobs_found": result["jobs"],
                    "all_strategies": strategies_tried
                }
        
        # If no strategy worked, use AI vision if available
        if self.use_vision and observation.get("screenshot"):
            logger.info("🔍 Trying vision-based extraction")
            vision_result = await self._extract_with_vision(
                observation["screenshot"],
                content
            )
            return {
                "best_strategy": "vision_extraction",
                "jobs_found": vision_result["jobs"],
                "all_strategies": strategies_tried
            }
        
        return {
            "best_strategy": None,
            "jobs_found": [],
            "all_strategies": strategies_tried
        }
    
    async def decide(self, orientation: Dict[str, Any]) -> Dict[str, Any]:
        """Decide on final job list"""
        jobs = orientation["jobs_found"]
        
        # Enrich job data with AI
        enriched_jobs = []
        for job in jobs[:20]:  # Limit to avoid token overflow
            enriched = await self._enrich_job_data(job)
            enriched_jobs.append(enriched)
        
        return {
            "action": "return_jobs",
            "jobs": enriched_jobs,
            "extraction_method": orientation["best_strategy"],
            "total_found": len(enriched_jobs)
        }
    
    async def act(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Return extracted jobs"""
        return {
            "status": "success",
            "jobs": decision["jobs"],
            "total_jobs": decision["total_found"],
            "extraction_method": decision["extraction_method"],
            "used_browser": self.state.observation.get("requires_browser", False)
        }
    
    async def _fetch_static_content(self, url: str) -> str:
        """Fetch static HTML content"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=15) as response:
                    if response.status == 200:
                        return await response.text()
            return ""
        except Exception as e:
            logger.error(f"Failed to fetch {url}: {e}")
            return ""
    
    def _quick_job_check(self, content: str) -> List[Dict[str, Any]]:
        """Quick check for obvious job listings in static content"""
        if not content:
            return []
        
        # Look for job-related patterns
        job_patterns = [
            r'<[^>]*class[^>]*job[^>]*>',
            r'<[^>]*id[^>]*job[^>]*>',
            r'<[^>]*data-[^>]*job[^>]*>',
            r'"job":\s*{',
            r'"position":\s*{',
            r'"title":\s*"[^"]*engineer[^"]*"',
            r'"title":\s*"[^"]*developer[^"]*"',
        ]
        
        matches = 0
        for pattern in job_patterns:
            matches += len(re.findall(pattern, content, re.IGNORECASE))
        
        # Return dummy jobs if patterns found
        if matches > 2:
            return [{"title": "Found job indicators", "pattern_matches": matches}]
        
        return []
    
    def _detect_javascript_rendering(self, content: str) -> bool:
        """Detect if page likely uses JavaScript for job loading"""
        if not content:
            return True  # If no content, likely needs JS
        
        indicators = [
            "react", "vue", "angular", "webpack",
            "__NEXT_DATA__", "window.__INITIAL_STATE__",
            "job-listings-container", "data-job-id",
            "loading", "skeleton", "spa-", "app-"
        ]
        content_lower = content.lower()
        return any(indicator in content_lower for indicator in indicators)
    
    async def _try_extraction_strategy(self, strategy: str, content: str, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Try a specific extraction strategy"""
        try:
            if strategy == "json_ld_extraction":
                return self._extract_json_ld_jobs(content)
            elif strategy == "html_pattern_extraction":
                return self._extract_pattern_based_jobs(content)
            elif strategy == "ai_content_extraction":
                return await self._extract_with_ai(content, observation)
            
            return {"success": False, "jobs": []}
            
        except Exception as e:
            logger.error(f"Strategy {strategy} failed: {e}")
            return {"success": False, "jobs": []}
    
    def _extract_json_ld_jobs(self, content: str) -> Dict[str, Any]:
        """Extract jobs from JSON-LD structured data"""
        jobs = []
        
        # Look for JSON-LD script tags
        soup = BeautifulSoup(content, 'html.parser')
        scripts = soup.find_all('script', type='application/ld+json')
        
        for script in scripts:
            try:
                data = json.loads(script.string)
                
                # Handle different JSON-LD structures
                if isinstance(data, list):
                    for item in data:
                        job = self._parse_json_ld_job(item)
                        if job:
                            jobs.append(job)
                else:
                    job = self._parse_json_ld_job(data)
                    if job:
                        jobs.append(job)
                        
            except json.JSONDecodeError:
                continue
        
        return {"success": len(jobs) > 0, "jobs": jobs}
    
    def _parse_json_ld_job(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse a single JSON-LD job posting"""
        if data.get("@type") == "JobPosting":
            return {
                "title": data.get("title", ""),
                "company": data.get("hiringOrganization", {}).get("name", ""),
                "location": data.get("jobLocation", {}).get("name", ""),
                "description": data.get("description", ""),
                "employment_type": data.get("employmentType", ""),
                "date_posted": data.get("datePosted", ""),
                "application_url": data.get("apply", {}).get("url", ""),
                "source": "json_ld"
            }
        return None
    
    def _extract_pattern_based_jobs(self, content: str) -> Dict[str, Any]:
        """Extract jobs using HTML patterns"""
        jobs = []
        soup = BeautifulSoup(content, 'html.parser')
        
        # Common job listing selectors
        job_selectors = [
            "[class*='job']",
            "[class*='position']", 
            "[class*='opening']",
            "[class*='role']",
            "[data-testid*='job']",
            ".career-item",
            ".job-item",
            ".position-item"
        ]
        
        for selector in job_selectors:
            elements = soup.select(selector)
            
            for element in elements[:10]:  # Limit to first 10
                job = self._parse_job_element(element)
                if job and job.get("title"):
                    jobs.append(job)
        
        return {"success": len(jobs) > 0, "jobs": jobs}
    
    def _parse_job_element(self, element) -> Dict[str, Any]:
        """Parse a job element from HTML"""
        job = {"source": "html_pattern"}
        
        # Extract title
        title_selectors = ["h1", "h2", "h3", ".title", "[class*='title']", "a"]
        for selector in title_selectors:
            title_elem = element.select_one(selector)
            if title_elem and title_elem.get_text(strip=True):
                job["title"] = title_elem.get_text(strip=True)
                break
        
        # Extract location
        location_selectors = [".location", "[class*='location']", "[class*='office']"]
        for selector in location_selectors:
            loc_elem = element.select_one(selector)
            if loc_elem:
                job["location"] = loc_elem.get_text(strip=True)
                break
        
        # Extract application URL
        link = element.find('a', href=True)
        if link:
            job["application_url"] = link['href']
        
        return job
    
    async def _extract_with_ai(self, content: str, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Extract jobs using AI"""
        if not self.llm_client:
            return {"success": False, "jobs": []}
        
        try:
            # Limit content to avoid token overflow
            soup = BeautifulSoup(content, 'html.parser')
            
            # Remove script and style tags
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            
            clean_content = soup.get_text()
            
            # Take first 8000 characters
            content_sample = clean_content[:8000]
            
            prompt = f"""
            Company: {observation['company']}
            Career Page URL: {observation['url']}
            
            Content from career page:
            {content_sample}
            
            Task: Extract all job listings from this content.
            
            For each job found, extract:
            - title: Job title
            - location: Job location or "Remote"
            - department: Department/team (if mentioned)
            - employment_type: Full-time, Part-time, Contract, etc.
            - description: Brief description (1-2 sentences)
            
            Return ONLY a JSON array of jobs in this format:
            [
              {{
                "title": "Software Engineer",
                "location": "Berlin",
                "department": "Engineering",
                "employment_type": "Full-time",
                "description": "Build scalable applications"
              }}
            ]
            
            If no jobs found, return: []
            """
            
            response = await self.llm_client.generate(prompt)
            
            # Parse JSON response
            try:
                # Extract JSON from response
                json_start = response.find('[')
                json_end = response.rfind(']') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = response[json_start:json_end]
                    jobs = json.loads(json_str)
                    
                    # Add source info
                    for job in jobs:
                        job["source"] = "ai_extraction"
                        job["company"] = observation["company"]
                        job["source_url"] = observation["url"]
                    
                    return {"success": len(jobs) > 0, "jobs": jobs}
                
            except json.JSONDecodeError:
                logger.error("Failed to parse AI response as JSON")
            
            return {"success": False, "jobs": []}
            
        except Exception as e:
            logger.error(f"AI extraction failed: {e}")
            return {"success": False, "jobs": []}
    
    async def _extract_with_vision(self, screenshot: str, content: str) -> Dict[str, Any]:
        """Extract jobs using vision model"""
        if not self.llm_client or not self.use_vision:
            return {"jobs": []}
        
        try:
            prompt = """
            This is a screenshot of a company's career page. 
            Extract all visible job listings with their titles and locations.
            
            Return a JSON array of jobs:
            [{"title": "Job Title", "location": "Location"}]
            
            If no jobs visible, return: []
            """
            
            response = await self.llm_client.generate_with_vision(prompt, screenshot)
            
            # Parse response
            try:
                json_start = response.find('[')
                json_end = response.rfind(']') + 1
                if json_start >= 0 and json_end > json_start:
                    jobs = json.loads(response[json_start:json_end])
                    for job in jobs:
                        job["source"] = "vision_extraction"
                    return {"jobs": jobs}
            except:
                pass
            
            return {"jobs": []}
            
        except Exception as e:
            logger.error(f"Vision extraction failed: {e}")
            return {"jobs": []}
    
    async def _enrich_job_data(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich job data with additional details"""
        # Add default values for missing fields
        enriched = {
            "title": job.get("title", "Unknown Position"),
            "company": job.get("company", self.state.observation.get("company", "")),
            "location": job.get("location", "Not specified"),
            "employment_type": job.get("employment_type", "Full-time"),
            "department": job.get("department", ""),
            "description": job.get("description", ""),
            "application_url": job.get("application_url", self.state.observation.get("url", "")),
            "source": job.get("source", "unknown"),
            "source_url": job.get("source_url", self.state.observation.get("url", "")),
            "extracted_at": "2024-01-01T00:00:00Z"  # Current timestamp
        }
        
        return enriched