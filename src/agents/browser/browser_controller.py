"""
Playwright-based browser controller for agent automation.
Provides intelligent browser session management, DOM processing, and content extraction.
"""

import asyncio
import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union, Set
from urllib.parse import urljoin, urlparse
import re

from playwright.async_api import (
    async_playwright, Browser, BrowserContext, Page, 
    ElementHandle, Response, Route, Request
)
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class BrowserConfig:
    """Configuration for browser controller."""
    headless: bool = True
    viewport_width: int = 1280
    viewport_height: int = 720
    user_agent: str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    timeout: int = 30000  # 30 seconds
    wait_for_load_state: str = "domcontentloaded"  # networkidle, load, domcontentloaded
    save_screenshots: bool = False
    screenshots_dir: Optional[Path] = None
    intercept_requests: bool = True
    block_resources: List[str] = field(default_factory=lambda: ['image', 'font', 'media'])
    max_pages: int = 5  # Maximum concurrent pages
    session_persistence: bool = True


@dataclass 
class PageState:
    """Represents the current state of a page."""
    url: str
    title: str
    content_type: str
    has_dynamic_content: bool = False
    job_indicators: List[str] = field(default_factory=list)
    navigation_elements: List[Dict[str, Any]] = field(default_factory=list)
    forms: List[Dict[str, Any]] = field(default_factory=list)
    api_calls_detected: List[Dict[str, Any]] = field(default_factory=list)
    load_time: float = 0.0
    timestamp: datetime = field(default_factory=datetime.utcnow)


class BrowserController:
    """
    Intelligent browser controller with session persistence, 
    content analysis, and automation capabilities.
    """
    
    def __init__(self, config: Optional[BrowserConfig] = None):
        self.config = config or BrowserConfig()
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.pages: Dict[str, Page] = {}
        self.current_page: Optional[Page] = None
        
        # State tracking
        self.page_states: Dict[str, PageState] = {}
        self.intercepted_requests: List[Dict[str, Any]] = []
        self.session_cookies: List[Dict[str, Any]] = []
        
        # Performance tracking
        self.navigation_count = 0
        self.total_load_time = 0.0
        
        if self.config.screenshots_dir:
            self.config.screenshots_dir.mkdir(parents=True, exist_ok=True)
    
    async def __aenter__(self):
        await self.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    async def start(self) -> None:
        """Initialize browser and context."""
        try:
            self.playwright = await async_playwright().start()
            
            # Launch browser
            self.browser = await self.playwright.chromium.launch(
                headless=self.config.headless,
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-extensions'
                ]
            )
            
            # Create context with configuration
            self.context = await self.browser.new_context(
                viewport={
                    'width': self.config.viewport_width,
                    'height': self.config.viewport_height
                },
                user_agent=self.config.user_agent,
                java_script_enabled=True,
                accept_downloads=False
            )
            
            # Set default timeout
            self.context.set_default_timeout(self.config.timeout)
            
            # Setup request interception if enabled
            if self.config.intercept_requests:
                await self._setup_request_interception()
            
            logger.info("Browser controller started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start browser controller: {e}")
            raise
    
    async def close(self) -> None:
        """Clean up browser resources."""
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            
            logger.info("Browser controller closed successfully")
        except Exception as e:
            logger.error(f"Error closing browser controller: {e}")
    
    async def navigate(
        self,
        url: str,
        wait_for_load: bool = True,
        page_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Navigate to a URL with intelligent loading detection."""
        start_time = time.time()
        
        try:
            # Get or create page
            page = await self._get_or_create_page(page_id)
            
            logger.info(f"Navigating to: {url}")
            
            # Navigate with response monitoring
            response = await page.goto(
                url,
                wait_until=self.config.wait_for_load_state,
                timeout=self.config.timeout
            )
            
            if wait_for_load:
                await self._wait_for_dynamic_content(page)
            
            # Analyze page state
            page_state = await self._analyze_page_state(page, url)
            load_time = time.time() - start_time
            page_state.load_time = load_time
            
            self.page_states[url] = page_state
            self.navigation_count += 1
            self.total_load_time += load_time
            
            # Handle common popups/overlays
            await self._handle_common_overlays(page)
            
            return {
                "success": True,
                "url": url,
                "final_url": page.url,
                "status_code": response.status if response else None,
                "load_time": load_time,
                "has_dynamic_content": page_state.has_dynamic_content,
                "page_state": page_state
            }
            
        except Exception as e:
            logger.error(f"Navigation failed for {url}: {e}")
            return {
                "success": False,
                "url": url,
                "error": str(e),
                "load_time": time.time() - start_time
            }
    
    async def extract_data(
        self,
        selector: Optional[str] = None,
        extraction_type: str = "text",
        attribute: Optional[str] = None,
        page_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extract data from the current page."""
        try:
            page = self._get_current_page(page_id)
            
            if extraction_type == "dom":
                return await self.get_dom_content(page_id)
            elif extraction_type == "screenshot":
                return await self.capture_screenshot(page_id)
            elif selector:
                return await self.extract_elements(selector, extraction_type, attribute, page_id)
            else:
                return await self.get_page_content(page_id)
                
        except Exception as e:
            logger.error(f"Data extraction failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def extract_elements(
        self,
        selector: str,
        extraction_type: str = "text",
        attribute: Optional[str] = None,
        page_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extract specific elements from the page."""
        try:
            page = self._get_current_page(page_id)
            elements = await page.query_selector_all(selector)
            
            extracted_data = []
            
            for element in elements:
                if extraction_type == "text":
                    data = await element.text_content()
                elif extraction_type == "html":
                    data = await element.inner_html()
                elif extraction_type == "attribute" and attribute:
                    data = await element.get_attribute(attribute)
                else:
                    data = await element.text_content()
                
                if data:
                    extracted_data.append(data.strip())
            
            return {
                "success": True,
                "data": extracted_data,
                "count": len(extracted_data),
                "selector": selector,
                "extraction_type": extraction_type
            }
            
        except Exception as e:
            logger.error(f"Element extraction failed for selector '{selector}': {e}")
            return {"success": False, "error": str(e), "selector": selector}
    
    async def get_page_content(self, page_id: Optional[str] = None) -> Dict[str, Any]:
        """Get the full page content."""
        try:
            page = self._get_current_page(page_id)
            
            # Get various content types
            text_content = await page.evaluate("() => document.body.innerText")
            html_content = await page.content()
            title = await page.title()
            url = page.url
            
            return {
                "success": True,
                "text": text_content,
                "html": html_content,
                "title": title,
                "url": url,
                "length": len(text_content)
            }
            
        except Exception as e:
            logger.error(f"Failed to get page content: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_dom_content(self, page_id: Optional[str] = None) -> Dict[str, Any]:
        """Get structured DOM content for analysis."""
        try:
            page = self._get_current_page(page_id)
            
            # Extract structured information
            dom_info = await page.evaluate("""
                () => {
                    const getElementInfo = (element) => {
                        return {
                            tag: element.tagName.toLowerCase(),
                            text: element.textContent?.trim() || '',
                            href: element.href || null,
                            class: element.className || '',
                            id: element.id || '',
                            type: element.type || null
                        };
                    };
                    
                    return {
                        title: document.title,
                        url: window.location.href,
                        links: Array.from(document.querySelectorAll('a[href]')).map(getElementInfo),
                        buttons: Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(getElementInfo),
                        forms: Array.from(document.querySelectorAll('form')).map(getElementInfo),
                        headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(getElementInfo),
                        navigation: Array.from(document.querySelectorAll('nav, .nav, .navbar, .navigation')).map(getElementInfo),
                        jobIndicators: Array.from(document.querySelectorAll('[class*="job"], [class*="career"], [id*="job"], [id*="career"]')).map(getElementInfo)
                    };
                }
            """)
            
            return {
                "success": True,
                "dom": dom_info,
                "analysis": await self._analyze_dom_for_jobs(dom_info)
            }
            
        except Exception as e:
            logger.error(f"Failed to get DOM content: {e}")
            return {"success": False, "error": str(e)}
    
    async def capture_screenshot(
        self,
        page_id: Optional[str] = None,
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """Capture a screenshot of the current page."""
        try:
            page = self._get_current_page(page_id)
            
            if not filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"screenshot_{timestamp}.png"
            
            screenshot_path = None
            if self.config.screenshots_dir:
                screenshot_path = self.config.screenshots_dir / filename
            else:
                screenshot_path = Path(filename)
            
            await page.screenshot(path=str(screenshot_path), full_page=True)
            
            return {
                "success": True,
                "screenshot_path": str(screenshot_path),
                "filename": filename
            }
            
        except Exception as e:
            logger.error(f"Screenshot capture failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def click_element(
        self,
        selector: str,
        page_id: Optional[str] = None,
        wait_for_navigation: bool = False
    ) -> Dict[str, Any]:
        """Click an element on the page."""
        try:
            page = self._get_current_page(page_id)
            
            # Wait for element to be visible and clickable
            await page.wait_for_selector(selector, state="visible")
            
            if wait_for_navigation:
                async with page.expect_navigation():
                    await page.click(selector)
            else:
                await page.click(selector)
            
            # Wait a moment for any dynamic content
            await asyncio.sleep(1)
            
            return {
                "success": True,
                "selector": selector,
                "current_url": page.url
            }
            
        except Exception as e:
            logger.error(f"Click failed for selector '{selector}': {e}")
            return {"success": False, "error": str(e), "selector": selector}
    
    async def wait_for_content(
        self,
        selector: Optional[str] = None,
        timeout: int = 10000,
        page_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Wait for specific content to appear."""
        try:
            page = self._get_current_page(page_id)
            
            if selector:
                await page.wait_for_selector(selector, timeout=timeout)
            else:
                await page.wait_for_load_state("networkidle", timeout=timeout)
            
            return {"success": True, "waited_for": selector or "network idle"}
            
        except Exception as e:
            logger.error(f"Wait for content failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def detect_dynamic_content(self, page_id: Optional[str] = None) -> bool:
        """Detect if page has dynamic content that loads after initial render."""
        try:
            page = self._get_current_page(page_id)
            
            # Check for common dynamic content indicators
            has_dynamic = await page.evaluate("""
                () => {
                    // Check for React/Vue/Angular
                    const hasReact = window.React || document.querySelector('[data-reactroot]');
                    const hasVue = window.Vue || document.querySelector('[data-v-]');
                    const hasAngular = window.angular || document.querySelector('[ng-app]');
                    
                    // Check for loading indicators
                    const hasLoadingIndicators = document.querySelectorAll(
                        '.loading, .spinner, .skeleton, [class*="load"]'
                    ).length > 0;
                    
                    // Check for AJAX/XHR activity
                    const hasXHRActivity = window.XMLHttpRequest && 
                        window.XMLHttpRequest.prototype.open;
                    
                    return hasReact || hasVue || hasAngular || hasLoadingIndicators || hasXHRActivity;
                }
            """)
            
            return has_dynamic
            
        except Exception as e:
            logger.error(f"Dynamic content detection failed: {e}")
            return False
    
    async def get_intercepted_api_calls(self) -> List[Dict[str, Any]]:
        """Get list of intercepted API calls that might contain job data."""
        job_related_calls = []
        
        for request in self.intercepted_requests:
            url = request.get("url", "").lower()
            if any(keyword in url for keyword in ["job", "career", "position", "vacancy", "api"]):
                job_related_calls.append(request)
        
        return job_related_calls
    
    def get_current_url(self, page_id: Optional[str] = None) -> Optional[str]:
        """Get current URL of the page."""
        try:
            page = self._get_current_page(page_id)
            return page.url
        except:
            return None
    
    def get_page_state(self, url: str) -> Optional[PageState]:
        """Get cached page state."""
        return self.page_states.get(url)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get browser controller statistics."""
        avg_load_time = (
            self.total_load_time / self.navigation_count
            if self.navigation_count > 0 else 0
        )
        
        return {
            "navigation_count": self.navigation_count,
            "avg_load_time": avg_load_time,
            "total_load_time": self.total_load_time,
            "active_pages": len(self.pages),
            "intercepted_requests": len(self.intercepted_requests),
            "cached_page_states": len(self.page_states)
        }
    
    # Private methods
    
    async def _get_or_create_page(self, page_id: Optional[str] = None) -> Page:
        """Get existing page or create new one."""
        if page_id and page_id in self.pages:
            return self.pages[page_id]
        
        if not page_id:
            page_id = "default"
        
        if len(self.pages) >= self.config.max_pages:
            # Close oldest page
            oldest_page_id = list(self.pages.keys())[0]
            await self.pages[oldest_page_id].close()
            del self.pages[oldest_page_id]
        
        page = await self.context.new_page()
        self.pages[page_id] = page
        self.current_page = page
        
        return page
    
    def _get_current_page(self, page_id: Optional[str] = None) -> Page:
        """Get current page or raise error."""
        if page_id and page_id in self.pages:
            return self.pages[page_id]
        
        if self.current_page:
            return self.current_page
        
        raise ValueError("No active page available")
    
    async def _setup_request_interception(self) -> None:
        """Setup request interception for monitoring."""
        async def handle_route(route: Route, request: Request) -> None:
            # Block unwanted resources
            if request.resource_type in self.config.block_resources:
                await route.abort()
                return
            
            # Log interesting requests
            if any(keyword in request.url.lower() for keyword in ["api", "job", "career"]):
                self.intercepted_requests.append({
                    "url": request.url,
                    "method": request.method,
                    "headers": dict(request.headers),
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            await route.continue_()
        
        await self.context.route("**/*", handle_route)
    
    async def _wait_for_dynamic_content(self, page: Page) -> None:
        """Wait for dynamic content to load."""
        try:
            # Wait for network to be relatively quiet
            await page.wait_for_load_state("networkidle", timeout=10000)
            
            # Additional wait for SPAs
            if await self.detect_dynamic_content():
                await asyncio.sleep(2)  # Give time for React/Vue/Angular to render
            
        except Exception as e:
            logger.debug(f"Dynamic content wait timeout: {e}")
    
    async def _analyze_page_state(self, page: Page, url: str) -> PageState:
        """Analyze current page state."""
        try:
            title = await page.title()
            content_type = "html"  # Default
            
            # Check for dynamic content
            has_dynamic = await self.detect_dynamic_content()
            
            # Look for job indicators
            job_indicators = await page.evaluate("""
                () => {
                    const indicators = [];
                    const text = document.body.textContent.toLowerCase();
                    
                    const jobKeywords = ['careers', 'jobs', 'positions', 'opportunities', 'hiring', 'join our team'];
                    jobKeywords.forEach(keyword => {
                        if (text.includes(keyword)) {
                            indicators.push(keyword);
                        }
                    });
                    
                    return indicators;
                }
            """)
            
            # Find navigation elements
            navigation_elements = await page.evaluate("""
                () => {
                    const navElements = [];
                    const selectors = ['nav a', '.nav a', '.navbar a', '.menu a', 'header a'];
                    
                    selectors.forEach(selector => {
                        document.querySelectorAll(selector).forEach(el => {
                            if (el.textContent && el.href) {
                                navElements.push({
                                    text: el.textContent.trim(),
                                    href: el.href,
                                    selector: selector
                                });
                            }
                        });
                    });
                    
                    return navElements;
                }
            """)
            
            return PageState(
                url=url,
                title=title,
                content_type=content_type,
                has_dynamic_content=has_dynamic,
                job_indicators=job_indicators,
                navigation_elements=navigation_elements
            )
            
        except Exception as e:
            logger.error(f"Page state analysis failed: {e}")
            return PageState(url=url, title="", content_type="unknown")
    
    async def _analyze_dom_for_jobs(self, dom_info: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze DOM structure for job-related content."""
        analysis = {
            "is_career_page": False,
            "job_listings_detected": False,
            "confidence_score": 0.0,
            "indicators": []
        }
        
        # Check for job-related indicators
        indicators = []
        
        # Check links for career/job keywords
        career_links = [
            link for link in dom_info.get("links", [])
            if any(keyword in link["text"].lower() for keyword in ["career", "job", "position", "hiring"])
        ]
        if career_links:
            indicators.append(f"Found {len(career_links)} career-related links")
        
        # Check for job listing structures
        job_elements = dom_info.get("jobIndicators", [])
        if job_elements:
            indicators.append(f"Found {len(job_elements)} job-related elements")
            analysis["job_listings_detected"] = True
        
        # Check headings for job content
        job_headings = [
            h for h in dom_info.get("headings", [])
            if any(keyword in h["text"].lower() for keyword in ["career", "job", "position", "team", "hiring"])
        ]
        if job_headings:
            indicators.append(f"Found {len(job_headings)} job-related headings")
        
        # Calculate confidence score
        confidence = 0.0
        if career_links:
            confidence += 0.3
        if job_elements:
            confidence += 0.4
        if job_headings:
            confidence += 0.3
        
        analysis["is_career_page"] = confidence > 0.5
        analysis["confidence_score"] = min(1.0, confidence)
        analysis["indicators"] = indicators
        
        return analysis
    
    async def _handle_common_overlays(self, page: Page) -> None:
        """Handle common popups, cookie banners, etc."""
        try:
            # Common overlay selectors
            overlay_selectors = [
                '[class*="cookie"] button',
                '[class*="banner"] button',
                '[class*="popup"] button[class*="close"]',
                '[class*="modal"] button[class*="close"]',
                'button[aria-label*="close"]',
                'button[aria-label*="dismiss"]'
            ]
            
            for selector in overlay_selectors:
                try:
                    elements = await page.query_selector_all(selector)
                    for element in elements:
                        text = (await element.text_content() or "").lower()
                        if any(word in text for word in ["accept", "ok", "close", "dismiss", "continue"]):
                            await element.click()
                            await asyncio.sleep(0.5)
                            break
                except:
                    continue  # Ignore individual selector failures
                    
        except Exception as e:
            logger.debug(f"Overlay handling failed: {e}")