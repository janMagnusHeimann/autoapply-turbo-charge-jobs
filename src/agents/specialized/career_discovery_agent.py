"""
Career Discovery Agent - Specialized agent for finding career pages on company websites.
Uses intelligent navigation and pattern matching to locate job opportunities.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional, Set
from urllib.parse import urljoin, urlparse
import re
import json

from ..core.base_agent import BaseAgent, AgentAction, AgentObservation, ActionType
from ..browser.dom_processor import DOMProcessor, PageAnalysis

logger = logging.getLogger(__name__)


class CareerDiscoveryAgent(BaseAgent):
    """
    Specialized agent for discovering career pages on company websites.
    
    Capabilities:
    - Pattern-based URL discovery
    - Intelligent site navigation 
    - Career page verification
    - Multi-strategy exploration
    """
    
    def __init__(self, llm_client, browser_controller, config=None):
        super().__init__(
            name="CareerDiscoveryAgent",
            llm_client=llm_client,
            browser_controller=browser_controller,
            config=config
        )
        
        self.dom_processor = DOMProcessor()
        
        # Common career page patterns
        self.career_url_patterns = [
            '/careers', '/career', '/jobs', '/job', '/positions', '/work-with-us',
            '/join-us', '/join', '/team', '/hiring', '/opportunities',
            '/employment', '/openings', '/vacancies', '/apply'
        ]
        
        # Alternative patterns for different sites
        self.alternative_patterns = [
            '/about/careers', '/company/careers', '/company/jobs',
            '/work/careers', '/people/careers', '/life/careers',
            '/culture/careers', '/talent/careers'
        ]
        
        # Navigation keywords to look for
        self.navigation_keywords = [
            'careers', 'jobs', 'positions', 'work with us', 'join us',
            'join our team', 'hiring', 'opportunities', 'employment',
            'talent', 'team', 'life at', 'culture'
        ]
        
        # Discovered career pages cache
        self.discovered_pages: Dict[str, Dict[str, Any]] = {}
        
    async def discover_career_pages(
        self,
        company_website: str,
        company_name: Optional[str] = None,
        max_depth: int = 2
    ) -> Dict[str, Any]:
        """
        Main method to discover career pages for a company.
        
        Args:
            company_website: Base website URL
            company_name: Optional company name for context
            max_depth: Maximum navigation depth
            
        Returns:
            Discovery results with found career pages
        """
        task = {
            'description': f'Discover career pages for {company_name or company_website}',
            'company_website': company_website,
            'company_name': company_name,
            'max_depth': max_depth,
            'strategy': 'comprehensive'
        }
        
        return await self.execute_task(task)
    
    async def _observe(self) -> AgentObservation:
        """Observe the current state of the website."""
        try:
            website = self.current_task['company_website']
            
            # Record visited URL
            current_url = self.browser_controller.get_current_url()
            if current_url:
                visited = self.memory.working_memory.get('visited_urls', set())
                visited.add(current_url)
                self.memory.update_working_memory('visited_urls', visited)

            # If not already on the website, navigate to it
            if not current_url or not self._is_same_domain(current_url, website):
                nav_result = await self.browser_controller.navigate(website)
                if not nav_result.get('success'):
                    return AgentObservation(
                        content={'error': f'Failed to navigate to {website}'},
                        observation_type='navigation_error'
                    )
            
            # Get current page content and structure
            dom_content = await self.browser_controller.get_dom_content()
            page_content = await self.browser_controller.get_page_content()
            
            # Analyze page state
            current_url = self.browser_controller.get_current_url()
            page_analysis = self.dom_processor.analyze_page(dom_content['dom'], current_url)
            
            return AgentObservation(
                content={
                    'current_url': current_url,
                    'page_content': page_content,
                    'dom_content': dom_content['dom'],
                    'page_analysis': page_analysis,
                    'website_root': website
                },
                observation_type='page_state',
                confidence=1.0
            )
            
        except Exception as e:
            logger.error(f"Observation failed: {e}")
            return AgentObservation(
                content={'error': str(e)},
                observation_type='error',
                confidence=0.0
            )
    
    async def _orient(self, observation: AgentObservation) -> Dict[str, Any]:
        """Analyze the observation and determine the situation."""
        content = observation.content
        
        if 'error' in content:
            return {
                'situation': 'error',
                'error': content['error'],
                'next_strategy': 'retry_or_fail'
            }
        
        current_url = content['current_url']
        page_analysis: PageAnalysis = content['page_analysis']
        dom_content = content['dom_content']
        
        # Determine current situation
        if page_analysis.is_career_page:
            situation = 'found_career_page'
            context = {
                'career_page_url': current_url,
                'confidence': page_analysis.confidence_score,
                'job_count': page_analysis.job_count,
                'extraction_strategy': page_analysis.extraction_strategy
            }
        else:
            situation = 'exploring_website'
            
            # Find potential career page links
            career_links = self.dom_processor.extract_career_page_links(
                dom_content, content['website_root']
            )
            
            context = {
                'career_links_found': len(career_links),
                'career_links': career_links,
                'navigation_hints': page_analysis.navigation_hints,
                'tried_direct_patterns': self._get_tried_patterns(),
                'current_depth': self._get_current_depth()
            }
        
        # Store in memory for context
        self.memory.update_working_memory('current_situation', situation)
        self.memory.update_working_memory('page_analysis', page_analysis)
        self.memory.update_working_memory('context', context)
        
        return {
            'situation': situation,
            'context': context,
            'page_analysis': page_analysis,
            'current_url': current_url
        }
    
    async def _decide(self, context: Dict[str, Any]) -> AgentAction:
        """Decide on the next action based on the current situation."""
        situation = context['situation']
        
        if situation == 'error':
            return AgentAction(
                action_type=ActionType.CUSTOM,
                parameters={'action': 'handle_error', 'error': context['error']},
                confidence=1.0,
                reasoning="Handle error condition"
            )
        
        elif situation == 'found_career_page':
            # We found a career page, verify and potentially explore further
            return AgentAction(
                action_type=ActionType.CUSTOM,
                parameters={'action': 'verify_career_page', 'url': context['context']['career_page_url']},
                confidence=context['context']['confidence'],
                reasoning=f"Verify career page with confidence {context['context']['confidence']}"
            )
        
        elif situation == 'exploring_website':
            # Decide on exploration strategy
            career_context = context['context']
            
            if career_context['career_links_found'] > 0:
                # Filter out already visited URLs
                visited_urls = self.memory.working_memory.get('visited_urls', set())
                unvisited_links = [
                    link for link in career_context['career_links']
                    if link.get('url') and link['url'] not in visited_urls
                ]
                
                if unvisited_links:
                    # Navigate to the most promising career link
                    best_link = unvisited_links[0]
                    return AgentAction(
                        action_type=ActionType.NAVIGATE,
                        parameters={'url': best_link['url']},
                        confidence=best_link.get('relevance_score', 0.5),
                        reasoning=f"Navigate to promising unvisited career link: {best_link['text']}"
                    )
            
            # If no unvisited links, proceed to other strategies
            if not career_context.get('tried_direct_patterns', []):
                # Try direct URL patterns
                return AgentAction(
                    action_type=ActionType.CUSTOM,
                    parameters={'action': 'try_direct_patterns'},
                    confidence=0.7,
                    reasoning="Try direct career URL patterns"
                )
            
            else:
                # Use AI to analyze page for hidden career links
                return AgentAction(
                    action_type=ActionType.CUSTOM,
                    parameters={'action': 'ai_analysis'},
                    confidence=0.5,
                    reasoning="Use AI to find hidden career navigation"
                )
        
        else:
            # Fallback action
            return AgentAction(
                action_type=ActionType.CUSTOM,
                parameters={'action': 'exploration_complete'},
                confidence=0.0,
                reasoning="No more exploration strategies available"
            )
    
    async def _handle_custom_action(self, action: AgentAction) -> Dict[str, Any]:
        """Handle custom actions specific to career discovery."""
        action_name = action.parameters.get('action')
        
        if action_name == 'handle_error':
            return await self._handle_error_action(action)
        elif action_name == 'verify_career_page':
            return await self._verify_career_page(action)
        elif action_name == 'try_direct_patterns':
            return await self._try_direct_patterns()
        elif action_name == 'ai_analysis':
            return await self._ai_analysis_for_career_links()
        elif action_name == 'exploration_complete':
            return await self._complete_exploration()
        else:
            return {"success": False, "error": f"Unknown action: {action_name}"}
    
    async def _handle_error_action(self, action: AgentAction) -> Dict[str, Any]:
        """Handle error conditions."""
        error = action.parameters.get('error', 'Unknown error')
        
        # Log the error and try alternative approach
        logger.warning(f"Career discovery error: {error}")
        
        # Try alternative patterns or give up
        tried_patterns = self._get_tried_patterns()
        if len(tried_patterns) < len(self.career_url_patterns):
            return {"success": True, "next_action": "try_alternative_patterns"}
        
        return {"success": False, "error": error, "final": True}
    
    async def _verify_career_page(self, action: AgentAction) -> Dict[str, Any]:
        """Verify that we found a legitimate career page."""
        url = action.parameters.get('url')
        
        try:
            # Get page content for verification
            page_content = await self.browser_controller.get_page_content()
            dom_content = await self.browser_controller.get_dom_content()
            
            # Re-analyze with more thorough verification
            page_analysis = self.dom_processor.analyze_page(dom_content['dom'], url)
            
            # Store the discovered career page
            self.discovered_pages[url] = {
                'url': url,
                'confidence': page_analysis.confidence_score,
                'is_career_page': page_analysis.is_career_page,
                'is_job_listing': page_analysis.is_job_listing,
                'job_count': page_analysis.job_count,
                'page_analysis': page_analysis,
                'discovered_at': self.start_time.isoformat() if self.start_time else None
            }
            
            # Check if we should explore further (pagination, other sections)
            should_explore_more = (
                page_analysis.job_count > 0 and
                len(page_analysis.navigation_hints) > 0 and
                self._get_current_depth() < self.current_task.get('max_depth', 2)
            )
            
            return {
                "success": True,
                "career_page_verified": True,
                "url": url,
                "confidence": page_analysis.confidence_score,
                "job_count": page_analysis.job_count,
                "should_explore_more": should_explore_more,
                "navigation_hints": page_analysis.navigation_hints
            }
            
        except Exception as e:
            logger.error(f"Career page verification failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _try_direct_patterns(self) -> Dict[str, Any]:
        """Try direct URL patterns for career pages."""
        website_root = self.current_task['company_website']
        tried_patterns = self._get_tried_patterns()
        
        # Try patterns we haven't tried yet
        patterns_to_try = [
            pattern for pattern in self.career_url_patterns
            if pattern not in tried_patterns
        ]
        
        if not patterns_to_try:
            # Try alternative patterns
            patterns_to_try = [
                pattern for pattern in self.alternative_patterns
                if pattern not in tried_patterns
            ]
        
        if not patterns_to_try:
            return {"success": False, "message": "All direct patterns exhausted"}
        
        # Try the first unused pattern
        pattern = patterns_to_try[0]
        career_url = urljoin(website_root, pattern)
        
        # Store that we tried this pattern
        self._add_tried_pattern(pattern)
        
        try:
            # Navigate to the career URL
            nav_result = await self.browser_controller.navigate(career_url)
            
            if nav_result.get('success'):
                # Check if we got a valid page (not 404)
                page_content = await self.browser_controller.get_page_content()
                
                # Simple check for 404 or error page
                if self._is_error_page(page_content):
                    return {
                        "success": False,
                        "message": f"Pattern {pattern} led to error page",
                        "pattern_tried": pattern,
                        "try_next": True
                    }
                
                return {
                    "success": True,
                    "pattern_found": pattern,
                    "url": career_url,
                    "message": f"Successfully navigated to {career_url}"
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to navigate to {career_url}",
                    "pattern_tried": pattern,
                    "try_next": True
                }
                
        except Exception as e:
            logger.error(f"Direct pattern navigation failed for {pattern}: {e}")
            return {
                "success": False,
                "error": str(e),
                "pattern_tried": pattern,
                "try_next": True
            }
    
    async def _ai_analysis_for_career_links(self) -> Dict[str, Any]:
        """Use AI to analyze page content for hidden career links."""
        try:
            # Get current page content
            page_content = await self.browser_controller.get_page_content()
            dom_content = await self.browser_controller.get_dom_content()
            
            # Prepare content for AI analysis
            analysis_content = {
                'page_text': page_content.get('text', '')[:4000],  # Limit for token usage
                'navigation_elements': dom_content['dom'].get('links', [])[:50],  # Limit elements
                'headings': dom_content['dom'].get('headings', [])[:20]
            }
            
            # Create AI prompt for career link discovery
            prompt = self._create_career_discovery_prompt(analysis_content)
            
            # Call LLM for analysis
            ai_response = await self._call_llm([
                {"role": "user", "content": prompt}
            ], model="gpt-4o-mini", temperature=0.1)
            
            # Parse AI response to extract actionable recommendations
            recommendations = self._parse_ai_career_recommendations(ai_response)
            
            return {
                "success": True,
                "ai_analysis_complete": True,
                "recommendations": recommendations,
                "has_suggestions": len(recommendations) > 0
            }
            
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _complete_exploration(self) -> Dict[str, Any]:
        """Complete the career page exploration."""
        discovered_count = len(self.discovered_pages)
        
        # Compile final results
        results = {
            "exploration_complete": True,
            "career_pages_found": discovered_count,
            "discovered_pages": list(self.discovered_pages.values()),
            "total_actions": len(self.actions_taken),
            "exploration_time": (self.memory.working_memory.get('exploration_time', 0))
        }
        
        if discovered_count > 0:
            # Find the best career page
            best_page = max(
                self.discovered_pages.values(),
                key=lambda x: x['confidence']
            )
            results["best_career_page"] = best_page
        
        return {"success": True, "final_results": results}
    
    def _is_task_complete(self, action_result: Dict[str, Any]) -> bool:
        """Determine if career discovery is complete."""
        # Exploration is fully exhausted if the agent decides it is
        if action_result.get('final_results') is not None or action_result.get('final') is True:
            return True

        # If we have verified a page, check if our work here is done
        if action_result.get("career_page_verified"):
            # The task is complete only if we found jobs.
            # If there are no jobs, we must continue exploring.
            return action_result.get("job_count", 0) > 0

        # For any other case, the task is not complete, and the OODA loop should continue
        return False
    
    def _compile_result(self) -> Dict[str, Any]:
        """Compile the final career discovery results."""
        return {
            "discovered_career_pages": list(self.discovered_pages.values()),
            "total_pages_found": len(self.discovered_pages),
            "best_career_page": (
                max(self.discovered_pages.values(), key=lambda x: x['confidence'])
                if self.discovered_pages else None
            ),
            "patterns_tried": self._get_tried_patterns(),
            "exploration_depth": self._get_current_depth(),
            "success": len(self.discovered_pages) > 0
        }
    
    # Helper methods
    
    def _is_same_domain(self, url1: str, url2: str) -> bool:
        """Check if two URLs are from the same domain."""
        try:
            domain1 = urlparse(url1).netloc.lower()
            domain2 = urlparse(url2).netloc.lower()
            return domain1 == domain2 or domain1.endswith(f'.{domain2}') or domain2.endswith(f'.{domain1}')
        except:
            return False
    
    def _get_tried_patterns(self) -> List[str]:
        """Get list of patterns we've already tried."""
        return self.memory.working_memory.get('tried_patterns', [])
    
    def _add_tried_pattern(self, pattern: str) -> None:
        """Add a pattern to the list of tried patterns."""
        tried = self._get_tried_patterns()
        if pattern not in tried:
            tried.append(pattern)
            self.memory.update_working_memory('tried_patterns', tried)
    
    def _get_current_depth(self) -> int:
        """Get current exploration depth."""
        return self.memory.working_memory.get('exploration_depth', 0)
    
    def _increment_depth(self) -> None:
        """Increment exploration depth."""
        current_depth = self._get_current_depth()
        self.memory.update_working_memory('exploration_depth', current_depth + 1)
    
    def _is_error_page(self, page_content: Dict[str, Any]) -> bool:
        """Check if page content indicates an error page."""
        text = page_content.get('text', '').lower()
        title = page_content.get('title', '').lower()
        
        error_indicators = ['404', 'not found', 'page not found', 'error', 'oops']
        
        return any(indicator in text or indicator in title for indicator in error_indicators)
    
    def _create_career_discovery_prompt(self, content: Dict[str, Any]) -> str:
        """Create prompt for AI-powered career link discovery."""
        return f"""
Analyze this company website page to find career/jobs sections:

Page Content (first 4000 chars):
{content['page_text']}

Navigation Links:
{json.dumps(content['navigation_elements'][:20], indent=2)}

Page Headings:
{json.dumps([h['text'] for h in content['headings']], indent=2)}

Task: Find career, jobs, or hiring related navigation options.

Look for:
1. Direct career/jobs links in navigation
2. Hidden or non-obvious career sections
3. Footer links to career pages
4. "About" or "Company" sections that might lead to careers
5. Any mention of hiring, team, or employment

Respond with specific actionable recommendations:
- Exact link text to click
- Potential URLs to try
- Elements to look for
- Navigation strategy

Focus on actionable, specific suggestions.
"""
    
    def _parse_ai_career_recommendations(self, ai_response: str) -> List[Dict[str, Any]]:
        """Parse AI response into actionable recommendations."""
        recommendations = []
        
        # Simple parsing logic - look for links, URLs, and action items
        lines = ai_response.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Look for URL patterns
            url_pattern = re.search(r'https?://[^\s]+', line)
            if url_pattern:
                recommendations.append({
                    'type': 'url',
                    'action': 'navigate',
                    'target': url_pattern.group(),
                    'description': line
                })
                continue
            
            # Look for link text patterns
            link_pattern = re.search(r'["\']([^"\']+)["\']', line)
            if link_pattern and any(keyword in link_pattern.group(1).lower() 
                                   for keyword in self.navigation_keywords):
                recommendations.append({
                    'type': 'link_text',
                    'action': 'click',
                    'target': link_pattern.group(1),
                    'description': line
                })
                continue
            
            # Look for general suggestions
            if any(keyword in line.lower() for keyword in ['click', 'navigate', 'try', 'look for']):
                recommendations.append({
                    'type': 'suggestion',
                    'action': 'explore',
                    'target': line,
                    'description': line
                })
        
        return recommendations[:5]  # Limit to top 5 recommendations