"""
Job Extraction Agent - Specialized agent for extracting structured job data from career pages.
Uses multiple extraction strategies and intelligent content analysis.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Set
from datetime import datetime
import re

from ..core.base_agent import BaseAgent, AgentAction, AgentObservation, ActionType
from ..browser.dom_processor import DOMProcessor, ExtractedJob

logger = logging.getLogger(__name__)


class JobExtractionAgent(BaseAgent):
    """
    Specialized agent for extracting job listings from career pages.
    
    Capabilities:
    - Multi-strategy job extraction
    - Dynamic content handling  
    - Job validation and enhancement
    - Pagination support
    - API call interception
    """
    
    def __init__(self, llm_client, browser_controller, config=None):
        super().__init__(
            name="JobExtractionAgent",
            llm_client=llm_client,
            browser_controller=browser_controller,
            config=config
        )
        
        self.dom_processor = DOMProcessor()
        
        # Extraction statistics
        self.extraction_stats = {
            'pages_processed': 0,
            'jobs_extracted': 0,
            'extraction_methods_used': set(),
            'success_rate_by_method': {},
            'average_confidence': 0.0
        }
        
        # Current extraction context
        self.current_extraction_context = {}
        
        # Job validation rules
        self.validation_rules = {
            'min_title_length': 5,
            'max_title_length': 200,
            'required_fields': ['title'],
            'blacklisted_titles': ['test', 'example', 'sample', 'placeholder']
        }
        
    async def extract_jobs_from_page(
        self,
        page_url: str,
        company_name: Optional[str] = None,
        extract_all_pages: bool = True,
        max_pages: int = 10
    ) -> Dict[str, Any]:
        """
        Main method to extract jobs from a career page.
        
        Args:
            page_url: URL of the career page
            company_name: Company name for context
            extract_all_pages: Whether to follow pagination
            max_pages: Maximum pages to process
            
        Returns:
            Extraction results with job listings
        """
        task = {
            'description': f'Extract jobs from {page_url}',
            'page_url': page_url,
            'company_name': company_name,
            'extract_all_pages': extract_all_pages,
            'max_pages': max_pages,
            'strategy': 'comprehensive'
        }
        
        return await self.execute_task(task)
    
    async def _observe(self) -> AgentObservation:
        """Observe the current page state and content."""
        try:
            page_url = self.current_task['page_url']
            
            # Navigate to page if not already there
            current_url = self.browser_controller.get_current_url()
            if current_url != page_url:
                nav_result = await self.browser_controller.navigate(page_url)
                if not nav_result.get('success'):
                    return AgentObservation(
                        content={'error': f'Failed to navigate to {page_url}'},
                        observation_type='navigation_error'
                    )
            
            # Wait for dynamic content
            await self._wait_for_job_content()
            
            # Get comprehensive page content
            page_content = await self.browser_controller.get_page_content()
            dom_content = await self.browser_controller.get_dom_content()
            
            # Check for intercepted API calls
            api_calls = await self.browser_controller.get_intercepted_api_calls()
            
            # Detect dynamic content patterns
            has_dynamic_content = await self.browser_controller.detect_dynamic_content()
            
            # Analyze page structure
            page_analysis = self.dom_processor.analyze_page(dom_content['dom'], page_url)
            
            return AgentObservation(
                content={
                    'current_url': self.browser_controller.get_current_url(),
                    'page_content': page_content,
                    'dom_content': dom_content['dom'],
                    'api_calls': api_calls,
                    'has_dynamic_content': has_dynamic_content,
                    'page_analysis': page_analysis,
                    'extraction_context': self._build_extraction_context()
                },
                observation_type='page_ready_for_extraction',
                confidence=1.0
            )
            
        except Exception as e:
            logger.error(f"Job extraction observation failed: {e}")
            return AgentObservation(
                content={'error': str(e)},
                observation_type='error',
                confidence=0.0
            )
    
    async def _orient(self, observation: AgentObservation) -> Dict[str, Any]:
        """Analyze the page and determine extraction strategy."""
        content = observation.content
        
        if 'error' in content:
            return {
                'situation': 'error',
                'error': content['error'],
                'next_strategy': 'retry_or_fail'
            }
        
        page_analysis = content['page_analysis']
        
        # Determine extraction situation
        if page_analysis.is_job_listing and page_analysis.job_count > 0:
            situation = 'jobs_detected'
            extraction_strategy = self._determine_extraction_strategy(content)
        elif page_analysis.is_career_page:
            situation = 'career_page_needs_exploration'
            extraction_strategy = 'navigation_required'
        else:
            situation = 'unknown_page_type'
            extraction_strategy = 'exploratory_extraction'
        
        # Check for pagination or additional pages
        has_pagination = len(page_analysis.navigation_hints) > 0
        
        context = {
            'extraction_strategy': extraction_strategy,
            'job_count_estimate': page_analysis.job_count,
            'has_dynamic_content': content['has_dynamic_content'],
            'has_pagination': has_pagination,
            'api_calls_available': len(content['api_calls']) > 0,
            'extraction_methods_available': self._get_available_extraction_methods(content)
        }
        
        # Store extraction context
        self.current_extraction_context = context
        self.memory.update_working_memory('extraction_context', context)
        
        return {
            'situation': situation,
            'context': context,
            'page_analysis': page_analysis
        }
    
    async def _decide(self, context: Dict[str, Any]) -> AgentAction:
        """Decide on the extraction approach."""
        situation = context['situation']
        extraction_context = context['context']
        
        if situation == 'error':
            return AgentAction(
                action_type=ActionType.CUSTOM,
                parameters={'action': 'handle_error', 'error': context['error']},
                confidence=1.0,
                reasoning="Handle error condition"
            )
        
        elif situation == 'jobs_detected':
            # Choose the best extraction method
            best_method = self._select_best_extraction_method(extraction_context)
            
            return AgentAction(
                action_type=ActionType.CUSTOM,
                parameters={'action': 'extract_jobs', 'method': best_method},
                confidence=0.8,
                reasoning=f"Extract jobs using {best_method} method"
            )
        
        elif situation == 'career_page_needs_exploration':
            return AgentAction(
                action_type=ActionType.CUSTOM,
                parameters={'action': 'explore_career_page'},
                confidence=0.6,
                reasoning="Explore career page to find job listings"
            )
        
        else:
            return AgentAction(
                action_type=ActionType.CUSTOM,
                parameters={'action': 'exploratory_extraction'},
                confidence=0.4,
                reasoning="Attempt exploratory job extraction"
            )
    
    async def _handle_custom_action(self, action: AgentAction) -> Dict[str, Any]:
        """Handle custom extraction actions."""
        action_name = action.parameters.get('action')
        
        if action_name == 'handle_error':
            return await self._handle_error_action(action)
        elif action_name == 'extract_jobs':
            return await self._extract_jobs_action(action)
        elif action_name == 'explore_career_page':
            return await self._explore_career_page()
        elif action_name == 'exploratory_extraction':
            return await self._exploratory_extraction()
        elif action_name == 'process_pagination':
            return await self._process_pagination()
        elif action_name == 'complete_extraction':
            return await self._complete_extraction()
        else:
            return {"success": False, "error": f"Unknown action: {action_name}"}
    
    async def _extract_jobs_action(self, action: AgentAction) -> Dict[str, Any]:
        """Perform job extraction using specified method."""
        method = action.parameters.get('method', 'dom_structure')
        
        try:
            # Get current page content
            page_content = await self.browser_controller.get_page_content()
            dom_content = await self.browser_controller.get_dom_content()
            current_url = self.browser_controller.get_current_url()
            company_name = self.current_task.get('company_name')
            
            # Extract jobs using DOM processor
            extracted_jobs = self.dom_processor.extract_jobs(
                page_content, dom_content['dom'], current_url, company_name
            )
            
            # Enhance jobs with additional information
            enhanced_jobs = await self._enhance_extracted_jobs(extracted_jobs, method)
            
            # Validate extracted jobs
            validated_jobs = self._validate_jobs(enhanced_jobs)
            
            # Update statistics
            self._update_extraction_stats(method, len(validated_jobs), True)
            
            # Store results
            self.memory.update_working_memory('extracted_jobs', validated_jobs)
            self.memory.update_working_memory('extraction_method', method)
            
            # Check if we need to process pagination
            should_continue = (
                self.current_task.get('extract_all_pages', False) and
                self._has_more_pages() and
                self._get_processed_pages_count() < self.current_task.get('max_pages', 10)
            )
            
            return {
                "success": True,
                "jobs_extracted": len(validated_jobs),
                "extraction_method": method,
                "jobs": validated_jobs,
                "should_continue_pagination": should_continue,
                "page_complete": True
            }
            
        except Exception as e:
            logger.error(f"Job extraction failed with method {method}: {e}")
            self._update_extraction_stats(method, 0, False)
            return {"success": False, "error": str(e), "method": method}
    
    async def _explore_career_page(self) -> Dict[str, Any]:
        """Explore career page to find job listings."""
        try:
            dom_content = await self.browser_controller.get_dom_content()
            page_analysis = self.dom_processor.analyze_page(
                dom_content['dom'], 
                self.browser_controller.get_current_url()
            )
            
            # Look for navigation hints
            navigation_hints = page_analysis.navigation_hints
            
            if navigation_hints:
                # Try the first navigation hint
                hint = navigation_hints[0]
                
                if hint.get('type') == 'pagination' and hint.get('action') == 'click':
                    # Click pagination element
                    click_result = await self.browser_controller.click_element(
                        f"text='{hint.get('text')}'"
                    )
                    if click_result.get('success'):
                        return {"success": True, "navigated": True, "action": "pagination_clicked"}
                
                elif hint.get('href'):
                    # Navigate to linked page
                    nav_result = await self.browser_controller.navigate(hint['href'])
                    if nav_result.get('success'):
                        return {"success": True, "navigated": True, "action": "link_followed"}
            
            # If no navigation hints, try to find job-related elements to click
            job_links = self._find_job_related_clickables(dom_content['dom'])
            
            if job_links:
                # Click the first job-related element
                first_link = job_links[0]
                if first_link.get('href'):
                    nav_result = await self.browser_controller.navigate(first_link['href'])
                    return {"success": nav_result.get('success', False), "navigated": True}
            
            return {"success": False, "message": "No navigation options found"}
            
        except Exception as e:
            logger.error(f"Career page exploration failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _exploratory_extraction(self) -> Dict[str, Any]:
        """Attempt exploratory extraction on unknown page types."""
        try:
            # Use AI to analyze the page and determine if it contains jobs
            page_content = await self.browser_controller.get_page_content()
            
            # Limit content for AI analysis
            analysis_text = page_content.get('text', '')[:6000]
            
            ai_analysis = await self._ai_analyze_for_jobs(analysis_text)
            
            if ai_analysis.get('contains_jobs', False):
                # Try extraction based on AI recommendations
                extraction_hints = ai_analysis.get('extraction_hints', [])
                
                jobs = []
                for hint in extraction_hints:
                    if hint.get('type') == 'selector':
                        # Try extracting using suggested selector
                        elements = await self.browser_controller.extract_elements(
                            hint['selector'], 'text'
                        )
                        if elements.get('success'):
                            # Parse extracted text as potential jobs
                            for text in elements['data']:
                                if self._looks_like_job_title(text):
                                    jobs.append({
                                        'title': text,
                                        'company': self.current_task.get('company_name', ''),
                                        'source': 'ai_exploratory',
                                        'confidence': 0.5
                                    })
                
                return {
                    "success": True,
                    "jobs_extracted": len(jobs),
                    "jobs": jobs,
                    "extraction_method": "ai_exploratory",
                    "page_complete": True
                }
            
            return {"success": False, "message": "No jobs detected through exploratory analysis"}
            
        except Exception as e:
            logger.error(f"Exploratory extraction failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _process_pagination(self) -> Dict[str, Any]:
        """Process pagination to get more job listings."""
        try:
            # Find pagination elements
            dom_content = await self.browser_controller.get_dom_content()
            pagination_selectors = [
                'a[aria-label*="next"]',
                'button[aria-label*="next"]',
                '.pagination .next',
                '.pager .next',
                'a:contains("Next")',
                'button:contains("Next")',
                'a:contains(">")',
                '.load-more',
                'button[class*="load"]'
            ]
            
            for selector in pagination_selectors:
                try:
                    click_result = await self.browser_controller.click_element(
                        selector, wait_for_navigation=True
                    )
                    if click_result.get('success'):
                        # Wait for new content to load
                        await asyncio.sleep(2)
                        return {"success": True, "pagination_clicked": True, "selector": selector}
                except:
                    continue
            
            return {"success": False, "message": "No pagination elements found or clickable"}
            
        except Exception as e:
            logger.error(f"Pagination processing failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _complete_extraction(self) -> Dict[str, Any]:
        """Complete the job extraction process."""
        # Gather all extracted jobs from memory
        all_jobs = self.memory.working_memory.get('extracted_jobs', [])
        
        # Compile final statistics
        stats = self.extraction_stats.copy()
        stats['total_jobs_extracted'] = len(all_jobs)
        
        if all_jobs:
            confidence_scores = [job.get('confidence_score', 0) for job in all_jobs]
            stats['average_confidence'] = sum(confidence_scores) / len(confidence_scores)
        
        return {
            "success": True,  
            "extraction_complete": True,
            "total_jobs": len(all_jobs),
            "jobs": all_jobs,
            "statistics": stats
        }
    
    def _is_task_complete(self, action_result: Dict[str, Any]) -> bool:
        """Determine if job extraction is complete."""
        return (
            action_result.get('extraction_complete') or
            action_result.get('page_complete') and not action_result.get('should_continue_pagination') or
            action_result.get('final') is True
        )
    
    def _compile_result(self) -> Dict[str, Any]:
        """Compile final extraction results."""
        extracted_jobs = self.memory.working_memory.get('extracted_jobs', [])
        
        return {
            "jobs_extracted": extracted_jobs,
            "total_jobs": len(extracted_jobs),
            "extraction_statistics": self.extraction_stats,
            "pages_processed": self.extraction_stats['pages_processed'],
            "success": len(extracted_jobs) > 0
        }
    
    # Helper methods
    
    async def _wait_for_job_content(self) -> None:
        """Wait for job content to load on dynamic pages."""
        try:
            # Wait for common job listing indicators
            job_indicators = [
                '[class*="job"]',
                '[class*="position"]', 
                '[class*="opening"]',
                '[data-job]',
                '.job-listing',
                '.position-listing'
            ]
            
            for indicator in job_indicators:
                try:
                    await self.browser_controller.wait_for_content(indicator, timeout=5000)
                    logger.info(f"Job content loaded: {indicator}")
                    return
                except:
                    continue
            
            # Fallback: wait for network idle
            await self.browser_controller.wait_for_content(timeout=10000)
            
        except Exception as e:
            logger.debug(f"Wait for job content timeout: {e}")
    
    def _build_extraction_context(self) -> Dict[str, Any]:
        """Build context for extraction process."""
        return {
            'company_name': self.current_task.get('company_name'),
            'page_url': self.current_task.get('page_url'),
            'extract_all_pages': self.current_task.get('extract_all_pages', False),
            'max_pages': self.current_task.get('max_pages', 10),
            'pages_processed': self._get_processed_pages_count()
        }
    
    def _determine_extraction_strategy(self, content: Dict[str, Any]) -> str:
        """Determine the best extraction strategy for the page."""
        if content['api_calls']:
            return 'api_interception'
        elif content['has_dynamic_content']:
            return 'dynamic_content'
        else:
            return 'dom_structure'
    
    def _get_available_extraction_methods(self, content: Dict[str, Any]) -> List[str]:
        """Get list of available extraction methods."""
        methods = ['dom_structure', 'text_patterns', 'heuristic']
        
        if content['api_calls']:
            methods.append('api_interception')
        if content['has_dynamic_content']:
            methods.append('dynamic_content')
        
        return methods
    
    def _select_best_extraction_method(self, context: Dict[str, Any]) -> str:
        """Select the best extraction method based on context."""
        available_methods = context['extraction_methods_available']
        
        # Priority order based on reliability
        method_priority = [
            'api_interception',
            'dom_structure', 
            'dynamic_content',
            'text_patterns',
            'heuristic'
        ]
        
        for method in method_priority:
            if method in available_methods:
                return method
        
        return 'dom_structure'  # Default fallback
    
    async def _enhance_extracted_jobs(self, jobs: List[ExtractedJob], method: str) -> List[Dict[str, Any]]:
        """Enhance extracted jobs with additional information."""
        enhanced_jobs = []
        
        for job in jobs:
            enhanced_job = {
                'title': job.title,
                'company': job.company,
                'location': job.location,
                'job_type': job.job_type,
                'experience_level': job.experience_level,
                'salary_range': job.salary_range,
                'description': job.description,
                'skills': job.skills,
                'application_url': job.application_url,
                'posted_date': job.posted_date,
                'department': job.department,
                'confidence_score': job.confidence_score,
                'extraction_method': method,
                'extracted_at': datetime.utcnow().isoformat(),
                'source_url': self.browser_controller.get_current_url()
            }
            
            # Enhance with additional AI analysis if confidence is low
            if job.confidence_score < 0.6:
                enhanced_job = await self._ai_enhance_job(enhanced_job)
            
            enhanced_jobs.append(enhanced_job)
        
        return enhanced_jobs
    
    def _validate_jobs(self, jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate extracted jobs against quality rules."""
        validated_jobs = []
        
        for job in jobs:
            if self._is_valid_job(job):
                validated_jobs.append(job)
            else:
                logger.debug(f"Job failed validation: {job.get('title', 'Unknown')}")
        
        return validated_jobs
    
    def _is_valid_job(self, job: Dict[str, Any]) -> bool:
        """Check if a job meets validation criteria."""
        # Check required fields
        for field in self.validation_rules['required_fields']:
            if not job.get(field):
                return False
        
        # Check title length
        title = job.get('title', '')
        if (len(title) < self.validation_rules['min_title_length'] or 
            len(title) > self.validation_rules['max_title_length']):
            return False
        
        # Check for blacklisted titles
        title_lower = title.lower()
        if any(blacklisted in title_lower for blacklisted in self.validation_rules['blacklisted_titles']):
            return False
        
        return True
    
    def _update_extraction_stats(self, method: str, job_count: int, success: bool) -> None:
        """Update extraction statistics."""
        self.extraction_stats['pages_processed'] += 1
        self.extraction_stats['jobs_extracted'] += job_count
        self.extraction_stats['extraction_methods_used'].add(method)
        
        if method not in self.extraction_stats['success_rate_by_method']:
            self.extraction_stats['success_rate_by_method'][method] = {'successes': 0, 'attempts': 0}
        
        self.extraction_stats['success_rate_by_method'][method]['attempts'] += 1
        if success:
            self.extraction_stats['success_rate_by_method'][method]['successes'] += 1
    
    def _has_more_pages(self) -> bool:
        """Check if there are more pages to process."""
        # This would check for pagination indicators
        # Implementation depends on specific pagination patterns
        return False  # Simplified for now
    
    def _get_processed_pages_count(self) -> int:
        """Get number of pages processed so far."""
        return self.extraction_stats['pages_processed']
    
    def _find_job_related_clickables(self, dom_content: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find clickable elements that might lead to job listings."""
        job_related = []
        
        links = dom_content.get('links', [])
        for link in links:
            text = link.get('text', '').lower()
            href = link.get('href', '').lower()
            
            if any(keyword in text or keyword in href 
                   for keyword in ['job', 'position', 'career', 'opening', 'role']):
                job_related.append(link)
        
        return job_related
    
    def _looks_like_job_title(self, text: str) -> bool:
        """Check if text looks like a job title."""
        if not text or len(text) < 5 or len(text) > 200:
            return False
        
        # Simple heuristic: contains job-related keywords and reasonable format
        job_keywords = ['engineer', 'developer', 'manager', 'analyst', 'designer', 'specialist']
        text_lower = text.lower()
        
        return any(keyword in text_lower for keyword in job_keywords)
    
    async def _ai_analyze_for_jobs(self, content: str) -> Dict[str, Any]:
        """Use AI to analyze content for job listings."""
        try:
            prompt = f"""
Analyze this web page content to determine if it contains job listings:

{content}

Respond with JSON:
{{
    "contains_jobs": true/false,
    "confidence": 0.0-1.0,
    "job_indicators": ["list of indicators found"],
    "extraction_hints": [
        {{"type": "selector", "selector": "css_selector", "description": "what to extract"}}
    ]
}}
"""
            
            response = await self._call_llm([
                {"role": "user", "content": prompt}
            ], model="gpt-4o-mini", temperature=0.1)
            
            # Try to parse JSON response
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                return {
                    "contains_jobs": "job" in response.lower() or "position" in response.lower(),
                    "confidence": 0.3,
                    "job_indicators": [],
                    "extraction_hints": []
                }
                
        except Exception as e:
            logger.error(f"AI job analysis failed: {e}")
            return {"contains_jobs": False, "confidence": 0.0}
    
    async def _ai_enhance_job(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Use AI to enhance job information."""
        try:
            prompt = f"""
Enhance this job listing with missing information:

Current job data:
{json.dumps(job, indent=2)}

Please fill in missing fields like location, job_type, experience_level, skills based on the job title and description.
Respond with the enhanced JSON object.
"""
            
            response = await self._call_llm([
                {"role": "user", "content": prompt}
            ], model="gpt-4o-mini", temperature=0.2)
            
            try:
                enhanced = json.loads(response)
                # Merge enhanced data with original, preserving original values
                for key, value in enhanced.items():
                    if key in job and job[key]:
                        continue  # Keep original if exists
                    job[key] = value
                
                # Increase confidence since we enhanced it
                job['confidence_score'] = min(1.0, job.get('confidence_score', 0.5) + 0.2)
                
            except json.JSONDecodeError:
                pass  # Keep original if parsing fails
                
        except Exception as e:
            logger.debug(f"AI job enhancement failed: {e}")
        
        return job
    
    async def _handle_error_action(self, action: AgentAction) -> Dict[str, Any]:
        """Handle error conditions during extraction."""
        error = action.parameters.get('error', 'Unknown error')
        logger.warning(f"Job extraction error: {error}")
        
        # Try alternative extraction approach or give up
        if 'navigation' in error.lower():
            return {"success": False, "error": error, "retry_suggestion": "try_alternative_url"}
        
        return {"success": False, "error": error, "final": True}