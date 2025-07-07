"""
Form Analysis Service - AI-powered job application form analysis

This service analyzes job application forms to understand:
- Form structure and field types
- Required vs optional fields
- File upload requirements
- Multi-step workflows
- Form complexity and submission process
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
import json
import re

from playwright.async_api import async_playwright, Browser, Page
import openai

logger = logging.getLogger(__name__)

class FormAnalysisService:
    """
    Service for analyzing job application forms using AI and browser automation
    """
    
    def __init__(self, openai_api_key: str):
        self.openai_api_key = openai_api_key
        self.openai_client = openai.AsyncOpenAI(api_key=openai_api_key) if openai_api_key else None
        self.browser: Optional[Browser] = None
        
    async def analyze_form(self, url: str) -> Dict[str, Any]:
        """
        Analyze a job application form
        
        Args:
            url: URL of the job application page
            
        Returns:
            Dictionary containing form analysis results
        """
        try:
            logger.info(f"🔍 Starting form analysis for: {url}")
            
            # Step 1: Load the page and extract HTML structure
            page_data = await self._load_page(url)
            
            if not page_data['success']:
                return {'success': False, 'error': page_data['error']}
            
            # Step 2: Analyze form structure using AI
            form_analysis = await self._analyze_form_with_ai(
                page_data['html_content'],
                page_data['form_elements'],
                url
            )
            
            # Step 3: Detect form complexity and special features
            complexity_analysis = await self._analyze_form_complexity(
                page_data['form_elements'],
                page_data['html_content']
            )
            
            # Combine results
            result = {
                'success': True,
                'form_data': {
                    **form_analysis,
                    **complexity_analysis,
                    'page_title': page_data.get('page_title', ''),
                    'form_count': len(page_data.get('form_elements', [])),
                    'analysis_timestamp': asyncio.get_event_loop().time()
                }
            }
            
            logger.info(f"✅ Form analysis completed for {url}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Form analysis failed for {url}: {e}")
            return {
                'success': False,
                'error': str(e),
                'form_data': {}
            }
    
    async def _load_page(self, url: str) -> Dict[str, Any]:
        """
        Load the application page and extract form elements
        """
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
                )
                page = await context.new_page()
                
                # Navigate to the page
                response = await page.goto(url, wait_until='networkidle', timeout=30000)
                
                if not response or response.status >= 400:
                    await browser.close()
                    return {
                        'success': False,
                        'error': f'Failed to load page (HTTP {response.status if response else "unknown"})'
                    }
                
                # Wait for page to load completely
                await page.wait_for_timeout(3000)
                
                # Handle common popups
                await self._handle_page_popups(page)
                
                # Extract page data
                page_title = await page.title()
                html_content = await page.content()
                
                # Extract form elements
                form_elements = await self._extract_form_elements(page)
                
                await browser.close()
                
                return {
                    'success': True,
                    'page_title': page_title,
                    'html_content': html_content,
                    'form_elements': form_elements
                }
                
        except Exception as e:
            logger.error(f"Page loading failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _handle_page_popups(self, page: Page):
        """Handle common popups and overlays"""
        try:
            # Cookie banners
            cookie_selectors = [
                'button:has-text("Accept")',
                'button:has-text("OK")',
                'button:has-text("Allow")',
                'button:has-text("Agree")',
                '[data-test*="accept"]',
                '[id*="accept"]'
            ]
            
            for selector in cookie_selectors:
                try:
                    element = await page.wait_for_selector(selector, timeout=2000)
                    if element and await element.is_visible():
                        await element.click()
                        logger.info(f"Clicked popup: {selector}")
                        break
                except:
                    continue
                    
        except Exception as e:
            logger.debug(f"Popup handling error: {e}")
    
    async def _extract_form_elements(self, page: Page) -> List[Dict[str, Any]]:
        """
        Extract all form elements from the page
        """
        try:
            forms_data = await page.evaluate("""
                () => {
                    const forms = Array.from(document.querySelectorAll('form'));
                    return forms.map((form, index) => {
                        const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
                        const labels = Array.from(form.querySelectorAll('label'));
                        const buttons = Array.from(form.querySelectorAll('button, input[type="submit"]'));
                        
                        return {
                            formIndex: index,
                            action: form.action || '',
                            method: form.method || 'POST',
                            fields: inputs.map(input => ({
                                type: input.type || input.tagName.toLowerCase(),
                                name: input.name || '',
                                id: input.id || '',
                                placeholder: input.placeholder || '',
                                required: input.required || false,
                                value: input.value || '',
                                className: input.className || '',
                                label: input.labels?.[0]?.textContent?.trim() || ''
                            })),
                            labels: labels.map(label => ({
                                text: label.textContent?.trim() || '',
                                for: label.getAttribute('for') || ''
                            })),
                            buttons: buttons.map(button => ({
                                text: button.textContent?.trim() || button.value || '',
                                type: button.type || '',
                                className: button.className || ''
                            }))
                        };
                    });
                }
            """)
            
            return forms_data
            
        except Exception as e:
            logger.error(f"Form element extraction failed: {e}")
            return []
    
    async def _analyze_form_with_ai(
        self, 
        html_content: str, 
        form_elements: List[Dict[str, Any]], 
        url: str
    ) -> Dict[str, Any]:
        """
        Use AI to analyze the form structure and classify fields
        """
        if not self.openai_client:
            # Fallback analysis without AI
            return self._fallback_form_analysis(form_elements)
        
        try:
            # Prepare form data for AI analysis
            form_summary = self._prepare_form_summary(form_elements)
            
            prompt = f"""
            Analyze this job application form and return a JSON object with the analysis.
            
            URL: {url}
            
            Form Elements Summary:
            {json.dumps(form_summary, indent=2)}
            
            Please analyze and return a JSON object with this exact structure:
            {{
                "form_type": "ats|custom|simple|complex",
                "fields": [
                    {{
                        "name": "field_name",
                        "type": "text|email|phone|file|select|textarea",
                        "label": "human_readable_label",
                        "purpose": "personal_info|experience|education|skills|cover_letter|other",
                        "required": true/false,
                        "ai_mapping": "first_name|last_name|email|phone|resume|etc"
                    }}
                ],
                "file_uploads": [
                    {{
                        "field_name": "resume_upload",
                        "accepted_types": ["pdf", "doc", "docx"],
                        "required": true/false,
                        "purpose": "resume|cover_letter|portfolio"
                    }}
                ],
                "required_fields": ["field1", "field2"],
                "optional_fields": ["field3", "field4"],
                "multi_step": true/false,
                "estimated_difficulty": "easy|medium|hard",
                "confidence": 0.8
            }}
            
            Focus on identifying:
            1. Personal information fields (name, email, phone, address)
            2. Experience/education fields
            3. File upload requirements
            4. Required vs optional fields
            5. Form complexity (ATS, multi-step, etc.)
            
            Return only the JSON object, no additional text.
            """
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert at analyzing job application forms. Return only valid JSON."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=2000
            )
            
            analysis_text = response.choices[0].message.content
            analysis_data = json.loads(analysis_text)
            
            logger.info(f"✅ AI form analysis completed with confidence: {analysis_data.get('confidence', 0)}")
            return analysis_data
            
        except Exception as e:
            logger.warning(f"AI form analysis failed, using fallback: {e}")
            return self._fallback_form_analysis(form_elements)
    
    def _prepare_form_summary(self, form_elements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Prepare a summary of form elements for AI analysis
        """
        if not form_elements:
            return {"forms": []}
        
        summary = {
            "total_forms": len(form_elements),
            "forms": []
        }
        
        for form in form_elements:
            form_summary = {
                "action": form.get('action', ''),
                "method": form.get('method', ''),
                "field_count": len(form.get('fields', [])),
                "fields": []
            }
            
            for field in form.get('fields', []):
                form_summary["fields"].append({
                    "type": field.get('type', ''),
                    "name": field.get('name', ''),
                    "label": field.get('label', ''),
                    "placeholder": field.get('placeholder', ''),
                    "required": field.get('required', False)
                })
            
            summary["forms"].append(form_summary)
        
        return summary
    
    def _fallback_form_analysis(self, form_elements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Fallback form analysis without AI
        """
        if not form_elements:
            return {
                "form_type": "unknown",
                "fields": [],
                "file_uploads": [],
                "required_fields": [],
                "optional_fields": [],
                "multi_step": False,
                "estimated_difficulty": "medium",
                "confidence": 0.3
            }
        
        all_fields = []
        file_uploads = []
        required_fields = []
        optional_fields = []
        
        for form in form_elements:
            for field in form.get('fields', []):
                field_name = field.get('name', '')
                field_type = field.get('type', '')
                is_required = field.get('required', False)
                
                # Classify field
                purpose = self._classify_field_purpose(field_name, field.get('label', ''), field_type)
                ai_mapping = self._map_field_to_cv(field_name, field.get('label', ''))
                
                field_info = {
                    "name": field_name,
                    "type": field_type,
                    "label": field.get('label', ''),
                    "purpose": purpose,
                    "required": is_required,
                    "ai_mapping": ai_mapping
                }
                
                all_fields.append(field_info)
                
                if is_required:
                    required_fields.append(field_name)
                else:
                    optional_fields.append(field_name)
                
                # Check for file uploads
                if field_type == 'file':
                    file_uploads.append({
                        "field_name": field_name,
                        "accepted_types": ["pdf", "doc", "docx"],
                        "required": is_required,
                        "purpose": "resume" if "resume" in field_name.lower() else "document"
                    })
        
        return {
            "form_type": "custom",
            "fields": all_fields,
            "file_uploads": file_uploads,
            "required_fields": required_fields,
            "optional_fields": optional_fields,
            "multi_step": len(form_elements) > 1,
            "estimated_difficulty": "medium",
            "confidence": 0.6
        }
    
    async def _analyze_form_complexity(
        self, 
        form_elements: List[Dict[str, Any]], 
        html_content: str
    ) -> Dict[str, Any]:
        """
        Analyze form complexity and special features
        """
        complexity_indicators = {
            'captcha_present': any(['captcha' in html_content.lower(), 'recaptcha' in html_content.lower()]),
            'multi_step': len(form_elements) > 1,
            'file_upload_count': sum(1 for form in form_elements for field in form.get('fields', []) if field.get('type') == 'file'),
            'total_fields': sum(len(form.get('fields', [])) for form in form_elements),
            'required_field_count': sum(1 for form in form_elements for field in form.get('fields', []) if field.get('required')),
        }
        
        # Determine difficulty
        difficulty_score = 0
        if complexity_indicators['captcha_present']:
            difficulty_score += 2
        if complexity_indicators['multi_step']:
            difficulty_score += 2
        if complexity_indicators['file_upload_count'] > 1:
            difficulty_score += 1
        if complexity_indicators['total_fields'] > 15:
            difficulty_score += 1
        
        if difficulty_score >= 4:
            estimated_difficulty = "hard"
        elif difficulty_score >= 2:
            estimated_difficulty = "medium"
        else:
            estimated_difficulty = "easy"
        
        return {
            **complexity_indicators,
            'estimated_difficulty': estimated_difficulty,
            'difficulty_score': difficulty_score
        }
    
    def _classify_field_purpose(self, field_name: str, label: str, field_type: str) -> str:
        """
        Classify the purpose of a form field
        """
        field_text = f"{field_name} {label}".lower()
        
        if any(keyword in field_text for keyword in ['name', 'first', 'last']):
            return 'personal_info'
        elif any(keyword in field_text for keyword in ['email', 'mail']):
            return 'personal_info'
        elif any(keyword in field_text for keyword in ['phone', 'tel', 'mobile']):
            return 'personal_info'
        elif any(keyword in field_text for keyword in ['address', 'location', 'city', 'state']):
            return 'personal_info'
        elif any(keyword in field_text for keyword in ['experience', 'job', 'work', 'position']):
            return 'experience'
        elif any(keyword in field_text for keyword in ['education', 'degree', 'university', 'school']):
            return 'education'
        elif any(keyword in field_text for keyword in ['skill', 'technology', 'programming']):
            return 'skills'
        elif any(keyword in field_text for keyword in ['cover', 'letter', 'message', 'why']):
            return 'cover_letter'
        elif field_type == 'file':
            if any(keyword in field_text for keyword in ['resume', 'cv']):
                return 'resume'
            else:
                return 'document'
        else:
            return 'other'
    
    def _map_field_to_cv(self, field_name: str, label: str) -> str:
        """
        Map form field to CV data field
        """
        field_text = f"{field_name} {label}".lower()
        
        # Personal information mapping
        if any(keyword in field_text for keyword in ['first_name', 'firstname', 'fname']):
            return 'first_name'
        elif any(keyword in field_text for keyword in ['last_name', 'lastname', 'lname', 'surname']):
            return 'last_name'
        elif 'name' in field_text and 'first' not in field_text and 'last' not in field_text:
            return 'full_name'
        elif any(keyword in field_text for keyword in ['email', 'mail']):
            return 'email'
        elif any(keyword in field_text for keyword in ['phone', 'tel', 'mobile']):
            return 'phone'
        elif any(keyword in field_text for keyword in ['linkedin']):
            return 'linkedin_url'
        elif any(keyword in field_text for keyword in ['github']):
            return 'github_url'
        elif any(keyword in field_text for keyword in ['portfolio', 'website']):
            return 'portfolio_url'
        elif any(keyword in field_text for keyword in ['address', 'location']):
            return 'location'
        elif any(keyword in field_text for keyword in ['resume', 'cv']) and 'file' in field_text:
            return 'cv_file'
        elif any(keyword in field_text for keyword in ['cover', 'letter']):
            return 'cover_letter'
        else:
            return 'other'