"""
Gemini Client for Job Search Agent with Google Search capabilities
"""

import logging
import json
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime

try:
    import google.generativeai as genai
except ImportError:
    genai = None

from ...config import config

logger = logging.getLogger(__name__)

class GeminiClient:
    """Client for Google Gemini API with search capabilities"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.0-flash-exp"):
        if genai is None:
            raise ImportError("google-generativeai package not installed. Run: pip install google-generativeai")
        
        self.api_key = api_key or self._get_api_key()
        if not self.api_key:
            raise ValueError("Gemini API key not provided and GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=self.api_key)
        
        # Initialize model with search tools
        self.model_name = model
        self.model = genai.GenerativeModel(
            model_name=model,
            tools=['google_search']  # Enable Google Search tool
        )
        
        # Rate limiting
        self.last_request_time = 0
        self.min_request_interval = 1.0  # Minimum seconds between requests
        
        logger.info(f"Initialized Gemini client with model: {model}")
    
    def _get_api_key(self) -> Optional[str]:
        """Get API key from config or environment"""
        import os
        return (
            getattr(config.llm, 'gemini_api_key', None) or 
            os.getenv('GEMINI_API_KEY') or
            os.getenv('GOOGLE_AI_API_KEY')
        )
    
    async def _rate_limit(self):
        """Implement rate limiting"""
        current_time = asyncio.get_event_loop().time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.min_request_interval:
            wait_time = self.min_request_interval - time_since_last
            await asyncio.sleep(wait_time)
        
        self.last_request_time = asyncio.get_event_loop().time()
    
    async def search_with_context(self, query: str, context: str = "") -> str:
        """Search with Gemini using Google Search tool"""
        await self._rate_limit()
        
        try:
            full_prompt = f"""
            {context}
            
            Search Query: {query}
            
            Please search for this information and provide a comprehensive response.
            Focus on current, accurate information.
            """
            
            response = await self.model.generate_content_async(full_prompt)
            return response.text
            
        except Exception as e:
            logger.error(f"Gemini search failed for query '{query}': {e}")
            raise
    
    async def extract_structured_data(self, content: str, schema: str, instructions: str = "") -> Dict[str, Any]:
        """Extract structured data from content using Gemini"""
        await self._rate_limit()
        
        try:
            prompt = f"""
            {instructions}
            
            Extract data from the following content according to this schema:
            
            Schema: {schema}
            
            Content to analyze:
            {content}
            
            Return the extracted data as valid JSON only, no additional text.
            If no data can be extracted, return an empty JSON object {{}}.
            """
            
            response = await self.model.generate_content_async(prompt)
            
            # Try to parse JSON response
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            try:
                return json.loads(response_text)
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse JSON response: {e}")
                logger.warning(f"Raw response: {response_text}")
                return {}
                
        except Exception as e:
            logger.error(f"Gemini extraction failed: {e}")
            raise
    
    async def analyze_and_rank(self, items: List[Dict[str, Any]], criteria: str, instructions: str = "") -> List[Dict[str, Any]]:
        """Analyze and rank items based on criteria using Gemini"""
        await self._rate_limit()
        
        try:
            prompt = f"""
            {instructions}
            
            Analyze and rank the following items based on these criteria:
            {criteria}
            
            Items to analyze:
            {json.dumps(items, indent=2, default=str)}
            
            For each item, provide:
            1. A match score (0-100)
            2. Detailed explanation of the scoring
            3. Ranking relative to other items
            
            Return the results as a JSON array, ordered by match score (highest first).
            Each item should include all original data plus the analysis.
            """
            
            response = await self.model.generate_content_async(prompt)
            
            # Parse JSON response
            response_text = response.text.strip()
            
            # Clean markdown formatting
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            try:
                return json.loads(response_text)
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse ranking JSON: {e}")
                return items  # Return original items if parsing fails
                
        except Exception as e:
            logger.error(f"Gemini ranking failed: {e}")
            raise
    
    async def generate_search_queries(self, base_query: str, user_context: str, num_queries: int = 4) -> List[str]:
        """Generate multiple targeted search queries"""
        await self._rate_limit()
        
        try:
            prompt = f"""
            Generate {num_queries} different search queries to find job opportunities.
            
            Base query: {base_query}
            User context: {user_context}
            
            Create diverse queries that will search:
            1. Company career pages
            2. Job boards (LinkedIn, Indeed, etc.)
            3. ATS systems (Greenhouse, Lever, etc.)
            4. General web search for opportunities
            
            Make queries specific and effective for finding current job openings.
            
            Return as a JSON array of strings, no additional text.
            """
            
            response = await self.model.generate_content_async(prompt)
            response_text = response.text.strip()
            
            # Clean response
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            try:
                queries = json.loads(response_text)
                return queries if isinstance(queries, list) else [base_query]
            except json.JSONDecodeError:
                logger.warning("Failed to parse search queries, using base query")
                return [base_query]
                
        except Exception as e:
            logger.error(f"Query generation failed: {e}")
            return [base_query]
    
    async def analyze_job_fit(self, job_data: Dict[str, Any], user_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze how well a job fits a user's profile"""
        await self._rate_limit()
        
        try:
            prompt = f"""
            Analyze how well this job matches the user's profile.
            
            Job:
            {json.dumps(job_data, indent=2, default=str)}
            
            User Profile:
            {json.dumps(user_profile, indent=2, default=str)}
            
            Provide detailed analysis including:
            - Overall match score (0-100)
            - Skill match analysis
            - Experience level fit
            - Location compatibility
            - Salary alignment
            - Cultural fit indicators
            - Missing skills/requirements
            - Matching skills/strengths
            - Recommendations (Apply/Don't Apply/Maybe)
            - Suggestions for improvement
            
            Return as JSON with these fields:
            {
                "match_score": number,
                "skill_match_score": number,
                "location_match_score": number,
                "experience_match_score": number,
                "salary_match_score": number,
                "culture_match_score": number,
                "match_explanation": string,
                "missing_skills": [strings],
                "matching_skills": [strings],
                "recommendation": string,
                "improvement_suggestions": [strings]
            }
            """
            
            response = await self.model.generate_content_async(prompt)
            return await self._parse_json_response(response.text)
            
        except Exception as e:
            logger.error(f"Job fit analysis failed: {e}")
            raise
    
    async def _parse_json_response(self, response_text: str) -> Dict[str, Any]:
        """Parse JSON response with error handling"""
        response_text = response_text.strip()
        
        # Remove markdown formatting
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        
        try:
            return json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON: {e}")
            logger.warning(f"Raw response: {response_text[:500]}...")
            raise ValueError(f"Invalid JSON response from Gemini: {e}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the Gemini model"""
        return {
            "provider": "google",
            "model": self.model_name,
            "supports_search": True,
            "supports_vision": "vision" in self.model_name.lower(),
            "rate_limit": self.min_request_interval
        }

# Factory function for easy integration with existing LLM factory
def get_gemini_client(api_key: Optional[str] = None, model: str = "gemini-2.0-flash-exp") -> GeminiClient:
    """Factory function to create Gemini client"""
    return GeminiClient(api_key=api_key, model=model)
