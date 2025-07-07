"""
CV Processing Service - Dedicated service for CV text analysis and extraction
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class CVProcessor:
    """
    CV processing service that handles large CV text by chunking and uses OpenAI for extraction
    """
    
    def __init__(self, openai_api_key: str, model: str = "gpt-4o", max_chunk_size: int = 40000):
        self.api_key = openai_api_key
        self.model = model
        self.max_chunk_size = max_chunk_size
        self.client = AsyncOpenAI(api_key=openai_api_key) if openai_api_key else None
        
    def is_available(self) -> bool:
        """Check if OpenAI client is available"""
        return self.client is not None and self.api_key and self.api_key != "your_openai_api_key_here"
    
    def _chunk_text(self, text: str) -> List[str]:
        """Split large text into manageable chunks"""
        if len(text) <= self.max_chunk_size:
            return [text]
        
        chunks = []
        for i in range(0, len(text), self.max_chunk_size):
            chunk = text[i:i + self.max_chunk_size]
            
            # Try to break at word boundaries for better context
            if i + self.max_chunk_size < len(text):
                last_space = chunk.rfind(' ')
                if last_space > self.max_chunk_size * 0.8:  # Only if we don't lose too much
                    chunk = chunk[:last_space]
            
            chunks.append(chunk)
        
        logger.info(f"Split CV text into {len(chunks)} chunks")
        return chunks
    
    def _merge_extracted_data(self, chunk_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Merge data extracted from multiple chunks"""
        merged = {
            "personal_info": {},
            "social_links": {},
            "experience": [],
            "education": [],
            "skills": [],
            "certifications": [],
            "awards": []
        }
        
        # Merge personal info (take first non-empty values)
        for chunk_data in chunk_results:
            personal_info = chunk_data.get("personal_info", {})
            for key, value in personal_info.items():
                if value and not merged["personal_info"].get(key):
                    merged["personal_info"][key] = value
        
        # Merge social links (take first non-empty values)
        for chunk_data in chunk_results:
            social_links = chunk_data.get("social_links", {})
            for key, value in social_links.items():
                if value and not merged["social_links"].get(key):
                    merged["social_links"][key] = value
        
        # Merge arrays (combine all unique entries)
        for array_field in ["experience", "education", "certifications", "awards"]:
            seen_titles = set()
            for chunk_data in chunk_results:
                items = chunk_data.get(array_field, [])
                for item in items:
                    # Use title as unique identifier
                    title = item.get("title") or item.get("name") or item.get("degree") or ""
                    if title and title not in seen_titles:
                        merged[array_field].append(item)
                        seen_titles.add(title)
        
        # Merge skills (combine and deduplicate)
        all_skills = []
        for chunk_data in chunk_results:
            skills = chunk_data.get("skills", [])
            all_skills.extend(skills)
        merged["skills"] = list(set(all_skills))  # Remove duplicates
        
        logger.info(f"Merged data: {len(merged['experience'])} experiences, {len(merged['education'])} education, {len(merged['skills'])} skills")
        return merged
    
    async def _extract_from_chunk(self, chunk: str, chunk_index: int) -> Dict[str, Any]:
        """Extract structured data from a single chunk"""
        prompt = f"""
Extract information from this CV text. Find ANY work experience, education, skills, or personal details you can identify.

IMPORTANT: Be very liberal in extraction - save ANYTHING that looks like:
- Job titles, company names, or work experience (even without dates)
- Education, degrees, schools, universities (even without dates) 
- Skills, technologies, programming languages
- Contact info, names, locations
- Pay special attention to LOCATIONS and DATES for each position

Examples of what to extract:
- "Software Engineer at Google" → title: "Software Engineer", company: "Google"
- "Stanford University, Computer Science" → institution: "Stanford University", degree: "Computer Science"
- "2020-2023" or "2020 to 2023" or "2020-present" → dates in any format
- "JavaScript, Python, React" → skills
- "Remote", "San Francisco, CA", "New York", "Germany", "Berlin" → locations
- "Machine Learning Engineer at DRWN AI (Remote, Apr 2025 - current)" → extract all parts

CV Text:
{chunk}

Return JSON with this structure (fill only what you find, leave others empty):
{{
    "personal_info": {{
        "full_name": "any name found",
        "email": "any email found", 
        "phone": "any phone found",
        "location": "any location/address found",
        "summary": "any summary/bio text found"
    }},
    "social_links": {{
        "linkedin": "any linkedin.com URL",
        "github": "any github.com URL",
        "portfolio": "any portfolio/website URL",
        "x": "any twitter/x.com URL",
        "medium": "any medium.com URL"
    }},
    "experience": [
        {{
            "title": "job title (required)",
            "company": "company name (required)", 
            "location": "work location - look for Remote, city names, countries, states",
            "start_date": "any date format - be liberal with parsing",
            "end_date": "any date format or 'current' if still working",
            "description": "job description if found"
        }}
    ],
    "education": [
        {{
            "degree": "degree name",
            "institution": "school/university name (required)",
            "location": "school location - look for city, state, country", 
            "start_date": "any date format - be liberal with parsing",
            "end_date": "any date format",
            "description": "any relevant details"
        }}
    ],
    "skills": ["any skills, technologies, or tools mentioned"],
    "certifications": [
        {{
            "name": "certification name",
            "issuer": "who issued it",
            "date": "when obtained",
            "credential_id": "any ID number"
        }}
    ],
    "awards": [
        {{
            "title": "award name",
            "issuer": "who gave it", 
            "date": "when received",
            "description": "award details"
        }}
    ]
}}

CRITICAL: Return ONLY the JSON object, no markdown formatting, no explanations.
        """
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a CV analysis expert. Extract structured information from CV text and return only valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=3000,
                temperature=0.1
            )
            
            response_text = response.choices[0].message.content.strip()
            logger.info(f"🔍 CHUNK {chunk_index} - Raw OpenAI response: {response_text[:500]}...")
            
            # Log chunk content for debugging
            logger.info(f"🔍 CHUNK {chunk_index} - Input text preview: {chunk[:300]}...")
            
            # Clean up response if it has markdown formatting
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            # Try to parse JSON, with fallback for truncated responses
            try:
                parsed_data = json.loads(response_text)
            except json.JSONDecodeError as json_error:
                logger.error(f"Failed to parse JSON from chunk {chunk_index}: {json_error}")
                logger.error(f"Response was: {response_text}")
                
                # Try to fix common JSON issues
                # If response is truncated, try to close it
                if not response_text.endswith('}'):
                    # Try adding closing braces
                    for close_attempts in ['"}]', '"]', '}', '"}]}']:
                        try:
                            fixed_response = response_text + close_attempts
                            parsed_data = json.loads(fixed_response)
                            logger.info(f"✅ Fixed JSON by adding: {close_attempts}")
                            break
                        except json.JSONDecodeError:
                            continue
                    else:
                        # If all fixes fail, return empty data
                        logger.error(f"❌ Could not fix JSON for chunk {chunk_index}, returning empty data")
                        return {
                            "personal_info": {},
                            "social_links": {},
                            "experience": [],
                            "education": [],
                            "skills": [],
                            "certifications": [],
                            "awards": []
                        }
                else:
                    # If response ends with } but still can't parse, return empty
                    logger.error(f"❌ JSON parsing failed for chunk {chunk_index}, returning empty data")
                    return {
                        "personal_info": {},
                        "social_links": {},
                        "experience": [],
                        "education": [],
                        "skills": [],
                        "certifications": [],
                        "awards": []
                    }
            
            # Detailed logging of extracted data
            experiences = parsed_data.get('experience', [])
            education = parsed_data.get('education', [])
            skills = parsed_data.get('skills', [])
            personal_info = parsed_data.get('personal_info', {})
            
            logger.info(f"🔍 CHUNK {chunk_index} - EXTRACTION RESULTS:")
            logger.info(f"  📊 Experiences: {len(experiences)}")
            for i, exp in enumerate(experiences):
                logger.info(f"    {i+1}. {exp.get('title', 'NO TITLE')} at {exp.get('company', 'NO COMPANY')}")
            
            logger.info(f"  🎓 Education: {len(education)}")
            for i, edu in enumerate(education):
                logger.info(f"    {i+1}. {edu.get('degree', 'NO DEGREE')} at {edu.get('institution', 'NO INSTITUTION')}")
            
            logger.info(f"  🛠️ Skills: {len(skills)} - {skills[:10]}")  # Show first 10 skills
            
            logger.info(f"  👤 Personal Info: name={personal_info.get('full_name', 'NOT FOUND')}, email={personal_info.get('email', 'NOT FOUND')}")
            
            return parsed_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from chunk {chunk_index}: {e}")
            logger.error(f"Response was: {response_text[:500]}...")
            return self._get_empty_structure()
        except Exception as e:
            logger.error(f"Error processing chunk {chunk_index}: {e}")
            return self._get_empty_structure()
    
    def _get_empty_structure(self) -> Dict[str, Any]:
        """Return empty data structure"""
        return {
            "personal_info": {},
            "social_links": {},
            "experience": [],
            "education": [],
            "skills": [],
            "certifications": [],
            "awards": []
        }
    
    async def process_cv(self, cv_text: str) -> Dict[str, Any]:
        """
        Process CV text and extract structured information
        Handles large text by chunking and merging results
        """
        if not self.is_available():
            raise Exception("OpenAI client not available")
        
        logger.info(f"Processing CV text of length: {len(cv_text)}")
        
        # Split into chunks if necessary
        chunks = self._chunk_text(cv_text)
        
        # Process each chunk with delays to avoid rate limiting
        chunk_results = []
        for i, chunk in enumerate(chunks):
            logger.info(f"Processing chunk {i + 1}/{len(chunks)}")
            
            # Add delay between chunks to avoid rate limiting
            if i > 0:
                import asyncio
                await asyncio.sleep(2)  # 2 second delay between chunks
            
            result = await self._extract_from_chunk(chunk, i)
            chunk_results.append(result)
        
        # Merge results from all chunks
        merged_data = self._merge_extracted_data(chunk_results)
        
        logger.info("CV processing completed successfully")
        return merged_data