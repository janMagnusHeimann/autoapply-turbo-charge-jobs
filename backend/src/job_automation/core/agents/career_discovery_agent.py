"""
Career Discovery Agent - Discovers career/jobs pages on company websites
"""

import re
import aiohttp
from typing import Dict, Any, List
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from .base_agent import BaseAgent
import logging

logger = logging.getLogger(__name__)

class CareerDiscoveryAgent(BaseAgent):
    """
    Discovers career/jobs pages on company websites
    Uses AI to intelligently find career URLs
    """
    
    def __init__(self, **kwargs):
        super().__init__(name="CareerDiscoveryAgent", **kwargs)
        self.common_patterns = [
            "/careers", "/jobs", "/join-us", "/work-with-us",
            "/opportunities", "/openings", "/employment", "/hiring",
            "/careers/", "/jobs/", "/join/", "/work/"
        ]
    
    async def observe(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Observe company website structure"""
        company_name = task["company_name"]
        website_url = task["website_url"]
        
        # Normalize URL
        if not website_url.startswith(('http://', 'https://')):
            website_url = f"https://{website_url}"
        
        # Get website content
        content, links = await self._fetch_website_content(website_url)
        
        return {
            "company": company_name,
            "url": website_url,
            "navigation_links": links,
            "page_content": content[:5000],  # First 5000 chars
            "base_domain": urlparse(website_url).netloc
        }
    
    async def orient(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze website to find career page patterns"""
        base_url = observation["url"]
        links = observation["navigation_links"]
        
        # Check common patterns first
        pattern_matches = self._check_common_patterns(links, base_url)
        
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
            "candidates": ai_analysis.get("urls", []),
            "confidence": ai_analysis.get("confidence", 0.5)
        }
    
    async def decide(self, orientation: Dict[str, Any]) -> Dict[str, Any]:
        """Decide which career page URL to use"""
        candidates = orientation["candidates"]
        
        if not candidates:
            return {
                "action": "fallback_search",
                "reason": "No career links found in main navigation"
            }
        
        # Rank candidates by confidence
        best_candidate = max(candidates, key=lambda x: x.get("score", 0))
        
        return {
            "action": "return_career_url",
            "url": best_candidate["url"],
            "confidence": orientation["confidence"]
        }
    
    async def act(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Return discovered career page URL"""
        if decision["action"] == "fallback_search":
            # Try fallback patterns
            base_url = self.state.observation["url"]
            fallback_urls = self._generate_fallback_urls(base_url)
            
            for url in fallback_urls:
                if await self._verify_career_page(url):
                    return {
                        "status": "success",
                        "career_page_url": url,
                        "confidence": 0.7,
                        "discovery_method": "fallback_pattern"
                    }
            
            return {
                "status": "error",
                "message": "No career page found",
                "company": self.state.observation["company"]
            }
        
        return {
            "status": "success",
            "career_page_url": decision["url"],
            "confidence": decision["confidence"],
            "discovery_method": self.state.orientation["strategy"]
        }
    
    async def _fetch_website_content(self, url: str) -> tuple[str, List[Dict[str, str]]]:
        """Fetch website content and extract navigation links"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    if response.status != 200:
                        return "", []
                    
                    content = await response.text()
                    soup = BeautifulSoup(content, 'html.parser')
                    
                    # Extract navigation links
                    links = []
                    for link in soup.find_all('a', href=True):
                        href = link['href']
                        text = link.get_text(strip=True).lower()
                        
                        # Convert relative URLs to absolute
                        if href.startswith('/'):
                            href = urljoin(url, href)
                        
                        links.append({
                            "url": href,
                            "text": text,
                            "title": link.get('title', '').lower()
                        })
                    
                    return content, links
                    
        except Exception as e:
            logger.error(f"Failed to fetch {url}: {e}")
            return "", []
    
    def _check_common_patterns(self, links: List[Dict[str, str]], base_url: str) -> List[Dict[str, Any]]:
        """Check for common career page patterns"""
        candidates = []
        
        for link in links:
            href = link["url"]
            text = link["text"]
            
            # Check URL patterns
            for pattern in self.common_patterns:
                if pattern in href.lower():
                    candidates.append({
                        "url": href,
                        "score": 0.9,
                        "reason": f"URL contains '{pattern}'"
                    })
                    break
            
            # Check link text
            career_keywords = ["career", "job", "work", "join", "hiring", "employment"]
            if any(keyword in text for keyword in career_keywords):
                candidates.append({
                    "url": href,
                    "score": 0.8,
                    "reason": f"Link text contains career keyword: '{text}'"
                })
        
        # Remove duplicates and sort by score
        seen_urls = set()
        unique_candidates = []
        for candidate in candidates:
            if candidate["url"] not in seen_urls:
                seen_urls.add(candidate["url"])
                unique_candidates.append(candidate)
        
        return sorted(unique_candidates, key=lambda x: x["score"], reverse=True)
    
    async def _ai_analyze_navigation(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Use AI to analyze navigation for career pages"""
        if not self.llm_client:
            return {"urls": [], "confidence": 0.0}
        
        try:
            # Build links context
            links_text = "\n".join([
                f"- {link['text']} -> {link['url']}" 
                for link in observation["navigation_links"][:20]  # Limit to avoid token overflow
            ])
            
            prompt = f"""
            Company: {observation['company']}
            Website: {observation['url']}
            
            Navigation links found:
            {links_text}
            
            Task: Find the most likely career/jobs page URL from these links.
            
            Look for:
            1. URLs containing words like: careers, jobs, hiring, employment, work, join
            2. Link text mentioning: careers, jobs, work with us, join us, hiring
            
            Return your analysis in this format:
            CAREER_URL: [most likely career page URL]
            CONFIDENCE: [0.0-1.0]
            REASON: [brief explanation]
            
            If no clear career page found, return:
            CAREER_URL: none
            CONFIDENCE: 0.0
            REASON: No career page indicators found
            """
            
            response = await self.llm_client.generate(prompt)
            
            # Parse response
            lines = response.strip().split('\n')
            result = {"urls": [], "confidence": 0.0}
            
            for line in lines:
                if line.startswith('CAREER_URL:'):
                    url = line.split(':', 1)[1].strip()
                    if url != "none":
                        result["urls"] = [{"url": url, "score": 0.8, "reason": "AI analysis"}]
                elif line.startswith('CONFIDENCE:'):
                    result["confidence"] = float(line.split(':', 1)[1].strip())
            
            return result
            
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return {"urls": [], "confidence": 0.0}
    
    def _generate_fallback_urls(self, base_url: str) -> List[str]:
        """Generate fallback career page URLs"""
        parsed = urlparse(base_url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        
        fallback_paths = [
            "/careers", "/jobs", "/careers/", "/jobs/", 
            "/join-us", "/work-with-us", "/hiring",
            "/en/careers", "/en/jobs"
        ]
        
        return [urljoin(base, path) for path in fallback_paths]
    
    async def _verify_career_page(self, url: str) -> bool:
        """Quick verification that URL exists and contains career content"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=5) as response:
                    if response.status == 200:
                        content = await response.text()
                        # Basic content check
                        content_lower = content.lower()
                        career_indicators = ["job", "position", "career", "opening", "role", "hiring"]
                        return any(indicator in content_lower for indicator in career_indicators)
            return False
        except:
            return False 