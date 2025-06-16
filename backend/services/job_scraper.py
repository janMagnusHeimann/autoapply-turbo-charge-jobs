import os
import re
import json
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from openai import OpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage


class JobScrapingService:
    def __init__(self):
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.langchain_llm = ChatOpenAI(
            model="gpt-4",
            temperature=0.1,
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=4000,
            chunk_overlap=200
        )

    async def scrape_jobs(self, career_page_url: str, company_name: str) -> Dict[str, Any]:
        """Scrape jobs from career page using traditional HTML parsing + AI enhancement"""
        try:
            # Fetch the career page
            response = await self.http_client.get(
                career_page_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                follow_redirects=True
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to fetch career page: {response.status_code}")

            # Parse HTML content
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract text content
            page_text = soup.get_text(separator=' ', strip=True)
            
            # Split text into manageable chunks
            text_chunks = self.text_splitter.split_text(page_text)
            
            # Use AI to extract job information
            jobs = []
            for chunk in text_chunks[:3]:  # Process first 3 chunks to avoid token limits
                chunk_jobs = await self._extract_jobs_from_text(chunk, company_name)
                jobs.extend(chunk_jobs)

            # Remove duplicates and enhance with application URLs
            unique_jobs = self._deduplicate_jobs(jobs)
            enhanced_jobs = []
            
            for job in unique_jobs:
                enhanced_job = await self._enhance_job_with_application_url(
                    job, career_page_url, soup
                )
                enhanced_jobs.append(enhanced_job)

            return {
                "success": True,
                "total_found": len(enhanced_jobs),
                "jobs": enhanced_jobs,
                "scraping_method": "traditional_html_ai_enhanced",
                "error_message": None
            }

        except Exception as e:
            return {
                "success": False,
                "total_found": 0,
                "jobs": [],
                "scraping_method": "failed",
                "error_message": str(e)
            }

    async def _extract_jobs_from_text(self, text: str, company_name: str) -> List[Dict[str, Any]]:
        """Extract job information from text using AI"""
        try:
            prompt = f"""
            Extract job listings from the following career page text for {company_name}.
            
            For each job found, extract:
            - title (job title)
            - location (job location)
            - employment_type (full-time, part-time, contract, internship)
            - remote_type (remote, hybrid, on-site)
            - description (brief job description if available)
            - requirements (list of key requirements if available)
            - salary_range (if mentioned)
            
            Return the results as a JSON array. Example:
            [
              {{
                "title": "Software Engineer",
                "location": "Berlin, Germany",
                "employment_type": "full-time",
                "remote_type": "hybrid",
                "description": "Develop web applications...",
                "requirements": ["Python", "React", "3+ years experience"],
                "salary_range": "€60,000 - €80,000"
              }}
            ]
            
            Text to analyze:
            {text[:3000]}
            """

            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a job listing extraction specialist. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.1
            )

            result = response.choices[0].message.content.strip()
            
            # Parse JSON response
            try:
                jobs_data = json.loads(result)
                if isinstance(jobs_data, list):
                    return jobs_data
                return []
            except json.JSONDecodeError:
                return []

        except Exception as e:
            print(f"Error extracting jobs from text: {e}")
            return []

    def _deduplicate_jobs(self, jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate jobs based on title and location"""
        seen = set()
        unique_jobs = []
        
        for job in jobs:
            key = (job.get('title', '').lower(), job.get('location', '').lower())
            if key not in seen and job.get('title'):
                seen.add(key)
                unique_jobs.append(job)
        
        return unique_jobs

    async def _enhance_job_with_application_url(
        self, 
        job: Dict[str, Any], 
        career_page_url: str, 
        soup: BeautifulSoup
    ) -> Dict[str, Any]:
        """Enhance job with application URL"""
        job['company'] = job.get('company', '')
        job['application_url'] = await self._find_application_url(job, career_page_url, soup)
        return job

    async def _find_application_url(
        self, 
        job: Dict[str, Any], 
        career_page_url: str, 
        soup: BeautifulSoup
    ) -> Optional[str]:
        """Find application URL for a specific job"""
        try:
            # Look for links containing job title or "apply"
            job_title = job.get('title', '').lower()
            
            # Find all links on the page
            links = soup.find_all('a', href=True)
            
            for link in links:
                href = link.get('href')
                text = link.get_text(strip=True).lower()
                
                # Check if link is related to this job
                if (job_title in text or 
                    'apply' in text or 
                    'application' in text or
                    job_title in href.lower()):
                    
                    # Convert relative URLs to absolute
                    if href.startswith('/'):
                        return urljoin(career_page_url, href)
                    elif href.startswith('http'):
                        return href
            
            # Fallback: return career page URL
            return career_page_url
            
        except Exception:
            return career_page_url

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()