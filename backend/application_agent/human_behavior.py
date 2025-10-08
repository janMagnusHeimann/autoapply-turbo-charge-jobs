"""
Human Behavior Simulation for Bot Detection Evasion

This module provides utilities to make browser automation behave more like a human user,
helping to avoid detection by anti-bot systems.
"""

import random
import asyncio
import logging
from typing import Optional, List, Tuple
from pathlib import Path
import json
from datetime import datetime

logger = logging.getLogger(__name__)


class HumanBehavior:
    """Simulates human-like behavior patterns for form filling"""
    
    # Realistic user agents from real browsers
    USER_AGENTS = [
        # Chrome Windows (most common)
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        
        # Chrome Mac
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        
        # Firefox Windows
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        
        # Firefox Mac
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.1) Gecko/20100101 Firefox/121.0',
        
        # Edge
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        
        # Safari
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ]
    
    # Common viewport sizes
    VIEWPORTS = [
        {'width': 1920, 'height': 1080},  # Full HD (most common)
        {'width': 1680, 'height': 1050},  # MacBook Pro 15"
        {'width': 1440, 'height': 900},   # MacBook Air
        {'width': 1536, 'height': 864},   # Common laptop
        {'width': 1366, 'height': 768},   # Popular laptop
        {'width': 2560, 'height': 1440},  # 2K display
    ]
    
    # Typing patterns
    TYPING_PATTERNS = {
        'fast': {'min_delay': 30, 'max_delay': 80, 'typo_rate': 0.01},
        'normal': {'min_delay': 50, 'max_delay': 150, 'typo_rate': 0.02},
        'slow': {'min_delay': 100, 'max_delay': 250, 'typo_rate': 0.03},
        'careful': {'min_delay': 150, 'max_delay': 300, 'typo_rate': 0.005}
    }
    
    @staticmethod
    def get_random_user_agent() -> str:
        """Get a random realistic user agent"""
        return random.choice(HumanBehavior.USER_AGENTS)
    
    @staticmethod
    def get_random_viewport() -> dict:
        """Get a random common viewport size"""
        return random.choice(HumanBehavior.VIEWPORTS)
    
    @staticmethod
    async def human_type(element, text: str, pattern: str = 'normal'):
        """
        Type text like a human with variable speed and occasional mistakes
        
        Args:
            element: Playwright element to type in
            text: Text to type
            pattern: Typing pattern ('fast', 'normal', 'slow', 'careful')
        """
        if not text:
            return
        
        typing_config = HumanBehavior.TYPING_PATTERNS.get(pattern, HumanBehavior.TYPING_PATTERNS['normal'])
        min_delay = typing_config['min_delay'] / 1000  # Convert to seconds
        max_delay = typing_config['max_delay'] / 1000
        typo_rate = typing_config['typo_rate']
        
        for i, char in enumerate(text):
            # Variable typing speed
            delay = random.uniform(min_delay, max_delay)
            
            # Occasional typo (not on first or last character)
            if i > 0 and i < len(text) - 1 and random.random() < typo_rate and char.isalpha():
                # Type wrong character
                wrong_char = random.choice('abcdefghijklmnopqrstuvwxyz')
                await element.type(wrong_char)
                await asyncio.sleep(random.uniform(0.2, 0.5))  # Realize mistake
                
                # Correct the typo
                await element.press('Backspace')
                await asyncio.sleep(random.uniform(0.1, 0.2))
            
            # Type the correct character
            await element.type(char)
            await asyncio.sleep(delay)
            
            # Occasional pause (thinking/reading)
            if random.random() < 0.1:  # 10% chance
                await asyncio.sleep(random.uniform(0.5, 2.0))
            
            # Longer pause after punctuation
            if char in '.!?,':
                await asyncio.sleep(random.uniform(0.3, 0.8))
    
    @staticmethod
    async def human_click(page, element):
        """
        Click element with human-like mouse movement
        
        Args:
            page: Playwright page object
            element: Element to click
        """
        try:
            # Get element position
            box = await element.bounding_box()
            if not box:
                # Fallback to simple click if we can't get position
                await element.click()
                return
            
            # Calculate random point within element (not exactly center)
            x = box['x'] + random.uniform(box['width'] * 0.3, box['width'] * 0.7)
            y = box['y'] + random.uniform(box['height'] * 0.3, box['height'] * 0.7)
            
            # Move mouse with multiple steps (natural curve)
            steps = random.randint(3, 10)
            await page.mouse.move(x, y, steps=steps)
            
            # Small pause before click (human reaction time)
            await asyncio.sleep(random.uniform(0.1, 0.3))
            
            # Click
            await page.mouse.click(x, y)
            
        except Exception as e:
            logger.warning(f"Human click failed, using simple click: {e}")
            await element.click()
    
    @staticmethod
    async def random_pause(min_seconds: float = 0.5, max_seconds: float = 3.0):
        """
        Human-like pause between actions
        
        Args:
            min_seconds: Minimum pause duration
            max_seconds: Maximum pause duration
        """
        await asyncio.sleep(random.uniform(min_seconds, max_seconds))
    
    @staticmethod
    async def scroll_naturally(page, direction: str = 'down', amount: Optional[int] = None):
        """
        Scroll page naturally like a human reading
        
        Args:
            page: Playwright page object
            direction: 'up' or 'down'
            amount: Scroll amount in pixels (random if not specified)
        """
        if amount is None:
            amount = random.randint(100, 500)
        
        if direction == 'up':
            amount = -amount
        
        # Scroll in small increments
        increments = random.randint(3, 7)
        increment_size = amount // increments
        
        for _ in range(increments):
            scroll_amount = increment_size + random.randint(-20, 20)
            await page.evaluate(f'window.scrollBy(0, {scroll_amount})')
            await asyncio.sleep(random.uniform(0.05, 0.15))
    
    @staticmethod
    async def random_mouse_movement(page, movements: int = None):
        """
        Move mouse randomly on the page
        
        Args:
            page: Playwright page object
            movements: Number of movements (random if not specified)
        """
        if movements is None:
            movements = random.randint(2, 5)
        
        viewport = page.viewport_size
        if not viewport:
            return
        
        for _ in range(movements):
            x = random.randint(100, viewport['width'] - 100)
            y = random.randint(100, viewport['height'] - 100)
            steps = random.randint(5, 15)
            
            await page.mouse.move(x, y, steps=steps)
            await asyncio.sleep(random.uniform(0.2, 0.5))
    
    @staticmethod
    async def focus_blur_pattern(page, element):
        """
        Simulate natural focus/blur pattern when filling forms
        
        Args:
            page: Playwright page object
            element: Form element
        """
        # Click to focus
        await HumanBehavior.human_click(page, element)
        await HumanBehavior.random_pause(0.2, 0.5)
        
        # Sometimes click away and back (like thinking)
        if random.random() < 0.2:  # 20% chance
            # Click somewhere else
            await page.mouse.click(random.randint(100, 300), random.randint(100, 300))
            await HumanBehavior.random_pause(0.5, 1.5)
            # Click back
            await HumanBehavior.human_click(page, element)


class DetectionAvoidance:
    """Utilities to detect and avoid bot detection mechanisms"""
    
    # Common bot detection indicators
    DETECTION_KEYWORDS = [
        'captcha', 'recaptcha', 'hcaptcha', 'funcaptcha',
        'challenge', "verify you're human", "verify your identity",
        'suspicious activity', 'automated', 'blocked', 'denied',
        'rate limit', 'too many requests', 'please wait',
        'cloudflare', 'security check', 'checking your browser',
        'please complete the security check', 'one more step'
    ]
    
    @staticmethod
    async def check_for_detection(page) -> Tuple[bool, Optional[str]]:
        """
        Check if bot detection is triggered
        
        Returns:
            Tuple of (detected: bool, detection_type: str or None)
        """
        try:
            # Check page content
            page_content = await page.content()
            page_text = page_content.lower()
            
            # Check URL for common detection patterns
            current_url = page.url.lower()
            if any(keyword in current_url for keyword in ['challenge', 'captcha', 'verify']):
                return True, 'url_detection'
            
            # Check page content for detection signs
            for keyword in DetectionAvoidance.DETECTION_KEYWORDS:
                if keyword in page_text:
                    logger.warning(f"Possible bot detection: {keyword}")
                    return True, keyword
            
            # Check for iframes that might contain captchas
            iframes = await page.query_selector_all('iframe')
            for iframe in iframes:
                src = await iframe.get_attribute('src') or ''
                if any(captcha in src.lower() for captcha in ['recaptcha', 'hcaptcha', 'captcha']):
                    return True, 'captcha_iframe'
            
            return False, None
            
        except Exception as e:
            logger.error(f"Error checking for detection: {e}")
            return False, None
    
    @staticmethod
    async def avoid_detection_patterns(page):
        """
        Perform actions to avoid triggering detection
        
        Args:
            page: Playwright page object
        """
        # Wait before any action (don't be too fast)
        await HumanBehavior.random_pause(2, 5)
        
        # Scroll and read the page
        await HumanBehavior.scroll_naturally(page, 'down')
        await HumanBehavior.random_pause(1, 3)
        
        # Move mouse around naturally
        await HumanBehavior.random_mouse_movement(page, random.randint(3, 6))
        
        # Sometimes scroll back up
        if random.random() < 0.3:
            await HumanBehavior.scroll_naturally(page, 'up', random.randint(50, 200))
            await HumanBehavior.random_pause(0.5, 1.5)
    
    @staticmethod
    async def handle_rate_limiting():
        """
        Handle rate limiting by waiting with exponential backoff
        
        Returns:
            Wait time in seconds
        """
        # Exponential backoff with jitter
        base_wait = 30  # Base wait time in seconds
        jitter = random.uniform(0.8, 1.2)
        wait_time = base_wait * jitter
        
        logger.info(f"Rate limited. Waiting {wait_time:.1f} seconds...")
        await asyncio.sleep(wait_time)
        return wait_time


class BrowserProfileManager:
    """Manages browser profiles for persistence across sessions"""
    
    def __init__(self, profile_dir: Path = None):
        """
        Initialize browser profile manager
        
        Args:
            profile_dir: Directory to store browser profiles
        """
        self.profile_dir = profile_dir or Path("browser_profiles")
        self.profile_dir.mkdir(exist_ok=True)
    
    async def get_profile_path(self, user_id: str) -> Path:
        """
        Get profile path for a user
        
        Args:
            user_id: User identifier
            
        Returns:
            Path to profile JSON file
        """
        return self.profile_dir / f"user_{user_id}.json"
    
    async def load_profile(self, user_id: str) -> Optional[dict]:
        """
        Load existing browser profile
        
        Args:
            user_id: User identifier
            
        Returns:
            Profile data or None if not exists
        """
        profile_path = await self.get_profile_path(user_id)
        
        if profile_path.exists():
            try:
                with open(profile_path, 'r') as f:
                    profile_data = json.load(f)
                logger.info(f"Loaded existing browser profile for user {user_id}")
                return profile_data
            except Exception as e:
                logger.error(f"Failed to load profile: {e}")
                return None
        
        return None
    
    async def save_profile(self, context, user_id: str):
        """
        Save browser profile after use
        
        Args:
            context: Playwright browser context
            user_id: User identifier
        """
        try:
            profile_path = await self.get_profile_path(user_id)
            storage_state = await context.storage_state()
            
            # Add metadata
            storage_state['metadata'] = {
                'user_id': user_id,
                'last_used': datetime.utcnow().isoformat(),
                'user_agent': context._options.get('user_agent', '')
            }
            
            with open(profile_path, 'w') as f:
                json.dump(storage_state, f, indent=2)
            
            logger.info(f"Saved browser profile for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to save profile: {e}")
    
    def cleanup_old_profiles(self, days: int = 30):
        """
        Clean up profiles older than specified days
        
        Args:
            days: Number of days to keep profiles
        """
        from datetime import timedelta
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        for profile_path in self.profile_dir.glob("user_*.json"):
            try:
                with open(profile_path, 'r') as f:
                    profile_data = json.load(f)
                
                metadata = profile_data.get('metadata', {})
                last_used_str = metadata.get('last_used')
                
                if last_used_str:
                    last_used = datetime.fromisoformat(last_used_str)
                    if last_used < cutoff_date:
                        profile_path.unlink()
                        logger.info(f"Deleted old profile: {profile_path.name}")
                        
            except Exception as e:
                logger.error(f"Error processing profile {profile_path}: {e}")