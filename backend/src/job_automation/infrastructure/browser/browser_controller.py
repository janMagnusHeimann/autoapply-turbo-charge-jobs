"""
Browser Controller - Handles dynamic content rendering and intelligent page interaction
"""

import asyncio
import base64
from typing import Optional, Dict, Any
import logging

try:
    from playwright.async_api import async_playwright, Page, Browser
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

logger = logging.getLogger(__name__)

class BrowserController:
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
        self.available = PLAYWRIGHT_AVAILABLE
    
    async def initialize(self):
        """Initialize browser instance"""
        if not self.available:
            logger.warning("Playwright not available - browser functionality disabled")
            return False
        
        try:
            self._playwright = await async_playwright().start()
            self.browser = await self._playwright.chromium.launch(
                headless=self.headless,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-setuid-sandbox"
                ]
            )
            
            # Create context with stealth settings
            self.context = await self.browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            
            logger.info("✅ Browser controller initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize browser: {e}")
            self.available = False
            return False
    
    async def get_rendered_content(self, url: str) -> str:
        """Get fully rendered page content after JavaScript execution"""
        if not self.available or not self.context:
            logger.warning("Browser not available - returning empty content")
            return ""
        
        page = await self.context.new_page()
        
        try:
            logger.info(f"🌐 Loading dynamic content from {url}")
            
            # Navigate to page
            await page.goto(url, wait_until="networkidle", timeout=self.timeout)
            
            # Wait for common job container selectors
            await self._wait_for_job_content(page)
            
            # Handle infinite scroll if detected
            await self._handle_infinite_scroll(page)
            
            # Get final HTML content
            content = await page.content()
            
            logger.info(f"✅ Retrieved {len(content)} characters of rendered content")
            return content
            
        except Exception as e:
            logger.error(f"Failed to get rendered content: {e}")
            return ""
        finally:
            await page.close()
    
    async def capture_screenshot(self, url: str) -> str:
        """Capture screenshot for vision-enabled agents"""
        if not self.available or not self.context:
            logger.warning("Browser not available - cannot capture screenshot")
            return ""
        
        page = await self.context.new_page()
        
        try:
            logger.info(f"📸 Capturing screenshot of {url}")
            
            await page.goto(url, wait_until="networkidle", timeout=self.timeout)
            
            # Wait for content to load
            await self._wait_for_job_content(page)
            
            # Take screenshot
            screenshot_bytes = await page.screenshot(
                full_page=True,
                type="png"
            )
            
            # Convert to base64 for LLM vision
            screenshot_base64 = base64.b64encode(screenshot_bytes).decode()
            
            logger.info("✅ Screenshot captured successfully")
            return f"data:image/png;base64,{screenshot_base64}"
            
        except Exception as e:
            logger.error(f"Failed to capture screenshot: {e}")
            return ""
        finally:
            await page.close()
    
    async def _wait_for_job_content(self, page: Page):
        """Intelligently wait for job content to load"""
        # Common job container selectors
        selectors = [
            "[data-testid*='job']",
            "[class*='job-listing']",
            "[class*='job-item']",
            "[class*='position']",
            "[class*='opening']",
            "[id*='careers']",
            ".job-item",
            ".career-opportunity",
            ".position-item"
        ]
        
        # Try to wait for any job container
        for selector in selectors:
            try:
                await page.wait_for_selector(selector, timeout=5000)
                logger.info(f"Found job content with selector: {selector}")
                return
            except:
                continue
        
        # Fallback: wait for general content
        await page.wait_for_load_state("domcontentloaded")
        await asyncio.sleep(3)  # Give JS time to render
        logger.info("Used fallback wait for job content")
    
    async def _handle_infinite_scroll(self, page: Page):
        """Handle infinite scroll job pages"""
        try:
            previous_height = 0
            same_height_count = 0
            max_scrolls = 5  # Limit scrolling to avoid infinite loops
            
            for scroll_attempt in range(max_scrolls):
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
                await asyncio.sleep(2)
                
                # Check for "Load More" button
                load_more = await self._find_load_more_button(page)
                if load_more:
                    await load_more.click()
                    await asyncio.sleep(3)
            
            logger.info(f"Completed infinite scroll handling ({scroll_attempt + 1} scrolls)")
            
        except Exception as e:
            logger.warning(f"Error during infinite scroll handling: {e}")
    
    async def _find_load_more_button(self, page: Page):
        """Find and return load more button if exists"""
        button_texts = ["load more", "show more", "more jobs", "view more", "see all"]
        
        for text in button_texts:
            try:
                # Try various button selectors with the text
                selectors = [
                    f"button:has-text('{text}')",
                    f"a:has-text('{text}')",
                    f"[role='button']:has-text('{text}')"
                ]
                
                for selector in selectors:
                    button = await page.query_selector(selector)
                    if button and await button.is_visible():
                        logger.info(f"Found load more button: {text}")
                        return button
                        
            except Exception:
                continue
        
        return None
    
    async def cleanup(self):
        """Clean up browser resources"""
        try:
            if self.browser:
                await self.browser.close()
            if self._playwright:
                await self._playwright.stop()
            logger.info("✅ Browser cleanup completed")
        except Exception as e:
            logger.warning(f"Error during browser cleanup: {e}")

# Factory function for easy initialization
async def create_browser_controller(headless: bool = True, timeout: int = 30000) -> BrowserController:
    """Create and initialize browser controller"""
    controller = BrowserController(headless=headless, timeout=timeout)
    await controller.initialize()
    return controller 