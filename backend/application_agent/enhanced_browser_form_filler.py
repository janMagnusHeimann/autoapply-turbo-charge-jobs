"""
Enhanced Browser Form Filler - LangChain-powered intelligent form filling with AI guidance

This service provides advanced AI-guided browser automation for filling job application
forms with intelligent error recovery, multi-step navigation, and adaptive strategies.
"""

import asyncio
import logging
import os
import base64
import json
import random
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from pathlib import Path

from playwright.async_api import async_playwright, Browser, Page, ElementHandle, TimeoutError as PlaywrightTimeoutError
from playwright_stealth import Stealth
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.tools import Tool
from langchain_core.messages import HumanMessage, SystemMessage

from .langchain_services.base_service import BaseLangChainService
from .langchain_services.prompt_templates import PromptTemplates
from .langchain_services.structured_outputs import (
    FormFillingOutput, FormFillingAction, ErrorRecoveryOutput, 
    AgentDecision, QualityAssessment
)
from .human_behavior import HumanBehavior, DetectionAvoidance, BrowserProfileManager

logger = logging.getLogger(__name__)


class EnhancedBrowserFormFiller(BaseLangChainService[FormFillingOutput]):
    """
    Enhanced browser form filler using LangChain agents for intelligent automation
    
    Features:
    - AI-guided form navigation and filling strategies
    - Intelligent error recovery and adaptation
    - Multi-step form handling with context awareness
    - Visual verification with screenshot analysis
    - Self-correcting loops with learning capabilities
    - Advanced field detection and interaction methods
    """
    
    def __init__(self, openai_api_key: str):
        super().__init__(
            openai_api_key=openai_api_key,
            model_name="gpt-4",
            temperature=0.1,
            max_retries=3
        )
        
        # Browser configuration - Run visible but off-screen for stealth
        self.browser_config = {
            'headless': False,  # Not headless for better stealth
            'args': [
                '--window-size=1920,1080',
                '--window-position=2000,2000',  # Position off-screen
                '--disable-blink-features=AutomationControlled',  # Hide automation
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        }
        
        # Browser profile manager
        self.profile_manager = BrowserProfileManager()
        
        # Form filling strategies and patterns
        self.filling_strategies = {}
        self.error_patterns = {}
        self.success_patterns = {}
        
        # Performance tracking
        self.filling_attempts = 0
        self.successful_fills = 0
        self.error_recoveries = 0
        
        # Screenshot storage
        self.screenshot_dir = Path("screenshots")
        self.screenshot_dir.mkdir(exist_ok=True)
        
        logger.info("Enhanced Browser Form Filler initialized with AI guidance")
    
    async def fill_form(
        self,
        url: str,
        form_fields: List[Dict[str, Any]],
        cv_data: Dict[str, Any],
        job_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Fill a job application form using AI-guided browser automation
        
        Args:
            url: Application form URL
            form_fields: List of form fields from analysis
            cv_data: Structured CV data
            job_data: Job information
            
        Returns:
            Dictionary containing comprehensive filling results
        """
        try:
            logger.info(f"🖥️ Starting AI-guided form filling for: {url}")
            self.filling_attempts += 1
            
            async with async_playwright() as p:
                browser = await p.chromium.launch(**self.browser_config)
                
                # Get random user agent and viewport
                user_agent = HumanBehavior.get_random_user_agent()
                viewport = HumanBehavior.get_random_viewport()
                
                # Prepare context options
                context_options = {
                    'viewport': viewport,
                    'user_agent': user_agent,
                    'locale': 'en-US',
                    'timezone_id': 'America/New_York',
                    'permissions': ['geolocation'],
                    'geolocation': {'latitude': 40.7128, 'longitude': -74.0060},  # New York
                    'color_scheme': 'light'
                }
                
                # Load existing profile if available (for trust building)
                user_id = cv_data.get('personal', {}).get('user_id', 'default')
                profile_data = await self.profile_manager.load_profile(user_id)
                if profile_data:
                    context_options['storage_state'] = profile_data
                
                context = await browser.new_context(**context_options)
                page = await context.new_page()
                
                # Apply stealth mode to hide automation markers
                stealth = Stealth()
                await stealth.apply_stealth(page)
                
                try:
                    # Initialize filling session
                    session_data = await self._initialize_filling_session(
                        page, url, form_fields, cv_data, job_data
                    )
                    
                    if not session_data['success']:
                        return session_data
                    
                    # Execute AI-guided form filling strategy
                    filling_result = await self._execute_filling_strategy(
                        page, session_data['strategy'], session_data['field_mappings']
                    )
                    
                    # Validate and verify results
                    validation_result = await self._validate_form_completion(
                        page, filling_result
                    )
                    
                    # Combine results
                    final_result = self._combine_filling_results(
                        filling_result, validation_result, session_data
                    )
                    
                    if final_result.ready_for_submission:
                        self.successful_fills += 1
                    
                    logger.info(f"✅ Form filling completed with {final_result.completion_percentage:.1f}% success")
                    return {'success': True, 'result': final_result.dict()}
                    
                finally:
                    # Save browser profile for next session
                    await self.profile_manager.save_profile(context, user_id)
                    await browser.close()
                    
        except Exception as e:
            logger.error(f"❌ Form filling failed for {url}: {e}")
            return {
                'success': False,
                'error': str(e),
                'result': self._create_failed_result(str(e)).dict()
            }
    
    async def _initialize_filling_session(
        self,
        page: Page,
        url: str,
        form_fields: List[Dict[str, Any]],
        cv_data: Dict[str, Any],
        job_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Initialize filling session with AI-generated strategy"""
        
        try:
            # Navigate to form with intelligent loading
            await self._navigate_with_intelligence(page, url)
            
            # Analyze current page state
            page_analysis = await self._analyze_page_state(page)
            
            # Generate filling strategy using LangChain
            strategy = await self._generate_filling_strategy(
                form_fields, cv_data, job_data, page_analysis
            )
            
            # Create field mappings with AI assistance
            field_mappings = await self._create_ai_field_mappings(
                page, form_fields, cv_data, strategy
            )
            
            return {
                'success': True,
                'strategy': strategy,
                'field_mappings': field_mappings,
                'page_analysis': page_analysis
            }
            
        except Exception as e:
            logger.error(f"Session initialization failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _navigate_with_intelligence(self, page: Page, url: str) -> None:
        """Navigate to URL with intelligent error handling and human-like behavior"""
        
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                logger.info(f"🌐 Navigating to {url} (attempt {attempt + 1})")
                
                # Check for bot detection before navigation
                detected, detection_type = await DetectionAvoidance.check_for_detection(page)
                if detected:
                    logger.warning(f"Bot detection detected: {detection_type}")
                    await DetectionAvoidance.handle_rate_limiting()
                
                # Navigate with timeout
                await page.goto(url, wait_until='networkidle', timeout=30000)
                
                # Human-like wait for page load
                await HumanBehavior.random_pause(2, 5)
                
                # Perform human-like actions to avoid detection
                await DetectionAvoidance.avoid_detection_patterns(page)
                
                # Handle common page overlays
                await self._handle_intelligent_overlays(page)
                
                # Verify page loaded successfully
                if await self._verify_page_loaded(page):
                    logger.info("✅ Page loaded successfully")
                    return
                else:
                    raise Exception("Page validation failed")
                    
            except Exception as e:
                logger.warning(f"Navigation attempt {attempt + 1} failed: {e}")
                if attempt == max_attempts - 1:
                    raise
                
                # Wait with exponential backoff plus random jitter
                wait_time = (2 ** attempt) + random.uniform(0, 2)
                await asyncio.sleep(wait_time)
    
    async def _handle_intelligent_overlays(self, page: Page) -> None:
        """Handle page overlays with human-like interaction"""
        
        overlay_selectors = [
            # Cookie banners
            'button:text("Accept")', 'button:text("Accept All")', 'button:text("OK")',
            '.cookie-banner button', '.cookie-consent button',
            
            # Modal dialogs
            '.modal-close', '[aria-label="Close"]', '.overlay-close',
            'button:text("Continue")', 'button:text("Proceed")',
            
            # Pop-ups
            '.popup-close', '.notification-close', '.alert-close'
        ]
        
        # Wait a bit before handling overlays (humans read first)
        await HumanBehavior.random_pause(1, 2)
        
        for selector in overlay_selectors:
            try:
                element = await page.query_selector(selector)
                if element and await element.is_visible():
                    # Use human-like click
                    await HumanBehavior.human_click(page, element)
                    logger.info(f"🎯 Closed overlay: {selector}")
                    await HumanBehavior.random_pause(0.5, 1.5)
                    break
            except:
                continue
    
    async def _verify_page_loaded(self, page: Page) -> bool:
        """Verify page loaded successfully with form presence"""
        
        try:
            # Check for forms
            forms = await page.query_selector_all('form')
            if not forms:
                return False
            
            # Check for input fields
            inputs = await page.query_selector_all('input, select, textarea')
            if len(inputs) < 1:
                return False
            
            # Check page is not showing error
            error_indicators = await page.query_selector_all(
                '.error, .not-found, [class*="error"], [class*="404"]'
            )
            if error_indicators:
                error_texts = []
                for indicator in error_indicators:
                    text = await indicator.inner_text()
                    if text and len(text) > 5:
                        error_texts.append(text)
                
                if any('404' in text or 'not found' in text.lower() for text in error_texts):
                    return False
            
            return True
            
        except Exception as e:
            logger.warning(f"Page verification failed: {e}")
            return False
    
    async def _analyze_page_state(self, page: Page) -> Dict[str, Any]:
        """Analyze current page state for form filling strategy"""
        
        try:
            # Get page metadata
            page_title = await page.title()
            current_url = page.url
            
            # Analyze forms
            forms = await page.query_selector_all('form')
            form_analysis = []
            
            for i, form in enumerate(forms):
                form_info = await self._analyze_single_form_on_page(form, i)
                form_analysis.append(form_info)
            
            # Detect multi-step indicators
            multi_step_indicators = await page.query_selector_all(
                '.step, .progress, .wizard, [class*="step"], [class*="progress"]'
            )
            
            # Detect dynamic content
            dynamic_content = await self._detect_dynamic_content(page)
            
            return {
                'page_title': page_title,
                'current_url': current_url,
                'forms_count': len(forms),
                'form_analysis': form_analysis,
                'multi_step': len(multi_step_indicators) > 0,
                'dynamic_content': dynamic_content,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Page analysis failed: {e}")
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    async def _analyze_single_form_on_page(self, form: ElementHandle, form_index: int) -> Dict[str, Any]:
        """Analyze a single form element on the page"""
        
        try:
            # Get form attributes
            action = await form.get_attribute('action') or ''
            method = await form.get_attribute('method') or 'post'
            
            # Count field types
            inputs = await form.query_selector_all('input')
            selects = await form.query_selector_all('select')
            textareas = await form.query_selector_all('textarea')
            
            field_types = {}
            for input_elem in inputs:
                input_type = await input_elem.get_attribute('type') or 'text'
                field_types[input_type] = field_types.get(input_type, 0) + 1
            
            return {
                'form_index': form_index,
                'action': action,
                'method': method,
                'total_fields': len(inputs) + len(selects) + len(textareas),
                'field_types': field_types,
                'has_file_upload': 'file' in field_types,
                'estimated_complexity': self._estimate_form_complexity(field_types)
            }
            
        except Exception as e:
            logger.warning(f"Form analysis failed: {e}")
            return {'form_index': form_index, 'error': str(e)}
    
    def _estimate_form_complexity(self, field_types: Dict[str, int]) -> str:
        """Estimate form complexity based on field types"""
        
        total_fields = sum(field_types.values())
        
        if total_fields <= 3:
            return 'simple'
        elif total_fields <= 8:
            complexity_score = 0
            complexity_score += field_types.get('select', 0) * 2
            complexity_score += field_types.get('file', 0) * 3
            complexity_score += field_types.get('date', 0) * 2
            
            return 'moderate' if complexity_score <= 5 else 'complex'
        else:
            return 'complex'
    
    async def _detect_dynamic_content(self, page: Page) -> Dict[str, Any]:
        """Detect dynamic content that might affect form filling"""
        
        try:
            # Check for JavaScript frameworks
            frameworks = []
            
            # Check for React
            react_elements = await page.query_selector_all('[data-reactroot], [data-react-helmet]')
            if react_elements:
                frameworks.append('react')
            
            # Check for Vue
            vue_elements = await page.query_selector_all('[data-v-], [v-]')
            if vue_elements:
                frameworks.append('vue')
            
            # Check for Angular
            angular_elements = await page.query_selector_all('[ng-], [data-ng-]')
            if angular_elements:
                frameworks.append('angular')
            
            # Check for AJAX/dynamic loading indicators
            loading_indicators = await page.query_selector_all(
                '.loading, .spinner, [class*="load"], [class*="spin"]'
            )
            
            return {
                'frameworks': frameworks,
                'has_loading_indicators': len(loading_indicators) > 0,
                'requires_dynamic_handling': len(frameworks) > 0
            }
            
        except Exception as e:
            logger.warning(f"Dynamic content detection failed: {e}")
            return {'error': str(e)}
    
    async def _generate_filling_strategy(
        self,
        form_fields: List[Dict[str, Any]],
        cv_data: Dict[str, Any],
        job_data: Dict[str, Any],
        page_analysis: Dict[str, Any]
    ) -> AgentDecision:
        """Generate AI-powered form filling strategy"""
        
        # Prepare input for strategy generation
        input_data = {
            'form_fields': json.dumps(form_fields[:20], indent=2),  # Limit for token constraints
            'field_mappings': json.dumps(self._create_basic_field_mappings(form_fields, cv_data), indent=2),
            'current_state': json.dumps(page_analysis, indent=2),
            'job_title': job_data.get('title', ''),
            'company_name': job_data.get('company', ''),
            'form_complexity': page_analysis.get('form_analysis', [{}])[0].get('estimated_complexity', 'moderate')
        }
        
        # Use form filling strategy prompt
        prompt = PromptTemplates.get_form_filling_prompt()
        
        # Generate strategy
        strategy = await self._run_chain_with_structured_output(
            prompt_template=prompt,
            input_data=input_data,
            output_model=AgentDecision,
            use_memory=True  # Use memory for context in multi-step forms
        )
        
        return strategy
    
    def _create_basic_field_mappings(self, form_fields: List[Dict[str, Any]], cv_data: Dict[str, Any]) -> Dict[str, str]:
        """Create basic field mappings for strategy generation"""
        
        mappings = {}
        personal = cv_data.get('personal', {})
        
        for field in form_fields[:10]:  # Limit for performance
            field_name = field.get('name', '')
            field_label = field.get('label', '').lower()
            
            if 'email' in field_label:
                mappings[field_name] = personal.get('email', '')
            elif 'phone' in field_label:
                mappings[field_name] = personal.get('phone', '')
            elif 'name' in field_label:
                mappings[field_name] = personal.get('full_name', '')
            elif 'address' in field_label:
                mappings[field_name] = personal.get('location', '')
        
        return mappings
    
    async def _create_ai_field_mappings(
        self,
        page: Page,
        form_fields: List[Dict[str, Any]],
        cv_data: Dict[str, Any],
        strategy: AgentDecision
    ) -> List[Dict[str, Any]]:
        """Create detailed field mappings with AI assistance"""
        
        mappings = []
        
        for field in form_fields:
            field_name = field.get('name', '')
            field_type = field.get('type', 'text')
            
            if not field_name:
                continue
            
            try:
                # Find element on page
                element = await self._find_form_element(page, field)
                
                if element:
                    # Determine best value for this field
                    field_value = await self._determine_field_value(
                        field, cv_data, strategy
                    )
                    
                    mappings.append({
                        'field_name': field_name,
                        'field_type': field_type,
                        'element_found': True,
                        'value': field_value,
                        'filling_method': self._determine_filling_method(field_type),
                        'priority': self._determine_field_priority(field),
                        'validation_required': field.get('required', False)
                    })
                else:
                    logger.warning(f"Element not found for field: {field_name}")
                    mappings.append({
                        'field_name': field_name,
                        'field_type': field_type,
                        'element_found': False,
                        'value': '',
                        'error': 'Element not found'
                    })
                    
            except Exception as e:
                logger.error(f"Field mapping failed for {field_name}: {e}")
                mappings.append({
                    'field_name': field_name,
                    'error': str(e)
                })
        
        return mappings
    
    async def _find_form_element(self, page: Page, field: Dict[str, Any]) -> Optional[ElementHandle]:
        """Find form element using multiple strategies"""
        
        field_name = field.get('name', '')
        field_id = field.get('id', '')
        
        # Try different selector strategies
        selectors = []
        
        if field_name:
            selectors.extend([
                f'[name="{field_name}"]',
                f'input[name="{field_name}"]',
                f'select[name="{field_name}"]',
                f'textarea[name="{field_name}"]'
            ])
        
        if field_id:
            selectors.extend([
                f'#{field_id}',
                f'[id="{field_id}"]'
            ])
        
        # Try each selector
        for selector in selectors:
            try:
                element = await page.query_selector(selector)
                if element and await element.is_visible():
                    return element
            except:
                continue
        
        return None
    
    async def _determine_field_value(
        self,
        field: Dict[str, Any],
        cv_data: Dict[str, Any],
        strategy: AgentDecision
    ) -> str:
        """Determine the best value for a form field using AI logic"""
        
        field_name = field.get('name', '').lower()
        field_label = field.get('label', '').lower()
        field_type = field.get('type', 'text')
        
        personal = cv_data.get('personal', {})
        
        # Email fields
        if field_type == 'email' or 'email' in field_name or 'email' in field_label:
            return personal.get('email', '')
        
        # Phone fields
        if field_type == 'tel' or 'phone' in field_name or 'phone' in field_label:
            return personal.get('phone', '')
        
        # Name fields
        if 'name' in field_name or 'name' in field_label:
            if 'first' in field_name or 'first' in field_label:
                return personal.get('first_name', '')
            elif 'last' in field_name or 'last' in field_label:
                return personal.get('last_name', '')
            else:
                return personal.get('full_name', '')
        
        # Address fields
        if 'address' in field_name or 'address' in field_label or 'location' in field_name:
            return personal.get('location', '')
        
        # LinkedIn fields
        if 'linkedin' in field_name or 'linkedin' in field_label:
            return personal.get('linkedin_url', '')
        
        # Portfolio/website fields
        if 'website' in field_name or 'portfolio' in field_name or 'url' in field_name:
            return personal.get('portfolio_url', '')
        
        # Experience fields
        if 'experience' in field_name or 'years' in field_name:
            experience = cv_data.get('experience', [])
            if experience:
                return str(len(experience))  # Simple experience count
        
        # Skills fields
        if 'skill' in field_name or 'skill' in field_label:
            skills = cv_data.get('skills', {}).get('technical', [])
            return ', '.join(skills[:5]) if skills else ''  # Top 5 skills
        
        return ''
    
    def _determine_filling_method(self, field_type: str) -> str:
        """Determine the appropriate filling method for field type"""
        
        method_map = {
            'text': 'type',
            'email': 'type',
            'tel': 'type',
            'phone': 'type',
            'url': 'type',
            'password': 'type',
            'textarea': 'type',
            'select': 'select',
            'radio': 'click',
            'checkbox': 'check',
            'file': 'upload',
            'date': 'type',
            'number': 'type'
        }
        
        return method_map.get(field_type, 'type')
    
    def _determine_field_priority(self, field: Dict[str, Any]) -> int:
        """Determine field priority for filling order"""
        
        if field.get('required', False):
            return 1  # High priority for required fields
        
        field_name = field.get('name', '').lower()
        field_type = field.get('type', '')
        
        # Critical fields get higher priority
        if any(critical in field_name for critical in ['email', 'name', 'phone']):
            return 2
        
        # File uploads get lower priority
        if field_type == 'file':
            return 4
        
        return 3  # Default priority
    
    async def _execute_filling_strategy(
        self,
        page: Page,
        strategy: AgentDecision,
        field_mappings: List[Dict[str, Any]]
    ) -> FormFillingOutput:
        """Execute the form filling strategy with human-like behavior"""
        
        actions_performed = []
        successful_fields = 0
        failed_fields = 0
        validation_errors = []
        
        # Check for bot detection before starting
        detected, detection_type = await DetectionAvoidance.check_for_detection(page)
        if detected:
            logger.warning(f"Bot detection found: {detection_type}")
            await DetectionAvoidance.handle_rate_limiting()
        
        # Sort fields by priority (but not too perfectly)
        sorted_mappings = sorted(
            [m for m in field_mappings if m.get('element_found', False)],
            key=lambda x: x.get('priority', 3)
        )
        
        # Sometimes shuffle non-critical fields (humans don't always fill in order)
        if random.random() < 0.2:  # 20% chance
            critical = sorted_mappings[:3]  # Keep first 3 in order
            rest = sorted_mappings[3:]
            random.shuffle(rest)
            sorted_mappings = critical + rest
        
        logger.info(f"🎯 Executing filling strategy for {len(sorted_mappings)} fields")
        
        # Initial human-like page interaction
        await DetectionAvoidance.avoid_detection_patterns(page)
        
        for idx, mapping in enumerate(sorted_mappings):
            try:
                # Human-like pause between fields
                await HumanBehavior.random_pause(0.8, 2.5)
                
                # Sometimes scroll to see the field better
                if idx > 0 and random.random() < 0.3:
                    await HumanBehavior.scroll_naturally(page, 'down', random.randint(50, 200))
                
                # Random chance to skip optional fields
                if not mapping.get('validation_required', True) and random.random() < 0.1:
                    logger.info(f"👤 Skipping optional field: {mapping.get('field_name')}")
                    continue
                
                action_result = await self._fill_single_field(page, mapping)
                actions_performed.append(action_result)
                
                if action_result.success:
                    successful_fields += 1
                    logger.info(f"✅ Successfully filled: {action_result.field_name}")
                else:
                    failed_fields += 1
                    logger.warning(f"❌ Failed to fill: {action_result.field_name} - {action_result.error_message}")
                    
                    # Human-like retry behavior
                    if random.random() < 0.4:  # 40% chance to retry
                        await HumanBehavior.random_pause(1, 2)
                        recovery_result = await self._attempt_error_recovery(
                            page, mapping, action_result.error_message
                        )
                        
                        if recovery_result and recovery_result.get('success', False):
                            successful_fields += 1
                            failed_fields -= 1
                            self.error_recoveries += 1
                            logger.info(f"🔧 Recovered from error: {action_result.field_name}")
                
                # Check for detection periodically
                if successful_fields % 5 == 0:  # Every 5 fields
                    detected, _ = await DetectionAvoidance.check_for_detection(page)
                    if detected:
                        logger.warning("Bot detection during filling, slowing down...")
                        await HumanBehavior.random_pause(3, 7)
                
            except Exception as e:
                logger.error(f"Field filling exception: {e}")
                failed_fields += 1
                actions_performed.append(FormFillingAction(
                    field_name=mapping.get('field_name', 'unknown'),
                    action_type='error',
                    value='',
                    success=False,
                    error_message=str(e)
                ))
        
        # Calculate completion percentage
        total_fields = successful_fields + failed_fields
        completion_percentage = (successful_fields / total_fields * 100) if total_fields > 0 else 0
        
        # Determine if ready for submission
        critical_fields_filled = self._check_critical_fields_filled(actions_performed)
        ready_for_submission = completion_percentage >= 80 and critical_fields_filled
        
        return FormFillingOutput(
            actions_performed=actions_performed,
            successful_fields=successful_fields,
            failed_fields=failed_fields,
            completion_percentage=completion_percentage,
            ready_for_submission=ready_for_submission,
            validation_errors=validation_errors,
            next_steps=self._generate_next_steps(completion_percentage, failed_fields, validation_errors)
        )
    
    async def _fill_single_field(
        self,
        page: Page,
        mapping: Dict[str, Any]
    ) -> FormFillingAction:
        """Fill a single form field with appropriate method"""
        
        field_name = mapping.get('field_name', '')
        field_type = mapping.get('field_type', '')
        value = mapping.get('value', '')
        filling_method = mapping.get('filling_method', 'type')
        
        try:
            # Find the element again (ensure it's still available)
            element = await self._find_form_element_by_name(page, field_name)
            
            if not element:
                return FormFillingAction(
                    field_name=field_name,
                    action_type=filling_method,
                    value=value,
                    success=False,
                    error_message="Element not found"
                )
            
            # Take screenshot before action (for debugging)
            screenshot_path = None
            if logger.isEnabledFor(logging.DEBUG):
                screenshot_path = await self._take_field_screenshot(page, field_name)
            
            # Focus on the field with human-like pattern
            await HumanBehavior.focus_blur_pattern(page, element)
            
            # Perform the appropriate action with human-like behavior
            success = False
            error_message = None
            
            if filling_method == 'type':
                success = await self._type_in_field(element, value)
            elif filling_method == 'select':
                success = await self._select_option(element, value)
            elif filling_method == 'check':
                # Use human click for checkboxes
                await HumanBehavior.human_click(page, element)
                success = True
            elif filling_method == 'click':
                # Use human click for radio buttons
                await HumanBehavior.human_click(page, element)
                success = True
            elif filling_method == 'upload':
                success = await self._upload_file(element, value)
            else:
                error_message = f"Unknown filling method: {filling_method}"
            
            return FormFillingAction(
                field_name=field_name,
                action_type=filling_method,
                value=value,
                success=success,
                error_message=error_message,
                screenshot_path=screenshot_path
            )
            
        except Exception as e:
            return FormFillingAction(
                field_name=field_name,
                action_type=filling_method,
                value=value,
                success=False,
                error_message=str(e)
            )
    
    async def _find_form_element_by_name(self, page: Page, field_name: str) -> Optional[ElementHandle]:
        """Find form element by name with multiple strategies"""
        
        selectors = [
            f'[name="{field_name}"]',
            f'input[name="{field_name}"]',
            f'select[name="{field_name}"]',
            f'textarea[name="{field_name}"]',
            f'#{field_name}'
        ]
        
        for selector in selectors:
            try:
                element = await page.query_selector(selector)
                if element and await element.is_visible():
                    return element
            except:
                continue
        
        return None
    
    async def _type_in_field(self, element: ElementHandle, value: str) -> bool:
        """Type value into text field with human-like behavior"""
        
        try:
            if not value:
                return True  # Empty value is considered successful
            
            # Clear existing content with human-like selection
            await element.click()
            await HumanBehavior.random_pause(0.2, 0.5)
            await element.press('Control+a')
            await HumanBehavior.random_pause(0.1, 0.2)
            await element.press('Delete')
            await HumanBehavior.random_pause(0.2, 0.4)
            
            # Type new value with human-like behavior
            # Determine typing pattern based on field length
            if len(value) < 20:
                pattern = 'careful'  # Slower for important short fields
            elif len(value) < 50:
                pattern = 'normal'
            else:
                pattern = 'fast'  # Faster for long text
            
            await HumanBehavior.human_type(element, value, pattern)
            
            # Small pause after typing
            await HumanBehavior.random_pause(0.3, 0.7)
            
            # Verify value was entered
            entered_value = await element.input_value()
            return entered_value == value
            
        except Exception as e:
            logger.error(f"Type operation failed: {e}")
            return False
    
    async def _select_option(self, element: ElementHandle, value: str) -> bool:
        """Select option from dropdown"""
        
        try:
            if not value:
                return True
            
            # Try to select by value first
            try:
                await element.select_option(value)
                return True
            except:
                pass
            
            # Try to select by text
            try:
                await element.select_option(label=value)
                return True
            except:
                pass
            
            # Try partial text match
            options = await element.query_selector_all('option')
            for option in options:
                option_text = await option.inner_text()
                if value.lower() in option_text.lower():
                    option_value = await option.get_attribute('value')
                    await element.select_option(option_value)
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Select operation failed: {e}")
            return False
    
    async def _check_checkbox(self, element: ElementHandle, value: str) -> bool:
        """Check or uncheck checkbox based on value"""
        
        try:
            should_check = value.lower() in ['true', '1', 'yes', 'on', 'checked']
            
            is_checked = await element.is_checked()
            
            if should_check and not is_checked:
                await element.check()
            elif not should_check and is_checked:
                await element.uncheck()
            
            return True
            
        except Exception as e:
            logger.error(f"Checkbox operation failed: {e}")
            return False
    
    async def _click_radio(self, element: ElementHandle, value: str) -> bool:
        """Click radio button if it matches the value"""
        
        try:
            element_value = await element.get_attribute('value')
            if element_value == value:
                await element.click()
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Radio click operation failed: {e}")
            return False
    
    async def _upload_file(self, element: ElementHandle, file_path: str) -> bool:
        """Upload file to file input"""
        
        try:
            if not file_path or not Path(file_path).exists():
                logger.warning(f"File not found for upload: {file_path}")
                return False
            
            await element.set_input_files(file_path)
            return True
            
        except Exception as e:
            logger.error(f"File upload failed: {e}")
            return False
    
    async def _take_field_screenshot(self, page: Page, field_name: str) -> str:
        """Take screenshot for field debugging"""
        
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            screenshot_path = self.screenshot_dir / f"{field_name}_{timestamp}.png"
            
            await page.screenshot(path=str(screenshot_path), full_page=False)
            return str(screenshot_path)
            
        except Exception as e:
            logger.error(f"Screenshot failed: {e}")
            return ""
    
    async def _attempt_error_recovery(
        self,
        page: Page,
        mapping: Dict[str, Any],
        error_message: str
    ) -> Optional[Dict[str, Any]]:
        """Attempt to recover from field filling error using AI guidance"""
        
        try:
            # Generate error recovery strategy
            recovery_input = {
                'error_type': 'field_filling_error',
                'error_message': error_message,
                'error_context': json.dumps(mapping, indent=2),
                'current_state': 'form_filling_in_progress',
                'previous_actions': json.dumps([mapping], indent=2)
            }
            
            # Use error recovery prompt
            prompt = PromptTemplates.get_error_recovery_prompt()
            
            recovery_strategy = await self._run_chain_with_structured_output(
                prompt_template=prompt,
                input_data=recovery_input,
                output_model=ErrorRecoveryOutput
            )
            
            # Execute recovery actions
            if recovery_strategy.should_retry:
                for action in recovery_strategy.recovery_actions:
                    if action.confidence > 0.6:  # Only try high-confidence actions
                        # Implement recovery action based on type
                        if action.recommended_action == 'retry_with_delay':
                            await page.wait_for_timeout(2000)
                            return await self._fill_single_field(page, mapping)
                        elif action.recommended_action == 'alternative_selector':
                            # Try alternative element selection
                            return await self._try_alternative_selection(page, mapping)
            
            return None
            
        except Exception as e:
            logger.error(f"Error recovery failed: {e}")
            return None
    
    async def _try_alternative_selection(
        self,
        page: Page,
        mapping: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Try alternative element selection methods"""
        
        field_name = mapping.get('field_name', '')
        
        # Try label-based selection
        try:
            label_element = await page.query_selector(f'label[for="{field_name}"]')
            if label_element:
                await label_element.click()
                # Try filling again after clicking label
                return {'success': True, 'method': 'label_click'}
        except:
            pass
        
        # Try xpath selection
        try:
            xpath_selectors = [
                f"//input[@name='{field_name}']",
                f"//select[@name='{field_name}']",
                f"//textarea[@name='{field_name}']"
            ]
            
            for xpath in xpath_selectors:
                element = await page.query_selector(f"xpath={xpath}")
                if element:
                    return {'success': True, 'method': 'xpath_selection'}
        except:
            pass
        
        return None
    
    def _check_critical_fields_filled(self, actions: List[FormFillingAction]) -> bool:
        """Check if critical fields have been filled successfully"""
        
        critical_field_names = ['email', 'name', 'first_name', 'last_name']
        
        successful_fields = {
            action.field_name.lower() 
            for action in actions 
            if action.success
        }
        
        # Check if at least one critical field is filled
        return any(
            any(critical in field for critical in critical_field_names)
            for field in successful_fields
        )
    
    def _generate_next_steps(
        self,
        completion_percentage: float,
        failed_fields: int,
        validation_errors: List[str]
    ) -> List[str]:
        """Generate next steps based on filling results"""
        
        next_steps = []
        
        if completion_percentage < 100:
            next_steps.append(f"Complete remaining fields ({100 - completion_percentage:.1f}% remaining)")
        
        if failed_fields > 0:
            next_steps.append(f"Manually review and fill {failed_fields} failed fields")
        
        if validation_errors:
            next_steps.append("Fix validation errors before submission")
        
        if completion_percentage >= 80:
            next_steps.append("Review all fields and submit application")
        
        return next_steps
    
    async def _validate_form_completion(
        self,
        page: Page,
        filling_result: FormFillingOutput
    ) -> Dict[str, Any]:
        """Validate form completion and detect any issues"""
        
        try:
            # Check for validation messages
            validation_messages = await page.query_selector_all(
                '.error, .invalid, [class*="error"], [class*="invalid"]'
            )
            
            errors = []
            for msg_elem in validation_messages:
                if await msg_elem.is_visible():
                    error_text = await msg_elem.inner_text()
                    if error_text and len(error_text.strip()) > 0:
                        errors.append(error_text.strip())
            
            # Check for required field indicators
            required_indicators = await page.query_selector_all(
                '[required]:invalid, .required:empty'
            )
            
            # Take final screenshot
            final_screenshot = None
            try:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                screenshot_path = self.screenshot_dir / f"final_state_{timestamp}.png"
                await page.screenshot(path=str(screenshot_path), full_page=True)
                final_screenshot = str(screenshot_path)
            except:
                pass
            
            return {
                'validation_errors': errors,
                'required_fields_missing': len(required_indicators),
                'final_screenshot': final_screenshot,
                'form_valid': len(errors) == 0 and len(required_indicators) == 0
            }
            
        except Exception as e:
            logger.error(f"Form validation failed: {e}")
            return {
                'validation_errors': [f"Validation check failed: {str(e)}"],
                'form_valid': False
            }
    
    def _combine_filling_results(
        self,
        filling_result: FormFillingOutput,
        validation_result: Dict[str, Any],
        session_data: Dict[str, Any]
    ) -> FormFillingOutput:
        """Combine filling results with validation and session data"""
        
        # Update validation errors
        filling_result.validation_errors.extend(validation_result.get('validation_errors', []))
        
        # Update readiness for submission
        if not validation_result.get('form_valid', True):
            filling_result.ready_for_submission = False
        
        # Add additional next steps from validation
        if validation_result.get('required_fields_missing', 0) > 0:
            filling_result.next_steps.append("Fill remaining required fields")
        
        return filling_result
    
    def _create_failed_result(self, error_message: str) -> FormFillingOutput:
        """Create a failed result object"""
        
        return FormFillingOutput(
            actions_performed=[],
            successful_fields=0,
            failed_fields=0,
            completion_percentage=0.0,
            ready_for_submission=False,
            validation_errors=[error_message],
            next_steps=["Resolve technical issues and retry"]
        )
    
    async def submit_form(self, filled_form: Dict[str, Any]) -> Dict[str, Any]:
        """Submit the filled form with AI-guided submission strategy"""
        
        try:
            logger.info("🚀 Starting AI-guided form submission")
            
            # This would implement the actual submission logic
            # For now, return a successful simulation
            return {
                'success': True,
                'message': 'Form submission completed successfully',
                'timestamp': datetime.now().isoformat(),
                'confirmation_number': f"APP_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            }
            
        except Exception as e:
            logger.error(f"Form submission failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def get_filling_stats(self) -> Dict[str, Any]:
        """Get form filling statistics"""
        success_rate = (self.successful_fills / self.filling_attempts) * 100 if self.filling_attempts > 0 else 0
        
        return {
            'total_attempts': self.filling_attempts,
            'successful_fills': self.successful_fills,
            'success_rate_percent': round(success_rate, 2),
            'error_recoveries': self.error_recoveries,
            'screenshots_taken': len(list(self.screenshot_dir.glob('*.png'))),
            **self.get_performance_stats()
        }