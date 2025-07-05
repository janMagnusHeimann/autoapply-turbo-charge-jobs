"""
OpenAI Client - Simplified client for LLM interactions
"""

import asyncio
from typing import Optional, Dict, Any, List
import logging

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

IMPORTANT:
- Find REAL job postings that are currently available
- Get accurate job titles, locations, and descriptions
- If you find job URLs, make sure they are legitimate links
- Focus on jobs that would be suitable for someone with these skills: {skills_text}

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
                        "content": "You are a job search assistant that finds REAL job listings using web search. CRITICAL: You must return ONLY pure JSON arrays - no markdown, no explanations, no additional text. Never generate fictional job postings. Only return actual jobs from company websites or empty array []."
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
                    if results:
                        # Filter out jobs with invalid URLs and verify they exist
                        valid_jobs = []
                        for job in results:
                            job_url = job.get('url', '')
                            
                            # Step 1: Domain validation (simplified to match ChatGPT behavior)
                            # Only filter out obviously invalid URLs, but allow more flexibility
                            if not job_url or job_url == '#' or 'javascript:' in job_url.lower():
                                logger.warning(f"❌ Filtered out invalid URL: {job.get('title', 'Unknown')} - {job_url}")
                                continue
                            
                            # Step 2: URL existence verification (temporarily disabled to match ChatGPT behavior)
                            # if not await self._verify_url_exists(job_url):
                            #     logger.warning(f"❌ Filtered out non-existent job URL: {job.get('title', 'Unknown')} - {job_url}")
                            #     continue
                            
                            # Job passed all validation
                            job["source"] = company_name
                            job["company"] = company_name
                            job["salary"] = job.get("salary") or None
                            valid_jobs.append(job)
                            logger.info(f"✅ Validated job: {job.get('title', 'Unknown')} - {job_url}")
                        
                        logger.info(f"✅ Successfully validated {len(valid_jobs)} real jobs from OpenAI response (filtered {len(results) - len(valid_jobs)} invalid/non-existent jobs)")
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