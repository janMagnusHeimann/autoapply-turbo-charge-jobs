"""
LLM Factory - Creates appropriate LLM clients based on configuration
"""

import logging
from typing import Optional, Dict, Any, List, Union
from abc import ABC, abstractmethod

from .openai_client import get_openai_client
from ...config import config

logger = logging.getLogger(__name__)

class BaseLLMClient(ABC):
    """Base interface for LLM clients"""
    
    @abstractmethod
    async def generate_text(self, prompt: str, **kwargs) -> str:
        """Generate text from prompt"""
        pass
    
    @abstractmethod
    async def generate_with_images(self, prompt: str, images: List[str], **kwargs) -> str:
        """Generate text with image inputs (vision)"""
        pass
    
    @abstractmethod
    def get_client_info(self) -> Dict[str, Any]:
        """Get client information and capabilities"""
        pass

class OpenAIClient(BaseLLMClient):
    """OpenAI client wrapper"""
    
    def __init__(self, model: str = "gpt-4o", **kwargs):
        self.model = model
        self.client = get_openai_client(model=model)
        logger.info(f"Initialized OpenAI client with model: {model}")
    
    async def generate_text(self, prompt: str, **kwargs) -> str:
        """Generate text using OpenAI"""
        try:
            messages = [{"role": "user", "content": prompt}]
            
            # Handle conversation history if provided
            if "messages" in kwargs:
                messages = kwargs["messages"]
            
            response = await self.client.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=kwargs.get("temperature", 0.1),
                max_tokens=kwargs.get("max_tokens", 4000)
            )
            
            return response.choices[0].message.content or ""
            
        except Exception as e:
            logger.error(f"OpenAI generation failed: {e}")
            raise
    
    async def generate_with_images(self, prompt: str, images: List[str], **kwargs) -> str:
        """Generate text with image inputs using OpenAI vision"""
        try:
            # Create message content with text and images
            content = [{"type": "text", "text": prompt}]
            
            for image in images:
                content.append({
                    "type": "image_url",
                    "image_url": {"url": image}
                })
            
            messages = [{"role": "user", "content": content}]
            
            response = await self.client.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=kwargs.get("temperature", 0.1),
                max_tokens=kwargs.get("max_tokens", 4000)
            )
            
            return response.choices[0].message.content or ""
            
        except Exception as e:
            logger.error(f"OpenAI vision generation failed: {e}")
            raise
    
    def get_client_info(self) -> Dict[str, Any]:
        """Get OpenAI client information"""
        return {
            "provider": "openai",
            "model": self.model,
            "supports_vision": True,
            "supports_streaming": True
        }

class MockLLMClient(BaseLLMClient):
    """Mock LLM client for testing"""
    
    def __init__(self, **kwargs):
        self.model = "mock-model"
        logger.info("Initialized Mock LLM client")
    
    async def generate_text(self, prompt: str, **kwargs) -> str:
        """Generate mock response"""
        return f"Mock response to: {prompt[:50]}..."
    
    async def generate_with_images(self, prompt: str, images: List[str], **kwargs) -> str:
        """Generate mock response with images"""
        return f"Mock vision response to: {prompt[:50]}... with {len(images)} images"
    
    def get_client_info(self) -> Dict[str, Any]:
        """Get mock client information"""
        return {
            "provider": "mock",
            "model": self.model,
            "supports_vision": True,
            "supports_streaming": False
        }

def create_llm_client(
    provider: str = "openai",
    model: Optional[str] = None,
    **kwargs
) -> BaseLLMClient:
    """
    Factory function to create LLM clients
    
    Args:
        provider: LLM provider (openai, mock)
        model: Model name to use
        **kwargs: Additional client parameters
        
    Returns:
        Configured LLM client instance
        
    Raises:
        ValueError: If provider is unsupported or required config is missing
    """
    # Merge kwargs with config defaults
    final_params = {
        "temperature": config.llm.temperature,
        "max_tokens": config.llm.max_tokens,
        "timeout": config.llm.timeout,
        **kwargs
    }
    
    if provider == "openai":
        if not config.llm.openai_api_key:
            raise ValueError("OpenAI API key not configured")
        
        model = model or config.llm.openai_model
        return OpenAIClient(model=model, **final_params)
    
    elif provider == "mock":
        return MockLLMClient(**final_params)
    
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")

def get_default_client() -> BaseLLMClient:
    """Get default LLM client based on configuration"""
    
    # Try OpenAI first
    if config.llm.openai_api_key:
        return create_llm_client("openai")
    
    # Fallback to mock for testing
    logger.warning("No LLM API keys configured, using mock client")
    return create_llm_client("mock")

def get_vision_client() -> BaseLLMClient:
    """Get LLM client optimized for vision tasks"""
    
    if config.llm.openai_api_key:
        return create_llm_client("openai", model="gpt-4o")
    
    # Fallback to mock
    return create_llm_client("mock")

def list_available_providers() -> List[str]:
    """List all available LLM providers"""
    providers = ["mock"]  # Always available
    
    if config.llm.openai_api_key:
        providers.append("openai")
    
    return providers

def get_provider_info() -> Dict[str, Dict[str, Any]]:
    """Get information about all available providers"""
    info = {}
    
    for provider in list_available_providers():
        try:
            client = create_llm_client(provider)
            info[provider] = client.get_client_info()
        except Exception as e:
            info[provider] = {"error": str(e)}
    
    return info 