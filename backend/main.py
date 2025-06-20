from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import httpx
import asyncio
import logging
from urllib.parse import urljoin, urlparse
from dotenv import load_dotenv
import openai
import anthropic

# Load environment variables from parent directory
load_dotenv("../.env")
load_dotenv("../.env.local")  # Also load local environment file if it exists

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Job Application Automation API", version="1.0.0")

# Initialize AI clients with secure API key handling
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    return openai.OpenAI(api_key=api_key)

def get_anthropic_client():
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")
    return anthropic.Anthropic(api_key=api_key)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8087", "http://localhost:5173", "http://localhost:8080", "http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services (commented out for simplified version)
# career_discovery = CareerDiscoveryService()
# job_scraper = JobScrapingService()
# ai_vision_scraper = AIVisionScrapingService()

# Pydantic models
class GitHubOAuthRequest(BaseModel):
    code: str
    client_id: str

class WebSearchRequest(BaseModel):
    company_name: str
    
class FetchContentRequest(BaseModel):
    url: str
    
class BrowserUseJobSearchRequest(BaseModel):
    company_name: str
    career_page_url: str

@app.get("/")
async def root():
    return {"message": "Job Application Automation API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "services": ["career_discovery", "job_scraping", "ai_vision"]}

@app.post("/api/web-search-career-page")
async def web_search_career_page(request: WebSearchRequest):
    """Search for company career page using AI"""
    try:
        client = get_openai_client()
        
        # Use OpenAI to search for career page
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a career page discovery assistant. Given a company name, provide the most likely career page URL. Respond with only the URL, no additional text."
                },
                {
                    "role": "user",
                    "content": f"Find the career page URL for {request.company_name}. Return only the URL."
                }
            ],
            max_tokens=100,
            temperature=0.1
        )
        
        career_url = response.choices[0].message.content.strip()
        logger.info(f"Found career page for {request.company_name}: {career_url}")
        
        return {
            "success": True,
            "career_page_url": career_url,
            "company_name": request.company_name
        }
        
    except Exception as e:
        logger.error(f"Error searching career page for {request.company_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Career page search failed: {str(e)}")

@app.post("/api/fetch-content")
async def fetch_content(request: FetchContentRequest):
    """Fetch content from URL with user agent and error handling"""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }
        
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(request.url, headers=headers)
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"Failed to fetch content from {request.url}")
            
            content = response.text
            logger.info(f"Successfully fetched content from {request.url} ({len(content)} chars)")
            
            return {
                "success": True,
                "content": content,
                "url": request.url,
                "status_code": response.status_code
            }
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Request timeout")
    except Exception as e:
        logger.error(f"Error fetching content from {request.url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Content fetch failed: {str(e)}")

@app.post("/api/browser-use-job-search")
async def browser_use_job_search(request: BrowserUseJobSearchRequest):
    """Use Anthropic's browser automation to scrape jobs"""
    try:
        client = get_anthropic_client()
        
        # Use Anthropic Claude to analyze the career page and extract job listings
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=4000,
            messages=[
                {
                    "role": "user",
                    "content": f"""
                    You are a job scraping assistant. Given a company name and career page URL, 
                    extract job listings with the following information:
                    - Job title
                    - Location
                    - Department
                    - Job type (full-time, part-time, contract, etc.)
                    - Experience level
                    - Brief description
                    - Application URL
                    
                    Company: {request.company_name}
                    Career Page: {request.career_page_url}
                    
                    First, fetch the content from the career page, then analyze it to extract job listings.
                    Return the results in JSON format with an array of job objects.
                    """
                }
            ]
        )
        
        # Parse the response and extract job data
        job_data = response.content[0].text
        logger.info(f"Browser Use job search completed for {request.company_name}")
        
        return {
            "success": True,
            "company_name": request.company_name,
            "career_page_url": request.career_page_url,
            "jobs": job_data
        }
        
    except Exception as e:
        logger.error(f"Error in browser use job search for {request.company_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Browser Use job search failed: {str(e)}")

@app.post("/api/github-oauth/token")
async def github_oauth_token(request: GitHubOAuthRequest):
    """Proxy GitHub OAuth token exchange to avoid CORS issues"""
    try:
        github_client_secret = os.getenv("GITHUB_CLIENT_SECRET")
        print(f"DEBUG: GitHub client secret found: {bool(github_client_secret)}")
        print(f"DEBUG: Client ID received: {request.client_id}")
        print(f"DEBUG: GitHub client secret (first 8 chars): {github_client_secret[:8] if github_client_secret else 'None'}")
        
        if not github_client_secret or github_client_secret == "your_github_client_secret_here":
            raise HTTPException(
                status_code=500, 
                detail="GitHub client secret not configured. Please set GITHUB_CLIENT_SECRET in your .env file."
            )
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                json={
                    "client_id": request.client_id,
                    "client_secret": github_client_secret,
                    "code": request.code,
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="GitHub OAuth failed")
            
            data = response.json()
            
            if "error" in data:
                raise HTTPException(status_code=400, detail=f"GitHub OAuth error: {data.get('error_description', data['error'])}")
            
            return data
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)