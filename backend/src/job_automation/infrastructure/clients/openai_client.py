"""
OpenAI Client - Simplified client for LLM interactions
"""

import asyncio
from typing import Optional, Dict, Any, List
import logging
import aiohttp
from .web_scraper_client import WebScraperClient

try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

logger = logging.getLogger(__name__)

class OpenAIClient:
    """
    Simplified OpenAI client for both text and vision requests
    """
    
    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o",
        vision_model: str = "gpt-4o",
        temperature: float = 0.1,
        max_tokens: int = 4000
    ):
        self.api_key = api_key
        self.model = model
        self.vision_model = vision_model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.available = OPENAI_AVAILABLE and api_key and api_key != "your_openai_api_key_here"
        
        if self.available:
            self.client = AsyncOpenAI(api_key=api_key)
        else:
            self.client = None
            if not OPENAI_AVAILABLE:
                logger.warning("OpenAI package not available")
            else:
                logger.warning("OpenAI API key not configured")
    
    async def generate(self, prompt: str, model: Optional[str] = None) -> str:
        """Generate text response from prompt"""
        if not self.available:
            logger.warning("OpenAI not available - returning mock response")
            return "Mock AI response (OpenAI not configured)"
        
        try:
            response = await self.client.chat.completions.create(
                model=model or self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"OpenAI generation failed: {e}")
            return f"Error: {str(e)}"
    
    async def generate_with_vision(self, prompt: str, image_data: str) -> str:
        """Generate response using vision model with image"""
        if not self.available:
            logger.warning("OpenAI not available - returning mock response")
            return "Mock vision response (OpenAI not configured)"
        
        try:
            response = await self.client.chat.completions.create(
                model=self.vision_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": image_data}
                            }
                        ]
                    }
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"OpenAI vision generation failed: {e}")
            return f"Error: {str(e)}"
    
    async def generate_batch(self, prompts: List[str], model: Optional[str] = None) -> List[str]:
        """Generate responses for multiple prompts concurrently"""
        if not self.available:
            return ["Mock response" for _ in prompts]
        
        tasks = [self.generate(prompt, model) for prompt in prompts]
        return await asyncio.gather(*tasks, return_exceptions=True)

    async def find_company_careers_page(self, company_name: str, company_website: str = None, careers_url: str = None) -> str:
        """Step 1: Find the company's careers page URL using web search"""
        if not self.available:
            raise Exception("OpenAI client not available - web search requires OpenAI API")
        
        # If we already have a careers URL from the database, use it directly
        if careers_url:
            logger.info(f"✅ Using pre-stored careers URL for {company_name}: {careers_url}")
            return careers_url
        
        try:
            # Search for the company's careers page
            
            # Build search query excluding job boards
            search_query = f'"{company_name}" official careers page -site:linkedin.com -site:indeed.com -site:glassdoor.com -site:monster.com -site:ziprecruiter.com -site:dice.com'
            if company_website:
                search_query = f'site:{company_website} careers OR jobs -site:linkedin.com -site:indeed.com -site:glassdoor.com'

            prompt_content = f"""Find the official careers page for {company_name} where they post their current job openings.

SEARCH STRATEGY:
1. Try specific searches for "{company_name} jobs lever.co" or "{company_name} careers greenhouse" or "{company_name} workday jobs"
2. Look for "{company_name} careers" or "{company_name} jobs" on their official domain
3. Search for ATS-hosted pages like "jobs.lever.co/{company_name.lower()}" or "{company_name.lower()}.greenhouse.io"

STRICT REQUIREMENTS:
- Find the ACTUAL page where {company_name} posts current job openings
- EXCLUDE job boards: LinkedIn, Indeed, Glassdoor, Monster, ZipRecruiter, Dice, startup.jobs, weekday.works
- INCLUDE official ATS systems: Lever (jobs.lever.co), Greenhouse (greenhouse.io), Workday, SmartRecruiters
- The page must contain ACTIVE job listings for {company_name}

Expected patterns:
- {company_name.lower()}.com/careers
- careers.{company_name.lower()}.com
- jobs.lever.co/{company_name.lower()}
- {company_name.lower()}.greenhouse.io
- {company_name.lower()}.workday.com

For {company_name}, return ONLY the URL that has actual job listings, not a generic careers page.

CRITICAL: If {company_name} uses an ATS system like Lever or Greenhouse, find their specific page on that platform."""

            logger.info(f"🔍 [CAREERS SEARCH PROMPT] Company: {company_name}")
            logger.info(f"🔍 [CAREERS SEARCH PROMPT] Content: {prompt_content}")
            
            # Use OpenAI API with web search enabled (search-specific model)
            response = await self.client.chat.completions.create(
                model="gpt-4o-search-preview",
                web_search_options={},
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that can search the web for current information about company career pages. Provide accurate, up-to-date information."
                    },
                    {
                        "role": "user", 
                        "content": prompt_content
                    }
                ]
            )
            logger.info("✅ Used OpenAI search model for careers page discovery")
            
            careers_response = response.choices[0].message.content.strip()
            logger.info(f"🔍 OpenAI careers search response: {careers_response}")
            
            # Extract URL from response (handle cases where AI includes extra text)
            import re
            url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+(?:/[^\s<>"{}|\\^`\[\]]*)?'
            urls = re.findall(url_pattern, careers_response)
            
            if urls:
                careers_url = urls[0]  # Take the first URL found
                # Validate that this is a legitimate company domain
                if self._is_valid_company_domain(careers_url, company_name, company_website):
                    logger.info(f"✅ Found careers page for {company_name}: {careers_url}")
                    return careers_url
                else:
                    logger.warning(f"❌ Invalid company domain detected: {careers_url}")
                    # Try next URL or fallback
                    for url in urls[1:]:
                        if self._is_valid_company_domain(url, company_name, company_website):
                            logger.info(f"✅ Found valid careers page for {company_name}: {url}")
                            return url
                    # No valid URLs found
                    logger.warning(f"No valid careers URLs found for {company_name}")
                    return None
            elif careers_response.startswith("http"):
                # Direct URL response - validate it too
                if self._is_valid_company_domain(careers_response, company_name, company_website):
                    logger.info(f"✅ Found careers page for {company_name}: {careers_response}")
                    return careers_response
                else:
                    logger.warning(f"❌ Invalid company domain in direct response: {careers_response}")
                    return None
            else:
                # No valid careers URL found
                logger.warning(f"No valid careers URL found in response '{careers_response}'")
                return None
                
        except Exception as e:
            logger.error(f"❌ Failed to find careers page for {company_name}: {e}")
            logger.error(f"❌ Exception type: {type(e)}")
            return None

    def _generate_careers_url(self, company_name: str, company_website: str = None) -> str:
        """Generate realistic careers URL for a company"""
        if company_website:
            base_domain = company_website.replace('https://', '').replace('http://', '').strip('/')
        else:
            base_domain = f"{company_name.lower().replace(' ', '')}.com"
        
        # Known career page patterns for specific companies
        if 'n26.com' in base_domain:
            return "https://n26.com/en/careers"
        elif 'spotify.com' in base_domain:
            return "https://lifeatspotify.com/"
        elif 'zalando.com' in base_domain:
            return "https://jobs.zalando.com/"
        elif 'traderepublic.com' in base_domain:
            # Trade Republic currently doesn't have accessible job listings
            # Using general careers page as fallback
            return "https://traderepublic.com/en-de/about#career"
        elif 'google.com' in base_domain:
            return "https://careers.google.com/"
        else:
            # Common patterns
            return f"https://{base_domain}/careers"

    async def search_jobs_on_careers_page(self, careers_url: str, company_name: str, user_skills: List[str] = None, num_results: int = 10, company_website: str = None) -> List[Dict[str, Any]]:
        """Step 2: Search for actual jobs on the company's careers page"""
        if not self.available:
            raise Exception("OpenAI client not available - web search requires OpenAI API")
        
        try:
            # Build targeted search query for the specific careers page
            skills_text = ", ".join(user_skills[:5]) if user_skills else "software engineer, developer"
            
            prompt_content = f"""Search for current job openings at {company_name} using web search.

TARGET SKILLS: {skills_text}

SEARCH INSTRUCTIONS:
1. Search for "{company_name} jobs" and "{company_name} careers" to find current job postings
2. Look on their official careers page: {careers_url}
3. Find jobs related to: Engineering, Software, Technology, Product, Data, Backend, Frontend
4. Include jobs that match the target skills or are in relevant departments

⚠️ CRITICAL REQUIREMENTS - READ CAREFULLY:
- You are using web search to find REAL job postings that EXIST RIGHT NOW on the company's website
- Each job URL must be a REAL, EXISTING link that you found through web search - not generated or made up
- DO NOT create URLs with placeholder IDs like abc123, def456, test123, or sequential numbers
- DO NOT generate hypothetical job URLs - only return URLs you actually found via web search
- Each URL must be unique and specific to one job posting (with real job IDs from the company's ATS)
- Example of GOOD URL: https://jobs.lever.co/n26/5f3a2b1c-8932-4d7e-a6c1-9b8f3e2d1a4c (real UUID)
- Example of BAD URL: https://jobs.lever.co/n26/abc123 (fake placeholder ID)
- If your web search doesn't find actual job postings with real URLs, return an empty array []
- Test each URL in your mind - would it actually resolve to a real job posting?
- Focus on jobs that would be suitable for someone with these skills: {skills_text}
- NEVER make up job IDs or URLs - only use what you find through actual web search

OUTPUT FORMAT (JSON only):
[
    {{
        "title": "Job title",
        "url": "Job posting URL if available", 
        "snippet": "Brief job description",
        "location": "Job location",
        "department": "Department if shown",
        "posted_date": "Date if available, or null"
    }}
]

Return actual job openings you find for {company_name}. If no suitable jobs are found, return empty array []."""

            logger.info(f"🔍 [JOB SEARCH PROMPT] Company: {company_name}")
            logger.info(f"🔍 [JOB SEARCH PROMPT] Careers URL: {careers_url}")
            logger.info(f"🔍 [JOB SEARCH PROMPT] Skills: {skills_text}")
            logger.info(f"🔍 [JOB SEARCH PROMPT] Content: {prompt_content}")
            
            # Use OpenAI API with web search enabled (search-specific model)
            response = await self.client.chat.completions.create(
                model="gpt-4o-search-preview",
                web_search_options={},
                messages=[
                    {
                        "role": "system",
                        "content": "You are a job search assistant that finds REAL job listings using web search. CRITICAL RULES:\n1. You must return ONLY pure JSON arrays - no markdown, no explanations, no additional text\n2. You are using WEB SEARCH to find real jobs - DO NOT make up or generate fake job data\n3. Only return jobs that you ACTUALLY FOUND via web search on the company's website\n4. Every job URL must be a REAL link you discovered - not a generated placeholder\n5. NEVER use placeholder IDs like abc123, def456, test123, or simple sequential numbers\n6. Real job IDs are usually: UUIDs, long alphanumeric strings, or meaningful slugs\n7. If your web search finds no real jobs, return an empty array [] - DO NOT make up fake ones\n8. Each URL must be unique and lead to a specific, existing job posting"
                    },
                    {
                        "role": "user", 
                        "content": prompt_content
                    }
                ]
            )
            logger.info("✅ Used OpenAI search model for job search")
            
            content = response.choices[0].message.content.strip()
            logger.info(f"🔍 OpenAI full response: {content}")
            
            # Parse JSON response
            import json
            try:
                # Clean up markdown formatting and extract JSON
                import re
                
                if '```json' in content:
                    # Extract JSON from markdown code blocks
                    json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
                    if json_match:
                        content = json_match.group(1).strip()
                        logger.info(f"Extracted JSON from markdown code block")
                elif '```' in content:
                    # Handle plain code blocks  
                    json_match = re.search(r'```\s*(.*?)\s*```', content, re.DOTALL)
                    if json_match:
                        content = json_match.group(1).strip()
                        logger.info(f"Extracted content from code block")
                elif not content.strip().startswith('[') and not content.strip().startswith('{'):
                    # Try to extract JSON array from mixed content
                    json_match = re.search(r'(\[.*?\])', content, re.DOTALL)
                    if json_match:
                        content = json_match.group(1).strip()
                        logger.info(f"Extracted JSON array from mixed content")
                
                # If the response doesn't look like JSON at all, skip parsing
                if not content.startswith('[') and not content.startswith('{'):
                    logger.warning(f"Response doesn't look like JSON: {content}")
                    raise json.JSONDecodeError("Not JSON format", content, 0)
                
                results = json.loads(content)
                if isinstance(results, list):
                    logger.info(f"\n📊 =================  JOB VALIDATION START =================")
                    logger.info(f"📥 OpenAI returned {len(results)} jobs for {company_name}")

                    if results:
                        # Track statistics
                        stats = {
                            'total_from_openai': len(results),
                            'passed_basic': 0,
                            'passed_format': 0,
                            'filtered_generic': 0,
                            'has_identifier': 0,
                            'filtered_fake': 0,
                            'final_valid': 0
                        }

                        # Filter out jobs with invalid URLs and verify they exist
                        valid_jobs = []
                        for idx, job in enumerate(results, 1):
                            job_url = job.get('url', '')
                            job_title = job.get('title', 'Unknown')

                            logger.info(f"\n🔍 [{idx}/{len(results)}] Validating: {job_title}")
                            logger.info(f"   URL: {job_url}")

                            # First check if it's from a known ATS platform (PRIORITIZE THIS)
                            is_ats_url = any([
                                'greenhouse.io' in job_url.lower(),
                                'lever.co' in job_url.lower(),
                                'jobs.lever.co' in job_url.lower(),
                                'workday.com' in job_url.lower(),
                                'taleo.net' in job_url.lower(),
                                'breezy.hr' in job_url.lower(),
                                'ashbyhq.com' in job_url.lower(),
                                'bamboohr.com' in job_url.lower(),
                                'boards.greenhouse.io' in job_url.lower()
                            ])

                            if is_ats_url:
                                logger.info(f"   ✅ Step 0: Known ATS platform detected - BYPASSING generic filters")

                            # Step 1: Basic URL validation
                            if not job_url or job_url == '#' or job_url == '' or 'javascript:' in job_url.lower():
                                logger.warning(f"   ❌ Step 1 FAILED: Invalid URL (empty/placeholder)")
                                continue
                            logger.info(f"   ✅ Step 1: Basic validation passed")
                            stats['passed_basic'] += 1

                            # Step 2: Ensure URL has proper format
                            if not job_url.startswith(('http://', 'https://')):
                                logger.warning(f"   ❌ Step 2 FAILED: Malformed URL (no http/https)")
                                continue
                            logger.info(f"   ✅ Step 2: URL format valid")
                            stats['passed_format'] += 1

                            # Step 3: Filter out generic careers pages ONLY if NOT an ATS URL
                            if not is_ats_url:
                                generic_patterns = [
                                    '/careers$', '/careers/$', '/jobs$', '/jobs/$',
                                    '/careers#', '/jobs#', '/careers?', '/jobs?',
                                    '/en/careers$', '/en/jobs$', '/de/careers$',
                                    '/careers/all$', '/careers/search$',
                                    '/careers/openings$', '/job-openings$',
                                    '/work-with-us$', '/join-us$', '/opportunities$'
                                ]

                                is_generic = False
                                matched_pattern = None
                                for pattern in generic_patterns:
                                    import re
                                    if re.search(pattern, job_url.lower()):
                                        is_generic = True
                                        matched_pattern = pattern
                                        break

                                if is_generic:
                                    logger.warning(f"   ❌ Step 3 FAILED: Generic careers page (matched pattern: {matched_pattern})")
                                    stats['filtered_generic'] += 1
                                    continue
                                logger.info(f"   ✅ Step 3: Not a generic careers page")
                            else:
                                logger.info(f"   ⏭️  Step 3: Skipped (ATS URL exempt from generic filter)")

                            # Step 4: Check for job identifiers
                            identifier_checks = {
                                'has_job_path': '/job/' in job_url.lower(),
                                'has_position_path': '/position/' in job_url.lower(),
                                'has_opening_path': '/opening/' in job_url.lower(),
                                'has_role_path': '/role/' in job_url.lower(),
                                'has_apply_path': '/apply/' in job_url.lower(),
                                'has_uuid': bool(re.search(r'/[a-f0-9]{8,}', job_url)),
                                'has_numeric_id': bool(re.search(r'/\d{5,}', job_url)),
                                'is_ats': is_ats_url
                            }

                            has_job_identifier = any(identifier_checks.values())
                            identifiers_found = [k for k, v in identifier_checks.items() if v]

                            if has_job_identifier:
                                logger.info(f"   ✅ Step 4: Has job identifier(s): {', '.join(identifiers_found)}")
                                stats['has_identifier'] += 1
                            else:
                                logger.warning(f"   ⚠️  Step 4: No clear job identifier found (may still be valid)")

                            # Step 5: Filter out obviously fake domains and suspicious patterns
                            fake_indicators = ['example.com', 'placeholder.', 'fake.', 'test.', 'sample.']
                            # Check for suspicious placeholder IDs like abc123, def456, test123
                            suspicious_patterns = [
                                r'/abc\d+',  # abc123, abc456
                                r'/def\d+',  # def456
                                r'/test\d+', # test123
                                r'/demo\d+', # demo123
                                r'/sample\d+', # sample123
                                r'/placeholder', # placeholder
                                r'/\d{1,3}$', # Very short numeric IDs (1-3 digits) at end of URL
                            ]

                            is_fake = any(indicator in job_url.lower() for indicator in fake_indicators)
                            is_suspicious = any(re.search(pattern, job_url.lower()) for pattern in suspicious_patterns)

                            # Additional check: Validate UUID format if it looks like a UUID
                            uuid_pattern = r'/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})'
                            uuid_like_pattern = r'/([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})'

                            uuid_like_match = re.search(uuid_like_pattern, job_url.lower())
                            if uuid_like_match:
                                potential_uuid = uuid_like_match.group(1)
                                # Check if it's a valid UUID (only hex characters)
                                valid_uuid_match = re.match(r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$', potential_uuid)
                                if not valid_uuid_match:
                                    logger.warning(f"   ❌ Step 5 FAILED: Invalid UUID format detected (contains non-hex characters: {potential_uuid})")
                                    stats['filtered_fake'] += 1
                                    continue

                            if is_fake or is_suspicious:
                                logger.warning(f"   ❌ Step 5 FAILED: {'Fake domain' if is_fake else 'Suspicious pattern'} detected")
                                stats['filtered_fake'] += 1
                                continue
                            logger.info(f"   ✅ Step 5: Not a fake/suspicious URL")

                            # Step 6: Verify URL is actually accessible (HTTP HEAD request)
                            # Only do this for a sample to avoid rate limiting
                            should_verify = len(valid_jobs) < 3  # Verify first 3 jobs
                            url_is_valid = True

                            if should_verify:
                                logger.info(f"   🔍 Step 6: Verifying URL accessibility...")
                                url_is_valid = await self._verify_url_exists(job_url)
                                if not url_is_valid:
                                    logger.warning(f"   ❌ Step 6 FAILED: URL returns 404 or is inaccessible")
                                    stats['filtered_inaccessible'] = stats.get('filtered_inaccessible', 0) + 1
                                    continue
                                logger.info(f"   ✅ Step 6: URL is accessible")
                            else:
                                logger.info(f"   ⏭️  Step 6: Skipped (already verified enough URLs)")

                            # Job passed all validation
                            logger.info(f"   ✅ PASSED ALL VALIDATION - Adding to valid jobs")
                            stats['final_valid'] += 1

                            # Ensure URL field is properly set
                            if 'url' not in job or not job['url']:
                                job['url'] = job_url
                            job["source"] = company_name
                            job["company"] = company_name
                            job["salary"] = job.get("salary") or None
                            valid_jobs.append(job)
                        
                        # Print summary statistics
                        logger.info(f"\n📊 =================  VALIDATION SUMMARY =================")
                        logger.info(f"📥 Total from OpenAI:     {stats['total_from_openai']}")
                        logger.info(f"✅ Passed basic check:    {stats['passed_basic']}")
                        logger.info(f"✅ Passed format check:   {stats['passed_format']}")
                        logger.info(f"❌ Filtered as generic:   {stats['filtered_generic']}")
                        logger.info(f"✅ Has job identifier:    {stats['has_identifier']}")
                        logger.info(f"❌ Filtered as fake:      {stats['filtered_fake']}")
                        logger.info(f"❌ Filtered inaccessible: {stats.get('filtered_inaccessible', 0)}")
                        logger.info(f"✅ FINAL VALID JOBS:      {stats['final_valid']}")
                        logger.info(f"📊 ========================================================\n")

                        logger.info(f"✅ Successfully validated {len(valid_jobs)} real jobs from OpenAI response (filtered {len(results) - len(valid_jobs)} invalid/non-existent jobs)")

                        # If OpenAI returned fake results, try direct web scraping
                        if len(valid_jobs) == 0 and len(results) > 0:
                            logger.warning(f"⚠️ OpenAI returned {len(results)} jobs but all were invalid/fake. Falling back to direct web scraping...")

                            try:
                                scraper = WebScraperClient()
                                scraped_jobs = await scraper.find_job_listings(
                                    company_name=company_name,
                                    careers_url=careers_url,
                                    user_skills=user_skills
                                )

                                if scraped_jobs:
                                    logger.info(f"✅ Web scraping found {len(scraped_jobs)} real jobs")
                                    # Convert to our format
                                    for job in scraped_jobs:
                                        job['snippet'] = f"Location: {job.get('location', 'Not specified')}"
                                        if 'department' in job and job['department']:
                                            job['snippet'] += f" | Department: {job['department']}"
                                    return scraped_jobs[:num_results]
                                else:
                                    logger.info("ℹ️ Web scraping also found no jobs - company may not have openings")
                            except Exception as e:
                                logger.warning(f"Web scraping fallback failed: {e}")

                        return valid_jobs[:num_results]
                    else:
                        # Empty array is valid - means no jobs found
                        logger.info(f"✅ No jobs found on {company_name} careers page (valid empty result)")
                        return []
                else:
                    logger.warning(f"Parsed JSON but got invalid format: {type(results)}")
                    return []
                    
            except json.JSONDecodeError as e:
                logger.warning(f"JSON parsing failed: {e}")
                logger.warning(f"Full response content: {content}")
                logger.info(f"ℹ️ No structured job listings found for {company_name} - company may not have active job postings")
                # Return empty list instead of generating fake jobs
                return []
            
        except Exception as e:
            logger.error(f"Failed to search jobs on careers page {careers_url}: {e}")
            return []

    async def _verify_url_exists(self, url: str) -> bool:
        """Verify if a URL actually exists by making a HEAD request"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.head(url, timeout=5, allow_redirects=True) as response:
                    # Consider 200-399 as valid (includes redirects)
                    is_valid = 200 <= response.status < 400
                    if not is_valid:
                        logger.debug(f"URL verification failed: {url} returned status {response.status}")
                    return is_valid
        except Exception as e:
            logger.debug(f"URL verification error for {url}: {e}")
            return False



    async def search_web(self, query: str, company_website: str = None, num_results: int = 10) -> List[Dict[str, Any]]:
        """Combined method: Find careers page, then search for jobs on it"""
        if not self.available:
            raise Exception("OpenAI client not available - web search requires OpenAI API")
        
        try:
            # Extract company name from query
            company_name = query.split()[0] if query else "Company"
            
            # Step 1: Find the careers page
            logger.info(f"🔍 Starting careers page search for {company_name}")
            careers_url = await self.find_company_careers_page(company_name, company_website)
            logger.info(f"🔍 Careers page search result: {careers_url}")
            
            if not careers_url:
                logger.error(f"❌ No careers page found for {company_name} - this is blocking job discovery")
                return []
            
            # Step 2: Search for jobs on the careers page
            user_skills = query.split()[1:] if len(query.split()) > 1 else []
            jobs = await self.search_jobs_on_careers_page(careers_url, company_name, user_skills, num_results, company_website)
            
            return jobs
            
        except Exception as e:
            logger.error(f"Combined web search failed: {e}")
            raise Exception(f"Web search failed: {str(e)}")


    async def analyze_job_match(self, job_data: Dict[str, Any], user_preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze how well a job matches user preferences using AI"""
        if not self.available:
            raise Exception("OpenAI client not available - job matching requires OpenAI API")
        
        try:
            analysis_prompt = f"""
            Analyze how well this job matches the user's preferences:
            
            JOB:
            Title: {job_data.get('title', 'N/A')}
            Description: {job_data.get('snippet', 'N/A')}
            Location: {job_data.get('location', 'N/A')}
            Salary: {job_data.get('salary', 'N/A')}
            
            USER PREFERENCES:
            Skills: {user_preferences.get('skills', [])}
            Locations: {user_preferences.get('locations', [])}
            Job Types: {user_preferences.get('job_types', [])}
            Salary Range: {user_preferences.get('salary_min', 'N/A')} - {user_preferences.get('salary_max', 'N/A')}
            Experience Level: {user_preferences.get('experience_level', 'N/A')}
            
            Provide analysis in JSON format:
            {{
                "match_score": 0.85,
                "reasoning": "Detailed explanation of why this job matches or doesn't match",
                "skill_match": 0.9,
                "location_match": 0.8,
                "salary_match": 0.7,
                "missing_requirements": ["skill1", "skill2"],
                "key_strengths": ["strength1", "strength2"]
            }}
            
            Score from 0.0 to 1.0 where 1.0 is perfect match.
            """
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert job matching analyst. Provide accurate, detailed job-candidate fit analysis."},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.1,
                max_tokens=800
            )
            
            import json
            try:
                analysis = json.loads(response.choices[0].message.content.strip())
                return analysis
            except json.JSONDecodeError:
                return {
                    "match_score": 0.5,
                    "reasoning": response.choices[0].message.content.strip()
                }
                
        except Exception as e:
            logger.error(f"Job match analysis failed: {e}")
            return {"match_score": 0.0, "reasoning": f"Analysis error: {str(e)}"}

    async def extract_job_details(self, job_url: str) -> Dict[str, Any]:
        """Extract detailed job information from a job posting URL"""
        if not self.available:
            raise Exception("OpenAI client not available - job detail extraction requires OpenAI API")
        
        try:
            extraction_prompt = f"""
            Extract detailed job information from this URL: {job_url}
            
            Please provide comprehensive job details in JSON format:
            {{
                "title": "Full job title",
                "company": "Company name",
                "location": "Job location",
                "description": "Full job description",
                "requirements": ["requirement1", "requirement2"],
                "responsibilities": ["responsibility1", "responsibility2"],
                "benefits": ["benefit1", "benefit2"],
                "salary_range": "Salary information if available",
                "employment_type": "Full-time/Part-time/Contract",
                "experience_level": "Entry/Mid/Senior",
                "application_url": "Direct application URL",
                "posted_date": "When the job was posted",
                "application_deadline": "Application deadline if available"
            }}
            """
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a job information extraction specialist. Access the web to get real job posting details."},
                    {"role": "user", "content": extraction_prompt}
                ],
                temperature=0.1,
                max_tokens=1500
            )
            
            import json
            try:
                job_details = json.loads(response.choices[0].message.content.strip())
                return job_details
            except json.JSONDecodeError:
                return {
                    "title": "Job Details",
                    "description": response.choices[0].message.content.strip(),
                    "source_url": job_url
                }
                
        except Exception as e:
            logger.error(f"Job detail extraction failed: {e}")
            return {"title": "Extraction Error", "description": f"Error: {str(e)}", "source_url": job_url}
    
    def _is_valid_company_domain(self, url: str, company_name: str, company_website: str = None) -> bool:
        """Validate that URL belongs to company's official domain"""
        if not url or url == '#':
            return False
            
        try:
            from urllib.parse import urlparse
            
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            
            # Check against general job boards (exclude ATS systems that companies use officially)
            general_job_boards = [
                'linkedin.com', 'indeed.com', 'glassdoor.com', 'monster.com', 
                'ziprecruiter.com', 'dice.com', 'careerbuilder.com', 'jobvite.com',
                'startup.jobs', 'weekday.works', 'angel.co', 'wellfound.com'
            ]
            
            # ATS systems that companies officially use (allow these)
            official_ats_systems = [
                'workday.com', 'greenhouse.io', 'lever.co', 'smartrecruiters.com'
            ]
            
            # Reject general job boards
            if any(board in domain for board in general_job_boards):
                logger.warning(f"❌ Job board detected in URL: {domain}")
                return False
                
            # For ATS systems, check if they're hosting jobs for the company
            if any(ats in domain for ats in official_ats_systems):
                company_slug = company_name.lower().replace(' ', '').replace('-', '')
                if company_slug in url.lower() or company_slug in domain:
                    logger.info(f"✅ Valid ATS system detected for {company_name}: {domain}")
                    return True
                else:
                    logger.warning(f"❌ ATS system {domain} doesn't appear to be for {company_name}")
                    return False
            
            # Check against company website if provided
            if company_website:
                expected_domain = company_website.replace('https://', '').replace('http://', '').strip('/').lower()
                if expected_domain in domain or domain in expected_domain:
                    return True
            
            # Check if domain contains company name (fuzzy match)
            company_slug = company_name.lower().replace(' ', '').replace('-', '').replace('.', '')
            domain_clean = domain.replace('-', '').replace('.', '')
            
            # For companies like N26, check exact match
            if company_slug in domain_clean or any(word in domain_clean for word in company_slug.split() if len(word) > 2):
                return True
                
            # Special cases for known companies
            company_lower = company_name.lower()
            if 'n26' in company_lower and 'n26' in domain:
                return True
            elif 'spotify' in company_lower and ('spotify' in domain or 'lifeatspotify' in domain):
                return True
            elif 'zalando' in company_lower and 'zalando' in domain:
                return True
            elif 'traderepublic' in company_lower and 'traderepublic' in domain:
                return True
                
            logger.warning(f"❌ Domain validation failed: {domain} not associated with {company_name}")
            return False
            
        except Exception as e:
            logger.error(f"❌ Error validating domain {url}: {e}")
            return False

    def _is_valid_job_url(self, url: str, company_name: str, company_website: str = None) -> bool:
        """Validate that job URL is from company's official domain"""
        return self._is_valid_company_domain(url, company_name, company_website)

    async def _verify_url_exists(self, url: str) -> bool:
        """Verify that a URL actually exists and is accessible"""
        try:
            import aiohttp
            
            timeout = aiohttp.ClientTimeout(total=10)  # 10 second timeout
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.head(url, allow_redirects=True) as response:
                    # Consider 2xx and 3xx status codes as valid
                    return 200 <= response.status < 400
                    
        except Exception as e:
            logger.warning(f"❌ URL verification failed for {url}: {e}")
            return False

    def is_available(self) -> bool:
        """Check if client is available and configured"""
        return self.available

# Factory function
def create_openai_client(
    api_key: str,
    model: str = "gpt-4o",
    vision_model: str = "gpt-4o",
    temperature: float = 0.1,
    max_tokens: int = 4000
) -> OpenAIClient:
    """Create OpenAI client with configuration"""
    return OpenAIClient(
        api_key=api_key,
        model=model,
        vision_model=vision_model,
        temperature=temperature,
        max_tokens=max_tokens
    )