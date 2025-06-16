import os
import re
import httpx
from typing import Optional, Dict, Any
from openai import OpenAI
from urllib.parse import urlparse, urljoin


class CareerDiscoveryService:
    def __init__(self):
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def search_career_page(self, company_name: str, website_url: Optional[str] = None) -> Dict[str, Any]:
        """Use OpenAI to search for company career page"""
        try:
            # Create search query
            search_query = f"{company_name} careers jobs page"
            if website_url:
                search_query += f" site:{urlparse(website_url).netloc}"

            # Use OpenAI to search for career page
            search_prompt = f"""
            I need to find the careers/jobs page for the company "{company_name}".
            {f'Their main website is: {website_url}' if website_url else ''}
            
            Please search for their careers page and return the most likely URL.
            Look for pages that typically contain job listings, like:
            - /careers
            - /jobs  
            - /opportunities
            - /join-us
            - /work-with-us
            
            Return only the full URL of the careers page, nothing else.
            """

            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a web search assistant that helps find company career pages. Return only the URL."},
                    {"role": "user", "content": search_prompt}
                ],
                max_tokens=100,
                temperature=0.1
            )

            career_url = response.choices[0].message.content.strip()

            # Validate the URL
            if not career_url.startswith(('http://', 'https://')):
                # Try to construct a valid URL
                if website_url:
                    base_domain = urlparse(website_url).netloc
                    career_url = f"https://{base_domain}/careers"
                else:
                    career_url = f"https://{company_name.lower().replace(' ', '')}.com/careers"

            # Test if the URL is accessible
            try:
                response = await self.http_client.head(
                    career_url,
                    headers={'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)'},
                    follow_redirects=True
                )
                
                if response.status_code == 200:
                    confidence = 0.9
                elif response.status_code in [301, 302, 303, 307, 308]:
                    confidence = 0.7
                else:
                    confidence = 0.3
                    
            except Exception:
                confidence = 0.2

            return {
                "success": True,
                "career_page_url": career_url,
                "confidence_score": confidence,
                "discovery_method": "openai_search",
                "error_message": None
            }

        except Exception as e:
            return {
                "success": False,
                "career_page_url": None,
                "confidence_score": 0.0,
                "discovery_method": "failed",
                "error_message": str(e)
            }

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.http_client.aclose()