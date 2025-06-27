# Agent Architecture Setup Guide

## Overview

This document provides a comprehensive guide for implementing a multi-agent job discovery and application system inspired by browser-use architecture. The system combines AI-powered agents with browser automation to handle modern JavaScript-heavy career pages while maintaining a clean, scalable architecture.

## System Architecture

### Overall Structure

```
job-automation-platform/
├── frontend/                    # React/TypeScript/Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── CompanyDirectory.tsx
│   │   │   │   ├── AutomatedAgent.tsx
│   │   │   │   └── JobSources.tsx
│   │   │   ├── auth/
│   │   │   └── ui/
│   │   ├── services/
│   │   │   ├── multiAgentJobDiscoveryService.ts
│   │   │   ├── enhancedAIAgentOrchestrator.ts
│   │   │   └── *Service.ts
│   │   ├── contexts/
│   │   └── integrations/
│   └── pages/
│
└── backend/                     # FastAPI/Python
    └── src/job_automation/
        ├── core/                # Domain layer
        │   ├── agents/          # AI agent implementations
        │   │   ├── __init__.py
        │   │   ├── base_agent.py
        │   │   ├── career_discovery_agent.py
        │   │   ├── job_extraction_agent.py
        │   │   ├── job_matching_agent.py
        │   │   └── application_agent.py
        │   ├── tools/           # Agent tools and utilities
        │   │   ├── browser_tools.py
        │   │   ├── extraction_tools.py
        │   │   └── ai_tools.py
        │   └── utils/
        │       ├── memory_manager.py
        │       └── agent_registry.py
        │
        ├── application/         # Service layer
        │   ├── browser_automation_service/
        │   │   └── automation_service.py
        │   ├── career_page_service/
        │   │   └── career_page_service.py
        │   ├── job_discovery_service/
        │   │   └── job_discovery_service.py
        │   └── agent_orchestration_service/
        │       └── orchestrator.py
        │
        ├── infrastructure/      # External integrations
        │   ├── api/
        │   │   └── job_discovery_api.py
        │   ├── clients/
        │   │   ├── openai_client.py
        │   │   ├── anthropic_client.py
        │   │   └── llm_factory.py
        │   ├── browser/
        │   │   ├── playwright_controller.py
        │   │   ├── browser_pool.py
        │   │   └── dom_processor.py
        │   └── monitoring/
        │       └── agent_metrics.py
        │
        └── config.py            # Configuration management
```

## Core Components

### 1. Base Agent Framework

```python
# core/agents/base_agent.py
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import json

class AgentState(BaseModel):
    """OODA Loop State Management"""
    observation: Dict[str, Any]
    orientation: Dict[str, Any]
    decision: Optional[Dict[str, Any]] = None
    action: Optional[Dict[str, Any]] = None
    memory: List[Dict[str, Any]] = []

class AgentAction(BaseModel):
    """Structured action format"""
    action_type: str
    parameters: Dict[str, Any]
    confidence: float
    reasoning: str

class BaseAgent(ABC):
    """
    Base agent implementing OODA (Observe-Orient-Decide-Act) loop
    inspired by browser-use architecture
    """
    
    def __init__(
        self,
        name: str,
        llm_client: Any,
        use_vision: bool = False,
        max_retries: int = 3,
        memory_limit: int = 50
    ):
        self.name = name
        self.llm_client = llm_client
        self.use_vision = use_vision
        self.max_retries = max_retries
        self.memory_limit = memory_limit
        self.state = AgentState(
            observation={},
            orientation={},
            memory=[]
        )
    
    async def execute(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Main execution loop following OODA pattern"""
        try:
            # Observe
            observation = await self.observe(task)
            self.state.observation = observation
            
            # Orient
            orientation = await self.orient(observation)
            self.state.orientation = orientation
            
            # Decide
            decision = await self.decide(orientation)
            self.state.decision = decision
            
            # Act
            result = await self.act(decision)
            
            # Update memory
            await self.update_memory(result)
            
            return result
            
        except Exception as e:
            return await self.handle_error(e)
    
    @abstractmethod
    async def observe(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Gather information about current state"""
        pass
    
    @abstractmethod
    async def orient(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Process and contextualize observations"""
        pass
    
    @abstractmethod
    async def decide(self, orientation: Dict[str, Any]) -> Dict[str, Any]:
        """Make decision based on oriented information"""
        pass
    
    @abstractmethod
    async def act(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the decided action"""
        pass
    
    async def update_memory(self, result: Dict[str, Any]):
        """Update agent memory with consolidation"""
        self.state.memory.append({
            "timestamp": datetime.utcnow(),
            "action": self.state.decision,
            "result": result
        })
        
        # Memory consolidation when limit reached
        if len(self.state.memory) > self.memory_limit:
            await self.consolidate_memory()
    
    async def consolidate_memory(self):
        """Consolidate memory to prevent context overflow"""
        # Use LLM to summarize important patterns
        summary_prompt = self._build_memory_summary_prompt()
        summary = await self.llm_client.generate(summary_prompt)
        
        # Keep only recent memory + summary
        self.state.memory = [{"type": "summary", "content": summary}] + \
                           self.state.memory[-10:]
    
    def get_structured_prompt(self, template: str, **kwargs) -> str:
        """Generate structured prompts for LLM"""
        return template.format(**kwargs)
    
    async def handle_error(self, error: Exception) -> Dict[str, Any]:
        """Graceful error handling with retry logic"""
        # Log error and attempt recovery
        return {"status": "error", "message": str(error)}
```

### 2. Specialized Agent Implementations

#### Career Discovery Agent

```python
# core/agents/career_discovery_agent.py
class CareerDiscoveryAgent(BaseAgent):
    """
    Discovers career/jobs pages on company websites
    Uses AI to intelligently find career URLs
    """
    
    def __init__(self, **kwargs):
        super().__init__(name="CareerDiscoveryAgent", **kwargs)
        self.common_patterns = [
            "/careers", "/jobs", "/join-us", "/work-with-us",
            "/opportunities", "/openings", "/employment"
        ]
    
    async def observe(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Observe company website structure"""
        company_name = task["company_name"]
        website_url = task["website_url"]
        
        # Get website content
        content = await self._fetch_website_content(website_url)
        
        return {
            "company": company_name,
            "url": website_url,
            "navigation_links": self._extract_navigation_links(content),
            "page_content": content[:5000]  # First 5000 chars
        }
    
    async def orient(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze website to find career page patterns"""
        # Check common patterns first
        pattern_matches = self._check_common_patterns(
            observation["navigation_links"]
        )
        
        if pattern_matches:
            return {
                "strategy": "pattern_match",
                "candidates": pattern_matches,
                "confidence": 0.9
            }
        
        # Use AI to analyze navigation
        ai_analysis = await self._ai_analyze_navigation(observation)
        
        return {
            "strategy": "ai_analysis",
            "candidates": ai_analysis["urls"],
            "confidence": ai_analysis["confidence"]
        }
    
    async def decide(self, orientation: Dict[str, Any]) -> Dict[str, Any]:
        """Decide which career page URL to use"""
        candidates = orientation["candidates"]
        
        if not candidates:
            return {
                "action": "search_footer",
                "reason": "No career links found in main navigation"
            }
        
        # Rank candidates by confidence
        best_candidate = max(candidates, key=lambda x: x.get("score", 0))
        
        return {
            "action": "verify_career_page",
            "url": best_candidate["url"],
            "confidence": orientation["confidence"]
        }
    
    async def act(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Return discovered career page URL"""
        return {
            "status": "success",
            "career_page_url": decision["url"],
            "confidence": decision["confidence"],
            "discovery_method": self.state.orientation["strategy"]
        }
```

#### Job Extraction Agent

```python
# core/agents/job_extraction_agent.py
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
            "ai_content_extraction",
            "api_interception"
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
            result = await self._try_extraction_strategy(strategy, content)
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
        for job in jobs:
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
    
    def _detect_javascript_rendering(self, content: str) -> bool:
        """Detect if page likely uses JavaScript for job loading"""
        indicators = [
            "react", "vue", "angular", "webpack",
            "__NEXT_DATA__", "window.__INITIAL_STATE__",
            "job-listings-container", "data-job-id"
        ]
        content_lower = content.lower()
        return any(indicator in content_lower for indicator in indicators)
    
    async def _try_extraction_strategy(self, strategy: str, content: str) -> Dict[str, Any]:
        """Try a specific extraction strategy"""
        if strategy == "json_ld_extraction":
            return self._extract_json_ld_jobs(content)
        elif strategy == "html_pattern_extraction":
            return self._extract_pattern_based_jobs(content)
        elif strategy == "ai_content_extraction":
            return await self._extract_with_ai(content)
        elif strategy == "api_interception":
            return await self._extract_from_api_calls()
        
        return {"success": False, "jobs": []}
```

#### Job Matching Agent

```python
# core/agents/job_matching_agent.py
class JobMatchingAgent(BaseAgent):
    """
    Matches jobs to user preferences using AI
    Provides compatibility scores and reasoning
    """
    
    def __init__(self, **kwargs):
        super().__init__(name="JobMatchingAgent", **kwargs)
    
    async def observe(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Observe jobs and user preferences"""
        return {
            "jobs": task["jobs"],
            "user_preferences": task["user_preferences"],
            "total_jobs": len(task["jobs"])
        }
    
    async def orient(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze matching criteria"""
        preferences = observation["user_preferences"]
        
        # Define matching dimensions
        dimensions = {
            "skills_match": self._analyze_skills_overlap(preferences),
            "experience_match": self._analyze_experience_fit(preferences),
            "location_match": self._analyze_location_compatibility(preferences),
            "salary_match": self._analyze_salary_alignment(preferences),
            "culture_match": self._analyze_culture_fit(preferences)
        }
        
        return {
            "matching_dimensions": dimensions,
            "weight_distribution": self._calculate_weights(preferences)
        }
    
    async def decide(self, orientation: Dict[str, Any]) -> Dict[str, Any]:
        """Score and rank jobs"""
        jobs = self.state.observation["jobs"]
        dimensions = orientation["matching_dimensions"]
        weights = orientation["weight_distribution"]
        
        scored_jobs = []
        for job in jobs:
            # Calculate dimension scores
            scores = {}
            for dim_name, dim_analyzer in dimensions.items():
                scores[dim_name] = await dim_analyzer(job)
            
            # Calculate weighted total score
            total_score = sum(
                scores[dim] * weights[dim] 
                for dim in scores
            )
            
            # Get AI reasoning for match
            reasoning = await self._get_match_reasoning(
                job, 
                scores, 
                self.state.observation["user_preferences"]
            )
            
            scored_jobs.append({
                **job,
                "match_score": total_score,
                "dimension_scores": scores,
                "match_reasoning": reasoning
            })
        
        # Sort by match score
        scored_jobs.sort(key=lambda x: x["match_score"], reverse=True)
        
        return {
            "action": "return_matches",
            "matched_jobs": scored_jobs,
            "matching_criteria": dimensions.keys()
        }
    
    async def act(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Return matched jobs with scores"""
        return {
            "status": "success",
            "matched_jobs": decision["matched_jobs"],
            "total_matched": len(decision["matched_jobs"]),
            "matching_criteria": decision["matching_criteria"]
        }
```

### 3. Browser Automation Layer

```python
# infrastructure/browser/playwright_controller.py
from playwright.async_api import async_playwright, Page, Browser
from typing import Optional, Dict, Any
import asyncio
import base64

class PlaywrightController:
    """
    Browser automation controller inspired by browser-use
    Handles dynamic content rendering and intelligent page interaction
    """
    
    def __init__(self, headless: bool = True, timeout: int = 30000):
        self.headless = headless
        self.timeout = timeout
        self.browser: Optional[Browser] = None
        self.context = None
        self._playwright = None
    
    async def initialize(self):
        """Initialize browser instance"""
        self._playwright = await async_playwright().start()
        self.browser = await self._playwright.chromium.launch(
            headless=self.headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage"
            ]
        )
        
        # Create context with stealth settings
        self.context = await self.browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
    
    async def get_rendered_content(self, url: str) -> str:
        """Get fully rendered page content after JavaScript execution"""
        page = await self.context.new_page()
        
        try:
            # Navigate to page
            await page.goto(url, wait_until="networkidle", timeout=self.timeout)
            
            # Wait for common job container selectors
            await self._wait_for_job_content(page)
            
            # Handle infinite scroll if detected
            await self._handle_infinite_scroll(page)
            
            # Get final HTML content
            content = await page.content()
            
            return content
            
        finally:
            await page.close()
    
    async def capture_screenshot(self, url: str) -> str:
        """Capture screenshot for vision-enabled agents"""
        page = await self.context.new_page()
        
        try:
            await page.goto(url, wait_until="networkidle")
            
            # Take screenshot
            screenshot_bytes = await page.screenshot(full_page=True)
            
            # Convert to base64 for LLM vision
            screenshot_base64 = base64.b64encode(screenshot_bytes).decode()
            
            return f"data:image/png;base64,{screenshot_base64}"
            
        finally:
            await page.close()
    
    async def _wait_for_job_content(self, page: Page):
        """Intelligently wait for job content to load"""
        # Common job container selectors
        selectors = [
            "[data-testid*='job']",
            "[class*='job-listing']",
            "[class*='position']",
            "[class*='opening']",
            "[id*='careers']",
            ".job-item",
            ".career-opportunity"
        ]
        
        # Try to wait for any job container
        for selector in selectors:
            try:
                await page.wait_for_selector(selector, timeout=5000)
                return
            except:
                continue
        
        # Fallback: wait for general content
        await page.wait_for_load_state("domcontentloaded")
        await asyncio.sleep(2)  # Give JS time to render
    
    async def _handle_infinite_scroll(self, page: Page):
        """Handle infinite scroll job pages"""
        previous_height = 0
        same_height_count = 0
        max_scrolls = 10
        
        for _ in range(max_scrolls):
            # Get current page height
            current_height = await page.evaluate("document.body.scrollHeight")
            
            # Check if height changed
            if current_height == previous_height:
                same_height_count += 1
                if same_height_count >= 2:
                    break  # No more content loading
            else:
                same_height_count = 0
            
            previous_height = current_height
            
            # Scroll to bottom
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            
            # Wait for potential new content
            await asyncio.sleep(1)
            
            # Check for "Load More" button
            load_more = await self._find_load_more_button(page)
            if load_more:
                await load_more.click()
                await asyncio.sleep(2)
    
    async def _find_load_more_button(self, page: Page):
        """Find and return load more button if exists"""
        button_texts = ["load more", "show more", "more jobs", "view more"]
        
        for text in button_texts:
            button = await page.query_selector(f"button:has-text('{text}')")
            if button:
                return button
        
        return None
    
    async def cleanup(self):
        """Clean up browser resources"""
        if self.browser:
            await self.browser.close()
        if self._playwright:
            await self._playwright.stop()
```

### 4. Agent Orchestration

```python
# application/agent_orchestration_service/orchestrator.py
from typing import Dict, Any, List
import asyncio

class JobDiscoveryOrchestrator:
    """
    Orchestrates the multi-agent job discovery workflow
    Coordinates the 4-step process with parallel execution support
    """
    
    def __init__(
        self,
        career_agent: CareerDiscoveryAgent,
        extraction_agent: JobExtractionAgent,
        matching_agent: JobMatchingAgent,
        browser_controller: PlaywrightController
    ):
        self.career_agent = career_agent
        self.extraction_agent = extraction_agent
        self.matching_agent = matching_agent
        self.browser_controller = browser_controller
        self.progress_callback = None
    
    async def discover_jobs(
        self,
        company: str,
        website: str,
        user_preferences: Dict[str, Any],
        progress_callback=None
    ) -> Dict[str, Any]:
        """
        Execute the complete job discovery workflow
        """
        self.progress_callback = progress_callback
        
        try:
            # Step 1: Career Page Discovery
            await self._report_progress("🔍 Discovering career page...", 0.25)
            career_result = await self.career_agent.execute({
                "company_name": company,
                "website_url": website
            })
            
            if career_result["status"] != "success":
                return {
                    "status": "error",
                    "message": "Failed to find career page",
                    "company": company
                }
            
            # Step 2: Career Page Verification
            await self._report_progress("✅ Verifying career page...", 0.4)
            career_url = career_result["career_page_url"]
            
            # Quick verification that URL is valid
            if not await self._verify_career_page(career_url):
                return {
                    "status": "error",
                    "message": "Career page verification failed",
                    "company": company
                }
            
            # Step 3: Job Extraction
            await self._report_progress("📊 Extracting job listings...", 0.6)
            extraction_result = await self.extraction_agent.execute({
                "career_page_url": career_url,
                "company_name": company
            })
            
            if extraction_result["status"] != "success":
                return {
                    "status": "error",
                    "message": "Failed to extract jobs",
                    "company": company
                }
            
            jobs = extraction_result["jobs"]
            
            # Report extraction method
            if extraction_result.get("used_browser"):
                await self._report_progress("🌐 Used browser automation for dynamic content", 0.7)
            
            # Step 4: Job Matching
            await self._report_progress("🎯 Matching jobs to preferences...", 0.85)
            matching_result = await self.matching_agent.execute({
                "jobs": jobs,
                "user_preferences": user_preferences
            })
            
            await self._report_progress("✨ Job discovery complete!", 1.0)
            
            return {
                "status": "success",
                "company": company,
                "career_page_url": career_url,
                "total_jobs": len(jobs),
                "matched_jobs": matching_result["matched_jobs"],
                "extraction_method": extraction_result["extraction_method"],
                "used_browser": extraction_result.get("used_browser", False)
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "company": company
            }
    
    async def discover_jobs_parallel(
        self,
        companies: List[Dict[str, str]],
        user_preferences: Dict[str, Any],
        max_concurrent: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Discover jobs from multiple companies in parallel
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_company(company_data):
            async with semaphore:
                return await self.discover_jobs(
                    company=company_data["name"],
                    website=company_data["website"],
                    user_preferences=user_preferences
                )
        
        tasks = [process_company(company) for company in companies]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle exceptions
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
        
        return processed_results
    
    async def _verify_career_page(self, url: str) -> bool:
        """Quick verification that career page is accessible"""
        # Implementation would check HTTP status, basic content validation
        return True
    
    async def _report_progress(self, message: str, progress: float):
        """Report progress to callback if provided"""
        if self.progress_callback:
            await self.progress_callback({
                "message": message,
                "progress": progress
            })
```

### 5. API Integration

```python
# infrastructure/api/job_discovery_api.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class JobDiscoveryRequest(BaseModel):
    company: str
    website: str
    user_preferences: Dict[str, Any]
    use_browser_automation: bool = True

class MultiAgentJobDiscoveryRequest(BaseModel):
    companies: List[Dict[str, str]]
    user_preferences: Dict[str, Any]
    use_browser_automation: bool = True
    max_concurrent: int = 3

@router.post("/api/multi-agent-job-discovery")
async def multi_agent_job_discovery(request: MultiAgentJobDiscoveryRequest):
    """
    Main endpoint for multi-agent job discovery
    Orchestrates the complete workflow
    """
    try:
        # Initialize components
        browser_controller = None
        if request.use_browser_automation:
            browser_controller = PlaywrightController()
            await browser_controller.initialize()
        
        # Create agents
        llm_client = LLMFactory.create(provider="openai", model="gpt-4o")
        
        career_agent = CareerDiscoveryAgent(llm_client=llm_client)
        extraction_agent = JobExtractionAgent(
            llm_client=llm_client,
            browser_controller=browser_controller,
            use_vision=True
        )
        matching_agent = JobMatchingAgent(llm_client=llm_client)
        
        # Create orchestrator
        orchestrator = JobDiscoveryOrchestrator(
            career_agent=career_agent,
            extraction_agent=extraction_agent,
            matching_agent=matching_agent,
            browser_controller=browser_controller
        )
        
        # Process companies
        if len(request.companies) == 1:
            # Single company
            result = await orchestrator.discover_jobs(
                company=request.companies[0]["name"],
                website=request.companies[0]["website"],
                user_preferences=request.user_preferences
            )
            return result
        else:
            # Multiple companies in parallel
            results = await orchestrator.discover_jobs_parallel(
                companies=request.companies,
                user_preferences=request.user_preferences,
                max_concurrent=request.max_concurrent
            )
            return {"results": results}
            
    finally:
        # Cleanup
        if browser_controller:
            await browser_controller.cleanup()

@router.post("/api/find-career-page")
async def find_career_page(request: Dict[str, str]):
    """Career page discovery endpoint"""
    llm_client = LLMFactory.create(provider="openai", model="gpt-4o-mini")
    agent = CareerDiscoveryAgent(llm_client=llm_client)
    
    result = await agent.execute({
        "company_name": request["company"],
        "website_url": request["website"]
    })
    
    return result

@router.post("/api/browser-use-job-search")
async def browser_use_job_search(request: Dict[str, Any]):
    """
    Enhanced job extraction with browser automation fallback
    """
    url = request["url"]
    company = request["company"]
    
    # Initialize browser if needed
    browser_controller = None
    if request.get("use_browser_automation", True):
        browser_controller = PlaywrightController()
        await browser_controller.initialize()
    
    try:
        # Create extraction agent
        llm_client = LLMFactory.create(provider="openai", model="gpt-4o")
        agent = JobExtractionAgent(
            llm_client=llm_client,
            browser_controller=browser_controller,
            use_vision=request.get("use_vision", True)
        )
        
        # Extract jobs
        result = await agent.execute({
            "career_page_url": url,
            "company_name": company
        })
        
        return result
        
    finally:
        if browser_controller:
            await browser_controller.cleanup()
```

### 6. Configuration Management

```python
# config.py
from pydantic import BaseSettings
from typing import Optional

class BrowserConfig(BaseSettings):
    """Browser automation configuration"""
    use_browser_automation: bool = True
    browser_headless: bool = True
    browser_timeout: int = 30000
    max_browser_instances: int = 3
    browser_executable_path: Optional[str] = None
    
class AgentConfig(BaseSettings):
    """Agent configuration"""
    default_llm_provider: str = "openai"
    default_llm_model: str = "gpt-4o"
    vision_enabled: bool = True
    max_retries: int = 3
    agent_timeout: int = 60
    memory_limit: int = 50
    use_cheaper_models_for_simple_tasks: bool = True
    
class LLMConfig(BaseSettings):
    """LLM provider configuration"""
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    openai_model: str = "gpt-4o"
    anthropic_model: str = "claude-3-opus-20240229"
    vision_model: str = "gpt-4o"
    cheap_model: str = "gpt-4o-mini"  # For simple tasks
    deepseek_api_key: Optional[str] = None
    deepseek_model: str = "deepseek-v3"  # 30x cheaper than GPT-4o
    
class Config(BaseSettings):
    """Main configuration"""
    browser: BrowserConfig = BrowserConfig()
    agent: AgentConfig = AgentConfig()
    llm: LLMConfig = LLMConfig()
    
    # Performance settings
    max_concurrent_agents: int = 5
    cache_ttl_seconds: int = 3600
    enable_metrics: bool = True
    
    # Demo mode (no AI calls)
    demo_mode: bool = False
    
    class Config:
        env_file = ".env"
```

### 7. Data Models

```python
# core/models.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class JobType(str, Enum):
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"
    FLEXIBLE = "flexible"

class ExperienceLevel(str, Enum):
    ENTRY = "entry"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"
    EXECUTIVE = "executive"

class JobListing(BaseModel):
    """Standardized job listing model"""
    # Core fields
    title: str
    company: str
    location: str
    job_type: JobType
    experience_level: ExperienceLevel
    
    # Details
    description: str
    requirements: List[str] = []
    skills: List[str] = []
    
    # Compensation
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = "EUR"
    
    # Meta
    application_url: str
    posted_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None
    
    # Extraction metadata
    source_url: str
    extraction_method: str
    extraction_confidence: float = Field(ge=0, le=1)
    
    # Matching scores (added by matching agent)
    match_score: Optional[float] = None
    dimension_scores: Optional[Dict[str, float]] = None
    match_reasoning: Optional[str] = None

class UserPreferences(BaseModel):
    """User job search preferences"""
    # Skills and experience
    skills: List[str]
    experience_years: int
    desired_roles: List[str] = []
    
    # Location preferences
    locations: List[str]
    job_types: List[JobType]
    willing_to_relocate: bool = False
    
    # Compensation
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = "EUR"
    
    # Company preferences
    company_size: Optional[List[str]] = None
    industries: Optional[List[str]] = None
    company_culture: Optional[List[str]] = None
    
    # Weights for matching
    skill_weight: float = 0.3
    location_weight: float = 0.2
    salary_weight: float = 0.25
    culture_weight: float = 0.15
    experience_weight: float = 0.1

class AgentMessage(BaseModel):
    """Inter-agent communication format"""
    sender: str
    receiver: str
    message_type: str
    content: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    correlation_id: Optional[str] = None

class WorkflowProgress(BaseModel):
    """Progress tracking for long-running workflows"""
    workflow_id: str
    current_step: str
    total_steps: int
    progress_percentage: float
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None
```

### 8. Utility Functions

```python
# core/utils/memory_manager.py
from typing import List, Dict, Any
import json

class MemoryManager:
    """
    Manages agent memory with consolidation strategies
    Inspired by browser-use's memory handling
    """
    
    def __init__(self, max_entries: int = 50, consolidation_threshold: int = 40):
        self.max_entries = max_entries
        self.consolidation_threshold = consolidation_threshold
        self.memory: List[Dict[str, Any]] = []
        self.consolidated_memory: List[Dict[str, Any]] = []
    
    def add_entry(self, entry: Dict[str, Any]):
        """Add new memory entry"""
        self.memory.append({
            **entry,
            "timestamp": datetime.utcnow()
        })
        
        if len(self.memory) >= self.consolidation_threshold:
            self.consolidate()
    
    def consolidate(self):
        """Consolidate memory to prevent overflow"""
        # Group by action type
        action_groups = {}
        for entry in self.memory:
            action = entry.get("action", "unknown")
            if action not in action_groups:
                action_groups[action] = []
            action_groups[action].append(entry)
        
        # Create summary
        summary = {
            "type": "consolidated_summary",
            "period": {
                "start": self.memory[0]["timestamp"],
                "end": self.memory[-1]["timestamp"]
            },
            "action_counts": {
                action: len(entries) 
                for action, entries in action_groups.items()
            },
            "key_learnings": self._extract_key_learnings(action_groups)
        }
        
        self.consolidated_memory.append(summary)
        
        # Keep only recent entries
        self.memory = self.memory[-10:]
    
    def _extract_key_learnings(self, action_groups: Dict[str, List]) -> List[str]:
        """Extract key patterns and learnings"""
        learnings = []
        
        # Analyze success patterns
        for action, entries in action_groups.items():
            success_rate = sum(
                1 for e in entries 
                if e.get("result", {}).get("status") == "success"
            ) / len(entries)
            
            if success_rate < 0.5:
                learnings.append(f"{action} has low success rate: {success_rate:.2%}")
            elif success_rate > 0.9:
                learnings.append(f"{action} is highly reliable: {success_rate:.2%}")
        
        return learnings
    
    def get_context(self) -> List[Dict[str, Any]]:
        """Get current context including consolidated memory"""
        return self.consolidated_memory + self.memory

# core/utils/agent_registry.py
class AgentRegistry:
    """
    Registry for custom agent actions and tools
    Enables extensibility like browser-use
    """
    
    def __init__(self):
        self.actions: Dict[str, Any] = {}
        self.tools: Dict[str, Any] = {}
    
    def register_action(self, name: str, handler: callable, schema: BaseModel = None):
        """Register custom action"""
        self.actions[name] = {
            "handler": handler,
            "schema": schema
        }
    
    def register_tool(self, name: str, tool: Any):
        """Register custom tool"""
        self.tools[name] = tool
    
    def get_action(self, name: str):
        """Get registered action"""
        return self.actions.get(name)
    
    def get_tool(self, name: str):
        """Get registered tool"""
        return self.tools.get(name)
```

### 9. Implementation Steps

#### Step 1: Install Dependencies
```bash
cd backend
uv add playwright langchain openai anthropic pydantic
uv run playwright install chromium
```

#### Step 2: Create Base Agent Framework
1. Implement `BaseAgent` class with OODA loop
2. Add memory management and error handling
3. Create LLM client factory for multiple providers

#### Step 3: Implement Specialized Agents
1. `CareerDiscoveryAgent` - Find career pages
2. `JobExtractionAgent` - Extract job listings
3. `JobMatchingAgent` - Match to preferences
4. Optional: `ApplicationAgent` foundation

#### Step 4: Add Browser Automation
1. Create `PlaywrightController` with intelligent waiting
2. Implement dynamic content detection
3. Add screenshot capture for vision

#### Step 5: Build Orchestration Layer
1. Create `JobDiscoveryOrchestrator`
2. Implement 4-step workflow
3. Add parallel processing support

#### Step 6: Integrate with API
1. Update existing endpoints
2. Add browser automation fallback
3. Implement progress tracking

#### Step 7: Testing & Optimization
1. Unit tests for each agent
2. Integration tests for workflows
3. Performance optimization
4. Cost optimization with model selection

### 10. Usage Examples

```python
# Basic usage
from job_automation import JobDiscoveryOrchestrator, UserPreferences

# Initialize orchestrator
orchestrator = JobDiscoveryOrchestrator()

# Define user preferences
preferences = UserPreferences(
    skills=["Python", "React", "TypeScript"],
    locations=["Berlin", "Remote"],
    experience_years=5,
    job_types=["remote", "hybrid"],
    salary_min=65000,
    salary_max=95000
)

# Discover jobs from single company
result = await orchestrator.discover_jobs(
    company="N26",
    website="https://n26.com",
    user_preferences=preferences
)

# Discover from multiple companies
companies = [
    {"name": "N26", "website": "https://n26.com"},
    {"name": "Spotify", "website": "https://spotify.com"},
    {"name": "Zalando", "website": "https://zalando.com"}
]

results = await orchestrator.discover_jobs_parallel(
    companies=companies,
    user_preferences=preferences,
    max_concurrent=3
)

# Custom agent with specific LLM
from langchain.chat_models import ChatAnthropic

custom_agent = JobExtractionAgent(
    llm_client=ChatAnthropic(model="claude-3-opus-20240229"),
    use_vision=True
)

# Register custom action
registry = AgentRegistry()

@registry.register_action("save_interesting_job")
async def save_job(job: JobListing, reason: str):
    # Custom logic to save interesting jobs
    await database.save_job(job, reason)
```

### 11. Performance & Scaling Considerations

#### Optimization Strategies
1. **Model Selection**: Use GPT-4o for complex reasoning, GPT-4o-mini or DeepSeek-V3 for simple tasks
2. **Caching**: Cache career page discoveries and static job extractions
3. **Parallel Processing**: Process multiple companies concurrently
4. **Resource Pooling**: Reuse browser instances across requests

#### Monitoring & Metrics
```python
# infrastructure/monitoring/agent_metrics.py
class AgentMetrics:
    """Track agent performance and costs"""
    
    async def track_execution(self, agent_name: str, execution_time: float, tokens_used: int):
        # Track performance metrics
        pass
    
    async def track_cost(self, model: str, tokens: int):
        # Track API costs
        pass
    
    async def track_success_rate(self, agent_name: str, success: bool):
        # Track agent reliability
        pass
```

### 12. Security & Error Handling

#### Security Measures
1. Domain restrictions for browser automation
2. Rate limiting for API endpoints
3. Sanitization of extracted content
4. Secure credential management

#### Error Recovery
1. Retry failed agent actions with exponential backoff
2. Fallback from browser to static scraping
3. Graceful degradation for unsupported sites
4. Comprehensive error logging

## Conclusion

This architecture combines the best of browser-use's agent design with your existing job automation platform. The modular structure allows for:

- **Incremental adoption**: Add browser automation without changing existing code
- **Scalability**: Handle multiple companies in parallel
- **Reliability**: Multiple fallback strategies and error handling
- **Cost optimization**: Smart model selection based on task complexity
- **Extensibility**: Easy to add new agents and capabilities

The system maintains clean separation of concerns while providing powerful AI-driven automation for modern job discovery workflows.