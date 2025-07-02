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

    async def find_company_careers_page(self, company_name: str, company_website: str = None) -> str:
        """Step 1: Find the company's careers page URL using web search"""
        if not self.available:
            raise Exception("OpenAI client not available - web search requires OpenAI API")
        
        try:
            # Search for the company's careers page
            
            prompt_content = f"""Search the web to find the official careers page URL for {company_name}. 
                        
I need the direct link to where they post job openings. Common patterns include:
- company.com/careers
- careers.company.com  
- jobs.company.com
- company.com/jobs

For {company_name}, search and return ONLY the exact URL to their careers/jobs page where current job listings are posted.

DO NOT include any explanatory text. Return ONLY the URL starting with https:// or http://"""

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
                logger.info(f"✅ Found careers page for {company_name}: {careers_url}")
                return careers_url
            elif careers_response.startswith("http"):
                # Direct URL response
                logger.info(f"✅ Found careers page for {company_name}: {careers_response}")
                return careers_response
            else:
                # Generate realistic careers URL based on company
                fallback_url = self._generate_careers_url(company_name, company_website)
                logger.warning(f"No valid careers URL found in response '{careers_response}', using fallback: {fallback_url}")
                return fallback_url
                
        except Exception as e:
            logger.error(f"❌ Failed to find careers page for {company_name}: {e}")
            logger.error(f"❌ Exception type: {type(e)}")
            logger.error(f"❌ Using fallback URL generation")
            return self._generate_careers_url(company_name, company_website)

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
            return "https://traderepublic.com/careers"
        elif 'google.com' in base_domain:
            return "https://careers.google.com/"
        else:
            # Common patterns
            return f"https://{base_domain}/careers"

    async def search_jobs_on_careers_page(self, careers_url: str, company_name: str, user_skills: List[str] = None, num_results: int = 10) -> List[Dict[str, Any]]:
        """Step 2: Search for actual jobs on the company's careers page"""
        if not self.available:
            raise Exception("OpenAI client not available - web search requires OpenAI API")
        
        try:
            # Build targeted search query for the specific careers page
            skills_text = ", ".join(user_skills[:5]) if user_skills else "software engineer, developer"
            
            prompt_content = f"""Search {company_name}'s career page: {careers_url}

Find current job listings matching these skills: {skills_text}

CRITICAL REQUIREMENTS:
1. Only return jobs that actually exist on their website right now
2. Do NOT generate, invent, or create fake job listings
3. Return ONLY pure JSON format - no markdown, no explanations, no additional text

Response format - return ONLY this JSON structure:
[
    {{
        "title": "Exact job title from website",
        "url": "Direct link to job posting", 
        "snippet": "Real job description from website",
        "location": "Actual location listed",
        "department": "Real department if available",
        "posted_date": "Actual posting date if available"
    }}
]

If no real jobs found, return: []

NO MARKDOWN, NO EXPLANATIONS, JUST JSON ARRAY."""

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
                        # Add company info to each job
                        for job in results:
                            job["source"] = company_name
                            job["company"] = company_name
                            job["salary"] = job.get("salary") or None
                        
                        logger.info(f"✅ Successfully parsed {len(results)} jobs from OpenAI response")
                        return results[:num_results]
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
                logger.error(f"❌ Job search failed for {company_name} - no valid jobs found")
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
            jobs = await self.search_jobs_on_careers_page(careers_url, company_name, user_skills, num_results)
            
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