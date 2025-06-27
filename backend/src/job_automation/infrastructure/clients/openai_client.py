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