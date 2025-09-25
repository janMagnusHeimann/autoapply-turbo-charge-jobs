"""
Enhanced Form Analysis Service - LangChain-powered form analysis with multi-agent architecture

This service provides advanced AI-powered analysis of job application forms using
LangChain agents and structured outputs for consistent, accurate results.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
import json
import re
from datetime import datetime

from playwright.async_api import async_playwright, Browser, Page
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.tools import Tool
from langchain_core.messages import HumanMessage, SystemMessage

from .langchain_services.base_service import BaseLangChainService
from .langchain_services.prompt_templates import PromptTemplates
from .langchain_services.structured_outputs import FormAnalysisOutput, FormFieldAnalysis, FormComplexity

logger = logging.getLogger(__name__)


class EnhancedFormAnalysisService(BaseLangChainService[FormAnalysisOutput]):
    """
    Enhanced form analysis service using LangChain multi-agent architecture
    
    Features:
    - Multi-agent form analysis (structure, complexity, validation)
    - Intelligent field detection and classification
    - Form template caching and pattern recognition
    - Advanced error handling and recovery
    - Performance optimization with caching
    """
    
    def __init__(self, openai_api_key: str):
        super().__init__(
            openai_api_key=openai_api_key,
            model_name="gpt-4",
            temperature=0.1,
            max_retries=3
        )
        
        # Form pattern cache for improved accuracy
        self.form_pattern_cache = {}
        
        # Performance tracking
        self.analysis_count = 0
        self.cache_hits = 0
        
        logger.info("Enhanced Form Analysis Service initialized with LangChain")
    
    async def analyze_form(self, url: str) -> Dict[str, Any]:
        """
        Analyze a job application form using multi-agent LangChain system
        
        Args:
            url: URL of the job application page
            
        Returns:
            Dictionary containing comprehensive form analysis
        """
        try:
            logger.info(f"🔍 Starting enhanced form analysis for: {url}")
            self.analysis_count += 1
            
            # Step 1: Load page and extract HTML structure
            page_data = await self._load_page_with_intelligence(url)
            
            if not page_data['success']:
                return {'success': False, 'error': page_data['error']}
            
            # Step 2: Check form pattern cache
            form_signature = self._generate_form_signature(page_data['form_elements'])
            cached_analysis = self._check_cache(form_signature)
            
            if cached_analysis:
                logger.info("📋 Using cached form analysis (pattern match)")
                self.cache_hits += 1
                return {'success': True, 'form_data': cached_analysis, 'cached': True}
            
            # Step 3: Multi-agent form analysis
            analysis_result = await self._run_multi_agent_analysis(
                page_data['html_content'],
                page_data['form_elements'],
                url
            )
            
            # Step 4: Cache results for future use
            self._cache_analysis(form_signature, analysis_result)
            
            logger.info(f"✅ Enhanced form analysis completed for {url}")
            return {
                'success': True,
                'form_data': analysis_result.dict(),
                'cached': False,
                'analysis_confidence': analysis_result.confidence
            }
            
        except Exception as e:
            logger.error(f"❌ Enhanced form analysis failed for {url}: {e}")
            return {
                'success': False,
                'error': str(e),
                'form_data': {}
            }
    
    async def _load_page_with_intelligence(self, url: str) -> Dict[str, Any]:
        """
        Load page with intelligent error handling and form detection
        """
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    viewport={'width': 1920, 'height': 1080}
                )
                page = await context.new_page()
                
                try:
                    # Navigate with retries
                    await self._navigate_with_retries(page, url)
                    
                    # Wait for forms to load
                    await page.wait_for_timeout(3000)
                    
                    # Handle common popups and overlays
                    await self._handle_page_overlays(page)
                    
                    # Extract comprehensive page data
                    page_data = await self._extract_comprehensive_page_data(page)
                    
                    return {
                        'success': True,
                        **page_data
                    }
                    
                finally:
                    await browser.close()
                    
        except Exception as e:
            logger.error(f"Page loading failed: {e}")
            return {
                'success': False,
                'error': f"Failed to load page: {str(e)}"
            }
    
    async def _navigate_with_retries(self, page: Page, url: str, max_retries: int = 3) -> None:
        """Navigate to URL with intelligent retry logic"""
        for attempt in range(max_retries):
            try:
                await page.goto(url, wait_until='networkidle', timeout=30000)
                return
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                logger.warning(f"Navigation attempt {attempt + 1} failed, retrying...")
                await asyncio.sleep(2)
    
    async def _handle_page_overlays(self, page: Page) -> None:
        """Handle common page overlays that might block form access"""
        overlay_selectors = [
            'button:text("Accept")',
            'button:text("OK")',
            'button:text("Continue")',
            '.cookie-banner button',
            '.modal-close',
            '[aria-label="Close"]',
            '.overlay-close'
        ]
        
        for selector in overlay_selectors:
            try:
                await page.click(selector, timeout=2000)
                logger.info(f"Closed overlay with selector: {selector}")
                await page.wait_for_timeout(1000)
            except:
                continue
    
    async def _extract_comprehensive_page_data(self, page: Page) -> Dict[str, Any]:
        """Extract comprehensive form and page data"""
        
        # Get page title and URL
        page_title = await page.title()
        current_url = page.url
        
        # Get all forms on the page
        forms = await page.query_selector_all('form')
        
        # Extract form elements with detailed analysis
        form_elements = []
        for i, form in enumerate(forms):
            form_data = await self._analyze_single_form(page, form, i)
            form_elements.extend(form_data)
        
        # Get relevant HTML content (forms and surrounding context)
        html_content = await page.content()
        
        # Extract additional context
        job_title = await self._extract_job_title(page)
        company_name = await self._extract_company_name(page)
        
        return {
            'html_content': html_content,
            'form_elements': form_elements,
            'page_title': page_title,
            'current_url': current_url,
            'job_title': job_title,
            'company_name': company_name,
            'forms_found': len(forms),
            'total_fields': len(form_elements)
        }
    
    async def _analyze_single_form(self, page: Page, form, form_index: int) -> List[Dict[str, Any]]:
        """Analyze a single form and return detailed field information"""
        form_fields = []
        
        # Get all input elements in this form
        inputs = await form.query_selector_all('input, select, textarea')
        
        for input_elem in inputs:
            try:
                field_data = await self._extract_field_data(input_elem)
                field_data['form_index'] = form_index
                form_fields.append(field_data)
            except Exception as e:
                logger.warning(f"Failed to extract field data: {e}")
                continue
        
        return form_fields
    
    async def _extract_field_data(self, element) -> Dict[str, Any]:
        """Extract detailed data for a single form field"""
        
        # Basic attributes
        tag_name = await element.evaluate('el => el.tagName.toLowerCase()')
        field_type = await element.get_attribute('type') or 'text'
        name = await element.get_attribute('name') or ''
        id_attr = await element.get_attribute('id') or ''
        placeholder = await element.get_attribute('placeholder') or ''
        required = await element.get_attribute('required') is not None
        
        # Get associated label
        label = await self._find_field_label(element)
        
        # Get validation attributes
        pattern = await element.get_attribute('pattern') or ''
        min_length = await element.get_attribute('minlength') or ''
        max_length = await element.get_attribute('maxlength') or ''
        
        # For select elements, get options
        options = []
        if tag_name == 'select':
            option_elements = await element.query_selector_all('option')
            for option in option_elements:
                option_text = await option.inner_text()
                option_value = await option.get_attribute('value') or option_text
                if option_text.strip():
                    options.append({'text': option_text.strip(), 'value': option_value})
        
        return {
            'tag_name': tag_name,
            'type': field_type,
            'name': name or id_attr,
            'id': id_attr,
            'label': label,
            'placeholder': placeholder,
            'required': required,
            'pattern': pattern,
            'min_length': min_length,
            'max_length': max_length,
            'options': options,
            'field_signature': f"{tag_name}_{field_type}_{name or id_attr}_{label}"
        }
    
    async def _find_field_label(self, element) -> str:
        """Find the label associated with a form field"""
        try:
            # Try to find label by 'for' attribute
            id_attr = await element.get_attribute('id')
            if id_attr:
                label_elem = await element.page.query_selector(f'label[for="{id_attr}"]')
                if label_elem:
                    return await label_elem.inner_text()
            
            # Try to find parent label
            label_parent = await element.query_selector('xpath=ancestor::label[1]')
            if label_parent:
                return await label_parent.inner_text()
            
            # Look for nearby text (common patterns)
            nearby_selectors = [
                'xpath=preceding-sibling::*[1][self::label]',
                'xpath=preceding-sibling::*[1]',
                'xpath=parent::*/preceding-sibling::*[1]'
            ]
            
            for selector in nearby_selectors:
                try:
                    nearby_elem = await element.query_selector(selector)
                    if nearby_elem:
                        text = await nearby_elem.inner_text()
                        if text and len(text.strip()) < 100:  # Reasonable label length
                            return text.strip()
                except:
                    continue
            
            return ''
            
        except Exception:
            return ''
    
    async def _extract_job_title(self, page: Page) -> str:
        """Extract job title from the page"""
        selectors = [
            'h1',
            '.job-title',
            '[data-testid="job-title"]',
            '.position-title',
            '.role-title'
        ]
        
        for selector in selectors:
            try:
                elem = await page.query_selector(selector)
                if elem:
                    text = await elem.inner_text()
                    if text and len(text.strip()) > 3:
                        return text.strip()
            except:
                continue
        
        return ''
    
    async def _extract_company_name(self, page: Page) -> str:
        """Extract company name from the page"""
        selectors = [
            '.company-name',
            '[data-testid="company-name"]',
            '.employer-name',
            '.organization-name'
        ]
        
        for selector in selectors:
            try:
                elem = await page.query_selector(selector)
                if elem:
                    text = await elem.inner_text()
                    if text and len(text.strip()) > 1:
                        return text.strip()
            except:
                continue
        
        return ''
    
    async def _run_multi_agent_analysis(
        self,
        html_content: str,
        form_elements: List[Dict[str, Any]],
        url: str
    ) -> FormAnalysisOutput:
        """
        Run multi-agent analysis using LangChain
        """
        
        # Prepare input data
        input_data = {
            'html_content': html_content[:10000],  # Truncate for token limits
            'form_elements': json.dumps(form_elements, indent=2),
            'url': url,
            'total_fields': len(form_elements)
        }
        
        # Use the form analysis prompt template
        prompt = PromptTemplates.get_form_analysis_prompt()
        
        # Run the analysis chain
        result = await self._run_chain_with_structured_output(
            prompt_template=prompt,
            input_data=input_data,
            output_model=FormAnalysisOutput,
            use_memory=False  # Don't use memory for form analysis
        )
        
        # Enhance result with additional processing
        result = await self._enhance_analysis_result(result, form_elements)
        
        return result
    
    async def _enhance_analysis_result(
        self,
        analysis: FormAnalysisOutput,
        original_elements: List[Dict[str, Any]]
    ) -> FormAnalysisOutput:
        """
        Enhance analysis result with additional processing and validation
        """
        
        # Validate field mappings against original elements
        validated_fields = []
        for field in analysis.fields:
            if self._validate_field_analysis(field, original_elements):
                validated_fields.append(field)
        
        analysis.fields = validated_fields
        
        # Recalculate confidence based on validation
        if len(validated_fields) > 0:
            avg_field_confidence = sum(f.confidence for f in validated_fields) / len(validated_fields)
            analysis.confidence = min(analysis.confidence, avg_field_confidence)
        
        # Add complexity assessment based on actual field types
        complexity_score = self._calculate_complexity_score(validated_fields)
        analysis.complexity = self._determine_complexity_level(complexity_score)
        analysis.estimated_time_minutes = self._estimate_completion_time(validated_fields, complexity_score)
        
        return analysis
    
    def _validate_field_analysis(
        self,
        field: FormFieldAnalysis,
        original_elements: List[Dict[str, Any]]
    ) -> bool:
        """Validate that field analysis matches original form elements"""
        
        # Look for matching element in original data
        for elem in original_elements:
            if (elem.get('name') == field.name or 
                elem.get('id') == field.name or
                elem.get('field_signature', '').endswith(field.name)):
                return True
        
        return False
    
    def _calculate_complexity_score(self, fields: List[FormFieldAnalysis]) -> int:
        """Calculate form complexity score based on field types and requirements"""
        score = 0
        
        for field in fields:
            # Base score for any field
            score += 1
            
            # Additional score for complex field types
            if field.type in ['select', 'radio']:
                score += 2
            elif field.type in ['file', 'date']:
                score += 3
            elif field.type == 'textarea':
                score += 2
            
            # Additional score for required fields
            if field.required:
                score += 1
            
            # Additional score for validation rules
            score += len(field.validation_rules)
        
        return score
    
    def _determine_complexity_level(self, score: int) -> FormComplexity:
        """Determine complexity level based on score"""
        if score <= 5:
            return FormComplexity.SIMPLE
        elif score <= 15:
            return FormComplexity.MODERATE
        elif score <= 30:
            return FormComplexity.COMPLEX
        else:
            return FormComplexity.VERY_COMPLEX
    
    def _estimate_completion_time(self, fields: List[FormFieldAnalysis], complexity_score: int) -> int:
        """Estimate completion time in minutes"""
        base_time = len(fields) * 0.5  # 30 seconds per field
        complexity_multiplier = {
            FormComplexity.SIMPLE: 1.0,
            FormComplexity.MODERATE: 1.5,
            FormComplexity.COMPLEX: 2.0,
            FormComplexity.VERY_COMPLEX: 3.0
        }
        
        complexity_level = self._determine_complexity_level(complexity_score)
        estimated_time = base_time * complexity_multiplier[complexity_level]
        
        return max(2, int(estimated_time))  # Minimum 2 minutes
    
    def _generate_form_signature(self, form_elements: List[Dict[str, Any]]) -> str:
        """Generate a signature for form pattern matching"""
        
        # Create signature based on field types and names
        field_signatures = []
        for elem in form_elements:
            signature_parts = [
                elem.get('tag_name', ''),
                elem.get('type', ''),
                elem.get('name', ''),
                elem.get('label', '')[:20]  # First 20 chars of label
            ]
            field_signatures.append('|'.join(signature_parts))
        
        # Sort for consistent signatures
        field_signatures.sort()
        
        # Create hash-like signature
        combined = '::'.join(field_signatures)
        return str(hash(combined))
    
    def _check_cache(self, form_signature: str) -> Optional[Dict[str, Any]]:
        """Check if form pattern exists in cache"""
        if form_signature in self.form_pattern_cache:
            cached_data = self.form_pattern_cache[form_signature]
            
            # Check if cache is not too old (24 hours)
            cache_age = datetime.now() - cached_data['timestamp']
            if cache_age.total_seconds() < 86400:  # 24 hours
                return cached_data['analysis']
        
        return None
    
    def _cache_analysis(self, form_signature: str, analysis: FormAnalysisOutput) -> None:
        """Cache form analysis for future use"""
        self.form_pattern_cache[form_signature] = {
            'analysis': analysis.dict(),
            'timestamp': datetime.now()
        }
        
        # Limit cache size
        if len(self.form_pattern_cache) > 100:
            # Remove oldest entries
            oldest_key = min(
                self.form_pattern_cache.keys(),
                key=lambda k: self.form_pattern_cache[k]['timestamp']
            )
            del self.form_pattern_cache[oldest_key]
    
    def get_analysis_stats(self) -> Dict[str, Any]:
        """Get analysis statistics"""
        cache_hit_rate = (self.cache_hits / self.analysis_count) * 100 if self.analysis_count > 0 else 0
        
        return {
            'total_analyses': self.analysis_count,
            'cache_hits': self.cache_hits,
            'cache_hit_rate_percent': round(cache_hit_rate, 2),
            'cached_patterns': len(self.form_pattern_cache),
            **self.get_performance_stats()
        }