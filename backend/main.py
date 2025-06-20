from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import httpx
from dotenv import load_dotenv

# Commented out for simplified GitHub OAuth proxy
# from services.career_discovery import CareerDiscoveryService
# from services.job_scraper import JobScrapingService
# from services.ai_vision_scraper import AIVisionScrapingService
# from services.browser_use_job_agent import search_company_jobs_api, apply_to_jobs_api

# Load environment variables from parent directory
load_dotenv("../.env")
load_dotenv("../.env.local")  # Also load local environment file if it exists

app = FastAPI(title="Job Application Automation API", version="1.0.0")

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

# Pydantic models for GitHub OAuth
class GitHubOAuthRequest(BaseModel):
    code: str
    client_id: str

@app.get("/")
async def root():
    return {"message": "Job Application Automation API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "services": ["career_discovery", "job_scraping", "ai_vision"]}

# Other endpoints commented out for simplified GitHub OAuth proxy
# @app.post("/api/web-search-career-page")
# @app.post("/api/scrape-jobs")
# @app.post("/api/scrape-jobs-ai-vision")  
# @app.post("/api/fetch-content")
# @app.post("/api/browser-use-job-search")
# @app.post("/api/browser-use-apply-jobs")

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