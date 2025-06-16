import os
import base64
import json
from typing import List, Dict, Any, Optional
from playwright.async_api import async_playwright
from openai import OpenAI
from urllib.parse import urljoin, urlparse


class AIVisionScrapingService:
    def __init__(self):
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    async def scrape_jobs_with_vision(
        self, 
        career_page_url: str, 
        company_name: str, 
        debug_mode: bool = False
    ) -> Dict[str, Any]:
        """Scrape jobs using AI Vision capabilities with Playwright"""
        try:
            async with async_playwright() as p:
                # Launch browser
                browser = await p.chromium.launch(headless=not debug_mode)
                context = await browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                )
                page = await context.new_page()

                # Navigate to career page
                await page.goto(career_page_url, wait_until='networkidle', timeout=30000)
                
                # Wait for dynamic content to load
                await page.wait_for_timeout(3000)

                # Take screenshot
                screenshot = await page.screenshot(full_page=True)
                base64_screenshot = base64.b64encode(screenshot).decode('utf-8')

                # Analyze page with AI Vision
                jobs = await self._analyze_page_with_ai_vision(
                    base64_screenshot, company_name, career_page_url
                )

                await browser.close()

                return {
                    "success": True,
                    "total_found": len(jobs),
                    "jobs": jobs,
                    "scraping_method": "ai_vision_playwright",
                    "error_message": None
                }

        except Exception as e:
            return {
                "success": False,
                "total_found": 0,
                "jobs": [],
                "scraping_method": "ai_vision_failed",
                "error_message": str(e)
            }

    async def _analyze_page_with_ai_vision(
        self, 
        base64_screenshot: str, 
        company_name: str, 
        career_page_url: str
    ) -> List[Dict[str, Any]]:
        """Analyze screenshot with GPT-4o Vision"""
        try:
            prompt = f"""
            Analyze this careers/jobs page screenshot for {company_name} and extract all visible job listings.

            For each job listing you can see, extract:
            - title: The job title/position name
            - location: Where the job is located (city, country, or "Remote")
            - employment_type: Type of employment (full-time, part-time, contract, internship)
            - remote_type: Work arrangement (remote, hybrid, on-site)
            - description: Brief description if visible (optional)
            - requirements: Key requirements if visible (optional)
            - salary_range: Salary information if visible (optional)

            Look carefully for job listings that might be:
            - In a list format
            - As cards or tiles
            - In a table
            - As clickable links
            - In dropdown menus or expandable sections

            Return the results as a JSON array. Example format:
            [
              {{
                "title": "Software Engineer",
                "location": "Berlin, Germany", 
                "employment_type": "full-time",
                "remote_type": "hybrid",
                "description": "Develop innovative fintech solutions",
                "requirements": ["Python", "React", "3+ years experience"],
                "salary_range": "€60,000 - €80,000"
              }}
            ]

            If you cannot see any job listings on this page, return an empty array: []

            Only extract information that is clearly visible in the screenshot. Do not make assumptions.
            """

            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                max_tokens=2000,
                temperature=0.1,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{base64_screenshot}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ]
            )

            result = response.choices[0].message.content.strip()
            
            # Parse JSON response
            try:
                jobs_data = json.loads(result)
                if isinstance(jobs_data, list):
                    # Enhance jobs with application URLs
                    enhanced_jobs = []
                    for job in jobs_data:
                        job['company'] = company_name
                        job['application_url'] = self._construct_application_url(
                            job, career_page_url
                        )
                        enhanced_jobs.append(job)
                    return enhanced_jobs
                return []
            except json.JSONDecodeError:
                print(f"Failed to parse AI Vision response: {result}")
                return []

        except Exception as e:
            print(f"Error in AI Vision analysis: {e}")
            return []

    def _construct_application_url(self, job: Dict[str, Any], career_page_url: str) -> str:
        """Construct application URL for a job"""
        try:
            base_url = career_page_url
            job_title = job.get('title', '').lower().replace(' ', '-')
            
            # Common job board URL patterns
            domain = urlparse(career_page_url).netloc.lower()
            
            if 'lever.co' in domain:
                return f"{base_url.rstrip('/')}/{job_title}"
            elif 'greenhouse.io' in domain:
                return f"{base_url}?job_id={job_title}"
            elif 'smartrecruiters.com' in domain:
                return f"{base_url}#{job_title}"
            elif 'workable.com' in domain:
                return f"{base_url}/j/{job_title}"
            else:
                # Generic pattern
                return base_url
                
        except Exception:
            return career_page_url