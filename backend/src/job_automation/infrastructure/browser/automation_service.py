"""
Browser Automation Service

Handles JavaScript-heavy career pages using Playwright browser automation.
Provides intelligent fallback from static scraping to browser automation.
"""

import asyncio
import logging
from typing import Optional, Dict, Any
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
import os

logger = logging.getLogger(__name__)

class BrowserAutomationService:
    """Service for browser automation with intelligent fallbacks"""
    
    def __init__(self):
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.playwright = None
        self._is_initialized = False
        
    async def initialize(self):
        """Initialize browser instance"""
        if self._is_initialized:
            return
            
        try:
            logger.info("🚀 Initializing browser automation service")
            self.playwright = await async_playwright().start()
            
            # Launch browser with stealth settings
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            )
            
            # Create browser context with realistic settings
            self.context = await self.browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080},
                locale='en-US',
                timezone_id='America/New_York'
            )
            
            self._is_initialized = True
            logger.info("✅ Browser automation service initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize browser automation: {e}")
            raise
    
    async def scrape_with_js(self, url: str, timeout: int = 15000) -> Dict[str, Any]:
        """
        Scrape page content after JavaScript execution with network interception
        
        Args:
            url: URL to scrape
            timeout: Timeout in milliseconds
            
        Returns:
            Dictionary with success status, content, metadata, and intercepted job data
        """
        if not self._is_initialized:
            await self.initialize()
            
        page: Optional[Page] = None
        captured_job_data = []
        
        try:
            logger.info(f"🌐 Starting browser automation for {url}")
            
            # Create new page
            page = await self.context.new_page()
            
            # Set up network request interception to capture job API calls
            async def handle_response(response):
                try:
                    # Check if this looks like a job API response
                    if self._is_job_api_response(response):
                        logger.info(f"📡 Intercepted potential job API: {response.url}")
                        try:
                            json_data = await response.json()
                            if self._contains_job_data(json_data):
                                captured_job_data.append({
                                    'url': response.url,
                                    'data': json_data,
                                    'status': response.status
                                })
                                logger.info(f"✅ Captured job data from API: {len(str(json_data))} chars")
                        except Exception as e:
                            logger.debug(f"Failed to parse JSON from {response.url}: {e}")
                except Exception as e:
                    logger.debug(f"Error handling response {response.url}: {e}")
            
            # Listen for responses
            page.on("response", handle_response)
            
            # Set timeout
            page.set_default_timeout(timeout)
            
            # Navigate to page
            logger.info(f"📄 Navigating to {url}")
            response = await page.goto(url, wait_until='networkidle')
            
            if not response or response.status >= 400:
                return {
                    'success': False,
                    'error': f'Failed to load page (HTTP {response.status if response else "unknown"})',
                    'content': '',
                    'has_dynamic_content': False
                }
            
            # Handle common popups and cookie banners
            await self._handle_popups(page)
            
            # Wait for dynamic content to load
            dynamic_content_detected = await self._wait_for_dynamic_content(page)
            
            # Extract final page content
            content = await page.content()
            
            # Get page title for validation
            title = await page.title()
            
            logger.info(f"✅ Browser automation completed for {url} - content length: {len(content)}, dynamic: {dynamic_content_detected}, captured APIs: {len(captured_job_data)}")
            
            return {
                'success': True,
                'content': content,
                'title': title,
                'url': url,
                'status_code': response.status,
                'has_dynamic_content': dynamic_content_detected,
                'content_length': len(content),
                'captured_job_data': captured_job_data
            }
            
        except Exception as e:
            logger.error(f"❌ Browser automation failed for {url}: {e}")
            return {
                'success': False,
                'error': str(e),
                'content': '',
                'has_dynamic_content': False
            }
        finally:
            if page:
                await page.close()
    
    async def _handle_popups(self, page: Page):
        """Handle common popups like cookie banners, location requests, etc."""
        try:
            # Common cookie banner selectors
            cookie_selectors = [
                'button[id*="accept"]',
                'button[id*="cookie"]',
                'button[class*="accept"]',
                'button[class*="cookie"]',
                '[data-test*="accept"]',
                '[data-testid*="accept"]',
                'button:has-text("Accept")',
                'button:has-text("OK")',
                'button:has-text("Allow")',
                'button:has-text("Agree")'
            ]
            
            # Try to click cookie accept buttons
            for selector in cookie_selectors:
                try:
                    element = await page.wait_for_selector(selector, timeout=2000)
                    if element:
                        await element.click()
                        logger.info(f"🍪 Clicked cookie banner: {selector}")
                        break
                except:
                    continue
                    
            # Handle location permission popups (dismiss)
            try:
                await page.evaluate('navigator.permissions && navigator.permissions.query({name: "geolocation"})')
            except:
                pass
                
        except Exception as e:
            logger.debug(f"Popup handling error (non-critical): {e}")
    
    async def _wait_for_dynamic_content(self, page: Page) -> bool:
        """
        Wait for dynamic content to load and detect if page uses JavaScript
        
        Returns:
            True if dynamic content was detected, False otherwise
        """
        try:
            # Job listing selectors to wait for
            job_selectors = [
                '[class*="job"]',
                '[class*="position"]',
                '[class*="role"]',
                '[class*="opening"]',
                '[class*="career"]',
                '[data-test*="job"]',
                '[data-testid*="job"]',
                '.job-item',
                '.job-listing',
                '.position-item',
                '.career-item'
            ]
            
            # Check initial content
            initial_content_length = len(await page.content())
            
            # Wait a bit for any initial JavaScript to execute
            await page.wait_for_timeout(3000)
            
            # Try to find job-related content
            dynamic_content_found = False
            for selector in job_selectors:
                try:
                    elements = await page.wait_for_selector(selector, timeout=5000)
                    if elements:
                        logger.info(f"🎯 Found job content with selector: {selector}")
                        dynamic_content_found = True
                        break
                except:
                    continue
            
            # Check if "Load More" or pagination exists and handle it
            await self._handle_pagination(page)
            
            # Check final content length
            final_content_length = len(await page.content())
            content_growth = final_content_length > initial_content_length * 1.1
            
            return dynamic_content_found or content_growth
            
        except Exception as e:
            logger.debug(f"Dynamic content detection error: {e}")
            return False
    
    async def _handle_pagination(self, page: Page):
        """Handle pagination and 'Load More' buttons"""
        try:
            load_more_selectors = [
                'button:has-text("Load More")',
                'button:has-text("Show More")',
                'button:has-text("View More")',
                '[class*="load-more"]',
                '[class*="show-more"]',
                '[data-test*="load-more"]'
            ]
            
            for selector in load_more_selectors:
                try:
                    element = await page.wait_for_selector(selector, timeout=2000)
                    if element and await element.is_visible():
                        await element.click()
                        logger.info(f"🔄 Clicked load more: {selector}")
                        # Wait for new content to load
                        await page.wait_for_timeout(3000)
                        break
                except:
                    continue
                    
        except Exception as e:
            logger.debug(f"Pagination handling error: {e}")
    
    async def determine_if_needs_browser(self, static_content: str, url: str) -> bool:
        """
        Determine if a page needs browser automation based on static content analysis
        
        Args:
            static_content: Static HTML content
            url: Page URL
            
        Returns:
            True if browser automation is recommended
        """
        # Indicators that suggest JavaScript-heavy content
        js_indicators = [
            'ng-app',  # Angular
            'data-reactroot',  # React
            'data-react-helmet',  # React
            'vue-',  # Vue.js
            'v-app',  # Vue.js/Vuetify
            'data-vue-',  # Vue.js
            '__NEXT_DATA__',  # Next.js
            '__NUXT__',  # Nuxt.js
            'window.INITIAL_STATE',  # Redux/state management
            'loading spinner',
            'loading-spinner',
            'skeleton-loader',
            'data-loading',
            'job-loading',
            'infinite-scroll',
            'lazy-load'
        ]
        
        # Check for JavaScript indicators
        js_heavy = any(indicator in static_content.lower() for indicator in js_indicators)
        
        # Check if very little job content found
        job_keywords = ['job', 'position', 'role', 'career', 'opening', 'apply']
        job_mentions = sum(static_content.lower().count(keyword) for keyword in job_keywords)
        
        # Known JavaScript-heavy career sites
        js_heavy_domains = [
            'greenhouse.io',
            'lever.co',
            'workday.com',
            'smartrecruiters.com',
            'bamboohr.com',
            'jobvite.com',
            'n26.com',
            'google.com',
            'meta.com',
            'netflix.com'
        ]
        
        domain_needs_js = any(domain in url.lower() for domain in js_heavy_domains)
        
        needs_browser = js_heavy or job_mentions < 3 or domain_needs_js
        
        logger.info(f"🤖 Browser automation assessment for {url}: needed={needs_browser} (js_heavy={js_heavy}, job_mentions={job_mentions}, domain_js={domain_needs_js})")
        
        return needs_browser
    
    def _is_job_api_response(self, response) -> bool:
        """
        Check if a network response looks like a job API endpoint
        """
        try:
            url = response.url.lower()
            
            # Check URL patterns that typically contain job data
            job_api_patterns = [
                '/job',
                '/career',
                '/position',
                '/opening',
                '/vacancy',
                '/api/career',
                '/api/job',
                '/graphql',  # Many modern sites use GraphQL
                '/v1/job',
                '/v2/job',
                'greenhouse.io',
                'lever.co',
                'workday.com',
                'smartrecruiters.com'
            ]
            
            # Check if URL contains job-related keywords
            has_job_pattern = any(pattern in url for pattern in job_api_patterns)
            
            # Check response headers for JSON content
            content_type = response.headers.get('content-type', '').lower()
            is_json = 'application/json' in content_type
            
            # Check response status
            is_success = 200 <= response.status < 300
            
            return has_job_pattern and is_json and is_success
            
        except Exception as e:
            logger.debug(f"Error checking job API response: {e}")
            return False
    
    def _contains_job_data(self, json_data) -> bool:
        """
        Check if JSON data contains job listings
        """
        try:
            if not isinstance(json_data, (dict, list)):
                return False
            
            # Convert to string for pattern matching
            data_str = str(json_data).lower()
            
            # Look for job-related fields
            job_indicators = [
                '"title"',
                '"job_title"',
                '"position',
                '"department"',
                '"location"',
                '"apply_url"',
                '"job_id"',
                '"requirements"',
                '"description"',
                'senior',
                'junior',
                'engineer',
                'developer',
                'manager',
                'analyst'
            ]
            
            # Count how many job indicators are present
            indicator_count = sum(1 for indicator in job_indicators if indicator in data_str)
            
            # Also check for array structures that might contain jobs
            if isinstance(json_data, list) and len(json_data) > 0:
                indicator_count += 5  # Arrays are more likely to be job listings
            elif isinstance(json_data, dict):
                # Check for common job array keys
                job_array_keys = ['jobs', 'positions', 'openings', 'careers', 'vacancies', 'data']
                for key in job_array_keys:
                    if key in json_data and isinstance(json_data[key], list):
                        indicator_count += 10  # Very likely to be job data
            
            # Need at least 3 indicators to consider it job data
            is_job_data = indicator_count >= 3
            
            if is_job_data:
                logger.info(f"🎯 Job data detected: {indicator_count} indicators, data size: {len(data_str)} chars")
            
            return is_job_data
            
        except Exception as e:
            logger.debug(f"Error checking job data: {e}")
            return False
    
    async def cleanup(self):
        """Clean up browser resources"""
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            self._is_initialized = False
            logger.info("🧹 Browser automation service cleaned up")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

# Singleton instance
browser_automation_service = BrowserAutomationService()