"""
Browser Form Filler - AI-powered form filling using browser automation

This service handles:
- Intelligent form field detection and mapping
- AI-powered form filling with CV data
- File upload handling
- Form validation and error handling
- Screenshot capture for review
"""

import asyncio
import logging
import os
import base64
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path

from playwright.async_api import async_playwright, Browser, Page, ElementHandle
import openai

logger = logging.getLogger(__name__)

class BrowserFormFiller:
    """
    Service for filling job application forms using browser automation and AI
    """
    
    def __init__(self, openai_api_key: str):
        self.openai_api_key = openai_api_key
        self.openai_client = openai.AsyncOpenAI(api_key=openai_api_key) if openai_api_key else None
        
    async def fill_form(
        self,
        url: str,
        form_fields: List[Dict[str, Any]],
        cv_data: Dict[str, Any],
        job_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Fill a job application form with CV data
        
        Args:
            url: Application form URL
            form_fields: List of form fields from analysis
            cv_data: Structured CV data
            job_data: Job information
            
        Returns:
            Dictionary containing filling results
        """
        try:
            logger.info(f"🖥️ Starting form filling for: {url}")
            
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    viewport={'width': 1920, 'height': 1080}
                )
                page = await context.new_page()
                
                try:
                    # Navigate to form
                    await page.goto(url, wait_until='networkidle', timeout=30000)
                    await page.wait_for_timeout(3000)
                    
                    # Handle popups
                    await self._handle_popups(page)
                    
                    # Take initial screenshot
                    screenshots = []
                    initial_screenshot = await page.screenshot(full_page=True)
                    screenshots.append({
                        'type': 'initial',
                        'timestamp': datetime.utcnow().isoformat(),
                        'data': base64.b64encode(initial_screenshot).decode()
                    })
                    
                    # Map CV data to form fields
                    field_mappings = await self._map_cv_to_fields(form_fields, cv_data)
                    
                    # Fill form fields
                    filled_data = {}
                    validation_errors = []
                    
                    for field_info in form_fields:
                        field_name = field_info.get('name', '')
                        if not field_name:
                            continue
                        
                        try:
                            field_value = field_mappings.get(field_name, '')
                            if field_value:
                                success = await self._fill_field(page, field_info, field_value)
                                if success:
                                    filled_data[field_name] = field_value
                                    logger.info(f"✅ Filled field: {field_name}")
                                else:
                                    logger.warning(f"⚠️ Failed to fill field: {field_name}")
                        except Exception as e:
                            logger.error(f"❌ Error filling field {field_name}: {e}")
                            validation_errors.append(f"Failed to fill {field_name}: {str(e)}")
                    
                    # Handle file uploads
                    await self._handle_file_uploads(page, form_fields, cv_data)
                    
                    # Take post-filling screenshot
                    post_fill_screenshot = await page.screenshot(full_page=True)
                    screenshots.append({
                        'type': 'filled',
                        'timestamp': datetime.utcnow().isoformat(),
                        'data': base64.b64encode(post_fill_screenshot).decode()
                    })
                    
                    # Validate form
                    validation_result = await self._validate_form(page, form_fields)
                    validation_errors.extend(validation_result.get('errors', []))
                    
                    # Check if form is ready for submission
                    ready_for_submission = len(validation_errors) == 0 and len(filled_data) > 0
                    
                    logger.info(f"✅ Form filling completed. Filled {len(filled_data)} fields, {len(validation_errors)} errors")
                    
                    return {
                        'success': True,
                        'filled_data': filled_data,
                        'field_mappings': field_mappings,
                        'screenshots': screenshots,
                        'validation_errors': validation_errors,
                        'completion_status': 'completed',
                        'ready_for_submission': ready_for_submission,
                        'page_url': url
                    }
                    
                finally:
                    await browser.close()
                    
        except Exception as e:
            logger.error(f"❌ Form filling failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'filled_data': {},
                'screenshots': [],
                'validation_errors': [str(e)],
                'completion_status': 'failed',
                'ready_for_submission': False
            }
    
    async def submit_form(self, filled_form: Dict[str, Any]) -> Dict[str, Any]:
        """
        Submit a filled application form
        
        Args:
            filled_form: Form data ready for submission
            
        Returns:
            Dictionary containing submission results
        """
        try:
            logger.info(f"🚀 Submitting form")
            
            url = filled_form.get('page_url')
            if not url:
                raise ValueError("No page URL provided for submission")
            
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context()
                page = await context.new_page()
                
                try:
                    # Navigate back to form
                    await page.goto(url, wait_until='networkidle')
                    await page.wait_for_timeout(2000)
                    
                    # Re-fill form quickly (in case page reloaded)
                    # This is a simplified re-fill - in production you'd store the page state
                    
                    # Find submit button
                    submit_button = await self._find_submit_button(page)
                    
                    if not submit_button:
                        raise Exception("Submit button not found")
                    
                    # Take pre-submission screenshot
                    pre_submit_screenshot = await page.screenshot(full_page=True)
                    
                    # Check for any final validation or captcha
                    has_captcha = await self._check_for_captcha(page)
                    if has_captcha:
                        return {
                            'success': False,
                            'error': 'CAPTCHA detected - manual intervention required',
                            'requires_manual_action': True,
                            'captcha_detected': True
                        }
                    
                    # Submit the form
                    await submit_button.click()
                    
                    # Wait for submission response
                    await page.wait_for_timeout(5000)
                    
                    # Check for success indicators
                    success_indicators = [
                        'thank you',
                        'application submitted',
                        'successfully submitted',
                        'confirmation',
                        'received your application'
                    ]
                    
                    page_content = await page.content()
                    page_text = page_content.lower()
                    
                    submission_successful = any(indicator in page_text for indicator in success_indicators)
                    
                    # Take post-submission screenshot
                    post_submit_screenshot = await page.screenshot(full_page=True)
                    
                    if submission_successful:
                        logger.info("✅ Form submitted successfully")
                        return {
                            'success': True,
                            'submission_url': page.url,
                            'confirmation_page': True,
                            'timestamp': datetime.utcnow().isoformat(),
                            'screenshots': {
                                'pre_submit': base64.b64encode(pre_submit_screenshot).decode(),
                                'post_submit': base64.b64encode(post_submit_screenshot).decode()
                            }
                        }
                    else:
                        logger.warning("⚠️ Form submission unclear - no clear success indicators")
                        return {
                            'success': False,
                            'error': 'Submission status unclear - no success confirmation found',
                            'submission_url': page.url,
                            'requires_manual_verification': True,
                            'screenshots': {
                                'pre_submit': base64.b64encode(pre_submit_screenshot).decode(),
                                'post_submit': base64.b64encode(post_submit_screenshot).decode()
                            }
                        }
                    
                finally:
                    await browser.close()
                    
        except Exception as e:
            logger.error(f"❌ Form submission failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def _map_cv_to_fields(
        self, 
        form_fields: List[Dict[str, Any]], 
        cv_data: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Map CV data to form fields using AI
        """
        try:
            if not self.openai_client:
                return self._basic_field_mapping(form_fields, cv_data)
            
            # Prepare data for AI mapping
            personal_info = cv_data.get('personal', {})
            current_exp = cv_data.get('current_experience', {})
            education = cv_data.get('education', {})
            skills = cv_data.get('skills', {})
            
            field_descriptions = []
            for field in form_fields:
                field_descriptions.append({
                    'name': field.get('name', ''),
                    'type': field.get('type', ''),
                    'label': field.get('label', ''),
                    'ai_mapping': field.get('ai_mapping', ''),
                    'required': field.get('required', False)
                })
            
            prompt = f"""
            Map CV data to form fields. Return a JSON object with field names as keys and values to fill.
            
            Form Fields:
            {field_descriptions}
            
            CV Data:
            Personal Info: {personal_info}
            Current Experience: {current_exp}
            Education: {education}
            Skills: {skills}
            
            Return a JSON object like:
            {{
                "field_name_1": "value_to_fill",
                "field_name_2": "another_value"
            }}
            
            Rules:
            - Use exact field names from the form
            - Provide appropriate values from CV data
            - For skills fields, provide comma-separated skills
            - For experience fields, use current job info
            - Keep values concise and appropriate for form fields
            - Only include fields that have matching CV data
            
            Return only the JSON object, no additional text.
            """
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert at mapping CV data to form fields. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1000
            )
            
            mapping_text = response.choices[0].message.content
            field_mappings = json.loads(mapping_text)
            
            logger.info(f"✅ AI field mapping completed: {len(field_mappings)} mappings")
            return field_mappings
            
        except Exception as e:
            logger.warning(f"AI field mapping failed, using basic mapping: {e}")
            return self._basic_field_mapping(form_fields, cv_data)
    
    def _basic_field_mapping(
        self, 
        form_fields: List[Dict[str, Any]], 
        cv_data: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Basic field mapping without AI
        """
        mappings = {}
        personal_info = cv_data.get('personal', {})
        
        for field in form_fields:
            field_name = field.get('name', '').lower()
            ai_mapping = field.get('ai_mapping', '')
            
            # Map common fields
            if ai_mapping == 'first_name' and personal_info.get('first_name'):
                mappings[field.get('name', '')] = personal_info['first_name']
            elif ai_mapping == 'last_name' and personal_info.get('last_name'):
                mappings[field.get('name', '')] = personal_info['last_name']
            elif ai_mapping == 'full_name' and personal_info.get('full_name'):
                mappings[field.get('name', '')] = personal_info['full_name']
            elif ai_mapping == 'email' and personal_info.get('email'):
                mappings[field.get('name', '')] = personal_info['email']
            elif ai_mapping == 'phone' and personal_info.get('phone'):
                mappings[field.get('name', '')] = personal_info['phone']
            elif ai_mapping == 'location' and personal_info.get('location'):
                mappings[field.get('name', '')] = personal_info['location']
        
        return mappings
    
    async def _fill_field(self, page: Page, field_info: Dict[str, Any], value: str) -> bool:
        """
        Fill a specific form field
        """
        try:
            field_name = field_info.get('name', '')
            field_type = field_info.get('type', '')
            field_id = field_info.get('id', '')
            
            # Try different selectors to find the field
            selectors = []
            if field_name:
                selectors.extend([
                    f'[name="{field_name}"]',
                    f'input[name="{field_name}"]',
                    f'select[name="{field_name}"]',
                    f'textarea[name="{field_name}"]'
                ])
            if field_id:
                selectors.append(f'#{field_id}')
            
            element = None
            for selector in selectors:
                try:
                    element = await page.wait_for_selector(selector, timeout=2000)
                    if element:
                        break
                except:
                    continue
            
            if not element:
                logger.warning(f"Field not found: {field_name}")
                return False
            
            # Fill based on field type
            if field_type in ['text', 'email', 'tel', 'input']:
                await element.fill(value)
            elif field_type == 'textarea':
                await element.fill(value)
            elif field_type == 'select':
                # Try to select by value or text
                try:
                    await element.select_option(value=value)
                except:
                    try:
                        await element.select_option(label=value)
                    except:
                        logger.warning(f"Could not select option '{value}' in select field {field_name}")
                        return False
            else:
                # Try as text input
                await element.fill(value)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to fill field {field_info.get('name', '')}: {e}")
            return False
    
    async def _handle_file_uploads(
        self, 
        page: Page, 
        form_fields: List[Dict[str, Any]], 
        cv_data: Dict[str, Any]
    ):
        """
        Handle file uploads (CV, cover letter, etc.)
        """
        try:
            cv_file_path = cv_data.get('cv_file_path')
            cv_file_url = cv_data.get('cv_file_url')
            
            # Find file upload fields
            file_fields = [f for f in form_fields if f.get('type') == 'file']
            
            for field in file_fields:
                field_name = field.get('name', '')
                purpose = field.get('ai_mapping', '')
                
                if 'cv' in purpose.lower() or 'resume' in purpose.lower():
                    if cv_file_path and os.path.exists(cv_file_path):
                        # Upload local file
                        selector = f'[name="{field_name}"]'
                        file_input = await page.wait_for_selector(selector)
                        if file_input:
                            await file_input.set_input_files(cv_file_path)
                            logger.info(f"✅ Uploaded CV file to {field_name}")
                    elif cv_file_url:
                        # Download and upload file from URL
                        # This would require downloading the file first
                        logger.info(f"ℹ️ CV file URL provided but local upload needed: {field_name}")
            
        except Exception as e:
            logger.error(f"File upload handling failed: {e}")
    
    async def _handle_popups(self, page: Page):
        """Handle popups and overlays"""
        try:
            popup_selectors = [
                'button:has-text("Accept")',
                'button:has-text("OK")',
                'button:has-text("Continue")',
                'button:has-text("Close")',
                '[data-testid*="close"]',
                '.modal-close',
                '.popup-close'
            ]
            
            for selector in popup_selectors:
                try:
                    element = await page.wait_for_selector(selector, timeout=2000)
                    if element and await element.is_visible():
                        await element.click()
                        await page.wait_for_timeout(1000)
                        break
                except:
                    continue
                    
        except Exception as e:
            logger.debug(f"Popup handling: {e}")
    
    async def _validate_form(self, page: Page, form_fields: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate form completion
        """
        try:
            errors = []
            
            # Check for validation error messages
            error_selectors = [
                '.error',
                '.field-error',
                '.validation-error',
                '[class*="error"]',
                '.invalid'
            ]
            
            for selector in error_selectors:
                try:
                    error_elements = await page.query_selector_all(selector)
                    for element in error_elements:
                        if await element.is_visible():
                            error_text = await element.inner_text()
                            if error_text.strip():
                                errors.append(error_text.strip())
                except:
                    continue
            
            # Check required fields
            for field in form_fields:
                if field.get('required', False):
                    field_name = field.get('name', '')
                    selector = f'[name="{field_name}"]'
                    try:
                        element = await page.wait_for_selector(selector, timeout=1000)
                        if element:
                            value = await element.input_value()
                            if not value or not value.strip():
                                errors.append(f"Required field '{field_name}' is empty")
                    except:
                        continue
            
            return {
                'valid': len(errors) == 0,
                'errors': errors
            }
            
        except Exception as e:
            logger.error(f"Form validation failed: {e}")
            return {
                'valid': False,
                'errors': [f"Validation failed: {str(e)}"]
            }
    
    async def _find_submit_button(self, page: Page) -> Optional[ElementHandle]:
        """Find the form submit button"""
        submit_selectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Submit")',
            'button:has-text("Apply")',
            'button:has-text("Send")',
            'button:has-text("Continue")',
            '[data-testid*="submit"]',
            '[data-test*="submit"]'
        ]
        
        for selector in submit_selectors:
            try:
                element = await page.wait_for_selector(selector, timeout=2000)
                if element and await element.is_visible():
                    return element
            except:
                continue
        
        return None
    
    async def _check_for_captcha(self, page: Page) -> bool:
        """Check if there's a CAPTCHA on the page"""
        captcha_indicators = [
            '.captcha',
            '.recaptcha',
            '[class*="captcha"]',
            'iframe[src*="recaptcha"]',
            '#captcha'
        ]
        
        for selector in captcha_indicators:
            try:
                element = await page.wait_for_selector(selector, timeout=1000)
                if element and await element.is_visible():
                    return True
            except:
                continue
        
        return False