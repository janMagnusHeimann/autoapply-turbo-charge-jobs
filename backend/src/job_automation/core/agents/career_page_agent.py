"""
Career Page Discovery Agent
Core agent for discovering and validating company career pages
"""

import os
import asyncio
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import json
import httpx
import urllib.parse
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from langchain.callbacks import get_openai_callback

from ..models import CompanyData, CareerPageResult

logger = logging.getLogger(__name__)


class CareerPageAgent:
    """Agent responsible for discovering company career pages"""
    
    def __init__(self, openai_api_key: str):
        if not openai_api_key:
            raise ValueError("OpenAI API key is required")
            
        self.llm = ChatOpenAI(
            openai_api_key=openai_api_key,
            model="gpt-4o-mini",  # Cost-efficient model
            temperature=0.1
        )
        
        # Cache for discovered career pages (1 hour TTL)
        self.cache: Dict[str, Dict] = {}
        self.cache_ttl = timedelta(hours=1)
        
        # Common career page patterns
        self.career_page_patterns = [
            "/careers", "/jobs", "/career", "/hiring", "/work-with-us",
            "/join-us", "/opportunities", "/employment", "/open-positions",
            "/jobs/search", "/careers/jobs", "/company/careers", "/about/careers",
            "/work", "/join", "/talent", "/people", "/team/join"
        ]
        
        # Known ATS platforms
        self.ats_patterns = {
            "greenhouse": ["greenhouse.io", "boards.greenhouse.io"],
            "lever": ["jobs.lever.co"],
            "workday": ["myworkdayjobs.com"],
            "smartrecruiters": ["jobs.smartrecruiters.com"],
            "bamboohr": ["bamboohr.com/jobs"],
            "workable": ["workable.com", "apply.workable.com"],
            "jobvite": ["jobvite.com"],
            "icims": ["icims.com"],
        }

    def _get_cache_key(self, company: CompanyData) -> str:
        """Generate cache key for company"""
        return f"{company.name}_{company.website_url or 'no_url'}"

    def _is_cached(self, cache_key: str) -> bool:
        """Check if result is cached and valid"""
        if cache_key not in self.cache:
            return False
        cache_entry = self.cache[cache_key]
        return datetime.utcnow() - cache_entry["timestamp"] < self.cache_ttl

    def _get_cached_result(self, cache_key: str) -> Optional[CareerPageResult]:
        """Get cached result if valid"""
        if self._is_cached(cache_key):
            return CareerPageResult(**self.cache[cache_key]["result"])
        return None

    def _cache_result(self, cache_key: str, result: CareerPageResult):
        """Cache discovery result"""
        self.cache[cache_key] = {
            "result": result.dict(),
            "timestamp": datetime.utcnow()
        }

    def _generate_candidate_urls(self, company: CompanyData) -> List[str]:
        """Generate candidate career page URLs based on patterns"""
        candidates = []
        
        if not company.website_url:
            return candidates
            
        try:
            # Ensure URL has protocol
            if not company.website_url.startswith(('http://', 'https://')):
                company.website_url = 'https://' + company.website_url
            
            parsed_url = urllib.parse.urlparse(company.website_url)
            base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
            
            # Add pattern-based URLs
            for pattern in self.career_page_patterns:
                candidates.append(f"{base_url}{pattern}")
            
            # Add subdomain variations
            domain_parts = parsed_url.netloc.split('.')
            if len(domain_parts) >= 2:
                root_domain = '.'.join(domain_parts[-2:])
                candidates.extend([
                    f"https://careers.{root_domain}",
                    f"https://jobs.{root_domain}",
                    f"https://apply.{root_domain}"
                ])
            
            # Add ATS platform URLs
            company_slug = company.name.lower().replace(' ', '-').replace('&', 'and')
            company_slug = ''.join(c for c in company_slug if c.isalnum() or c == '-')
            
            for ats_name, domains in self.ats_patterns.items():
                for domain in domains:
                    if ats_name == "greenhouse":
                        candidates.extend([
                            f"https://{company_slug}.{domain}",
                            f"https://boards.{domain}/{company_slug}"
                        ])
                    elif ats_name == "lever":
                        candidates.append(f"https://{domain}/{company_slug}")
                    else:
                        candidates.append(f"https://{company_slug}.{domain}")
                        
        except Exception as e:
            logger.warning(f"Error generating candidate URLs for {company.name}: {e}")
        
        return list(set(candidates))  # Remove duplicates

    async def _validate_career_page(self, url: str, company: CompanyData) -> Dict[str, Any]:
        """Validate if a URL is actually a career page"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Try HEAD request first
                try:
                    response = await client.head(
                        url,
                        headers={'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)'},
                        follow_redirects=True
                    )
                    
                    if response.status_code not in [200, 403]:  # 403 might still have content
                        return {"valid": False, "score": 0.0, "reason": f"HTTP {response.status_code}"}
                        
                except httpx.RequestError:
                    return {"valid": False, "score": 0.0, "reason": "Connection failed"}
                
                # Get content for analysis
                try:
                    response = await client.get(
                        url,
                        headers={'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)'},
                        follow_redirects=True
                    )
                    
                    if response.status_code != 200:
                        return {"valid": False, "score": 0.0, "reason": f"HTTP {response.status_code}"}
                    
                    content = response.text.lower()
                    score = self._analyze_career_content(content, company)
                    
                    return {
                        "valid": score > 0.3,
                        "score": min(score, 1.0),
                        "reason": f"Content analysis score: {score:.2f}"
                    }
                    
                except httpx.RequestError as e:
                    return {"valid": False, "score": 0.0, "reason": f"Content fetch failed: {str(e)}"}
                    
        except Exception as e:
            logger.warning(f"Error validating {url}: {e}")
            return {"valid": False, "score": 0.0, "reason": str(e)}

    def _analyze_career_content(self, content: str, company: CompanyData) -> float:
        """Analyze content to determine if it's a career page"""
        score = 0.0
        
        # Check for career-related keywords
        career_keywords = [
            'job', 'career', 'position', 'opportunity', 'hiring', 'apply',
            'employment', 'vacancy', 'opening', 'role', 'work', 'join'
        ]
        
        keyword_count = sum(1 for keyword in career_keywords if keyword in content)
        score += min(keyword_count / len(career_keywords), 0.4)
        
        # Check for application-related elements
        app_elements = ['apply', 'application', 'submit', 'resume', 'cv']
        app_count = sum(1 for element in app_elements if element in content)
        score += min(app_count / len(app_elements), 0.3)
        
        # Check for job listing indicators
        if any(indicator in content for indicator in ['job-', 'position-', 'role-', 'opening-']):
            score += 0.2
        
        # Check company name presence
        if company.name.lower() in content:
            score += 0.1
        
        return score

    async def _ai_career_page_discovery(self, company: CompanyData) -> Dict[str, Any]:
        """Use AI to discover and analyze career pages"""
        
        search_prompt = f"""
        You are a career page discovery specialist. Find the official careers/jobs page for this company:
        
        Company: {company.name}
        Website: {company.website_url or 'Not provided'}
        Industry: {company.industry or 'Not specified'}
        
        Your task:
        1. Identify the most likely career page URL
        2. Provide confidence score (0.0-1.0)
        3. Suggest alternative URLs if main one is uncertain
        
        Consider:
        - Common career page patterns (/careers, /jobs, etc.)
        - ATS platforms (Greenhouse, Lever, Workday, etc.)
        - Company-specific naming conventions
        - Industry-specific hiring practices
        
        Respond in JSON format:
        {{
            "primary_url": "https://example.com/careers",
            "confidence": 0.85,
            "reasoning": "Found on company domain with standard /careers path",
            "alternative_urls": ["https://jobs.example.com", "https://example.greenhouse.io"],
            "discovery_method": "pattern_analysis"
        }}
        """
        
        try:
            with get_openai_callback() as cb:
                messages = [
                    SystemMessage(content="You are a career page discovery expert. Respond only with valid JSON."),
                    HumanMessage(content=search_prompt)
                ]
                
                response = await self.llm.agenerate([messages])
                content = response.generations[0][0].text
                
                # Parse JSON response
                try:
                    # Extract JSON from response
                    content = content.strip()
                    if content.startswith('```json'):
                        content = content[7:]
                    if content.endswith('```'):
                        content = content[:-3]
                    
                    result = json.loads(content)
                    cost = cb.total_cost if hasattr(cb, 'total_cost') else 0.0
                    
                    return {
                        "success": True,
                        "primary_url": result.get("primary_url"),
                        "confidence": float(result.get("confidence", 0.0)),
                        "reasoning": result.get("reasoning", ""),
                        "alternative_urls": result.get("alternative_urls", []),
                        "discovery_method": result.get("discovery_method", "ai_analysis"),
                        "cost": cost
                    }
                    
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse AI response as JSON: {e}")
                    return {"success": False, "error": "Invalid JSON response from AI"}
                    
        except Exception as e:
            logger.error(f"AI career page discovery failed: {e}")
            return {"success": False, "error": str(e)}

    async def discover_career_page(self, company: CompanyData) -> CareerPageResult:
        """Main method to discover career page for a company"""
        
        # Check cache first
        cache_key = self._get_cache_key(company)
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            logger.info(f"Returning cached result for {company.name}")
            return cached_result
        
        logger.info(f"Discovering career page for {company.name}")
        
        total_cost = 0.0
        best_url = None
        best_score = 0.0
        discovery_method = "pattern_matching"
        additional_urls = []
        error_message = None
        
        try:
            # Step 1: Generate candidate URLs
            candidate_urls = self._generate_candidate_urls(company)
            logger.info(f"Generated {len(candidate_urls)} candidate URLs for {company.name}")
            
            # Step 2: Quick validation of top candidates (limit to avoid rate limiting)
            validation_tasks = []
            for url in candidate_urls[:10]:  # Limit to top 10 candidates
                validation_tasks.append(self._validate_career_page(url, company))
            
            validation_results = await asyncio.gather(*validation_tasks, return_exceptions=True)
            
            # Process validation results
            for i, result in enumerate(validation_results):
                if isinstance(result, Exception):
                    continue
                    
                url = candidate_urls[i]
                if result["valid"] and result["score"] > best_score:
                    if best_url:
                        additional_urls.append(best_url)
                    best_url = url
                    best_score = result["score"]
                elif result["valid"]:
                    additional_urls.append(url)
            
            # Step 3: If no good candidates found, use AI discovery
            if best_score < 0.5:
                logger.info(f"Low confidence from pattern matching, trying AI discovery for {company.name}")
                ai_result = await self._ai_career_page_discovery(company)
                total_cost += ai_result.get("cost", 0.0)
                
                if ai_result.get("success") and ai_result.get("primary_url"):
                    # Validate AI-suggested URL
                    ai_validation = await self._validate_career_page(ai_result["primary_url"], company)
                    
                    if ai_validation["valid"] and ai_validation["score"] > best_score:
                        best_url = ai_result["primary_url"]
                        best_score = ai_validation["score"]
                        discovery_method = "ai_analysis"
                        additional_urls.extend(ai_result.get("alternative_urls", []))
            
            # Step 4: Create result
            result = CareerPageResult(
                company_id=company.id,
                company_name=company.name,
                career_page_url=best_url,
                confidence_score=best_score,
                validation_status="verified" if best_score > 0.6 else "pending",
                discovery_method=discovery_method,
                additional_urls=additional_urls[:5],  # Limit to top 5
                cost_usd=total_cost
            )
            
            # Cache result
            self._cache_result(cache_key, result)
            
            logger.info(f"Career page discovery completed for {company.name}: {best_url or 'None'} (score: {best_score:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"Error discovering career page for {company.name}: {e}")
            error_result = CareerPageResult(
                company_id=company.id,
                company_name=company.name,
                career_page_url=None,
                confidence_score=0.0,
                validation_status="failed",
                discovery_method="error",
                error_message=str(e),
                cost_usd=total_cost
            )
            self._cache_result(cache_key, error_result)
            return error_result

    async def discover_multiple_career_pages(self, companies: List[CompanyData]) -> List[CareerPageResult]:
        """Discover career pages for multiple companies with proper rate limiting"""
        results = []
        
        # Process companies in batches to avoid overwhelming APIs
        batch_size = 3
        for i in range(0, len(companies), batch_size):
            batch = companies[i:i + batch_size]
            
            # Process batch concurrently
            batch_tasks = [self.discover_career_page(company) for company in batch]
            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            for j, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    logger.error(f"Error processing company {batch[j].name}: {result}")
                    error_result = CareerPageResult(
                        company_id=batch[j].id,
                        company_name=batch[j].name,
                        career_page_url=None,
                        confidence_score=0.0,
                        validation_status="failed",
                        discovery_method="error",
                        error_message=str(result)
                    )
                    results.append(error_result)
                else:
                    results.append(result)
            
            # Add delay between batches
            if i + batch_size < len(companies):
                await asyncio.sleep(2)  # 2 second delay between batches
        
        return results

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        valid_entries = sum(1 for key in self.cache.keys() if self._is_cached(key))
        return {
            "total_entries": len(self.cache),
            "valid_entries": valid_entries,
            "expired_entries": len(self.cache) - valid_entries
        }

    def clear_cache(self):
        """Clear the career page cache"""
        self.cache.clear()
        logger.info("Career page cache cleared")