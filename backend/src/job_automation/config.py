"""
Simplified configuration for the job automation system
"""

import os
from dataclasses import dataclass
from pathlib import Path
import logging

try:
    from dotenv import load_dotenv
    # Load .env from backend directory and parent directory
    backend_env = Path(__file__).parent.parent.parent / ".env"
    root_env = Path(__file__).parent.parent.parent.parent / ".env"
    
    if backend_env.exists():
        load_dotenv(backend_env)
    elif root_env.exists():
        load_dotenv(root_env)
except ImportError:
    pass  # dotenv not available

logger = logging.getLogger(__name__)

@dataclass
class Config:
    """Simplified configuration class"""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # OpenAI Configuration
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    
    # LLM Settings
    llm_temperature: float = 0.1
    llm_max_tokens: int = 4000
    
    # Browser Configuration
    browser_headless: bool = True
    browser_timeout: int = 30000
    
    # General Settings
    demo_mode: bool = False
    log_level: str = "INFO"
    
    def __post_init__(self):
        """Load configuration from environment variables"""
        # API settings
        self.api_host = os.getenv("API_HOST", self.api_host)
        self.api_port = int(os.getenv("API_PORT", str(self.api_port)))
        
        # OpenAI settings
        self.openai_api_key = os.getenv("OPENAI_API_KEY", self.openai_api_key)
        self.openai_model = os.getenv("OPENAI_MODEL", self.openai_model)
        
        # LLM settings
        self.llm_temperature = float(os.getenv("LLM_TEMPERATURE", str(self.llm_temperature)))
        self.llm_max_tokens = int(os.getenv("LLM_MAX_TOKENS", str(self.llm_max_tokens)))
        
        # Browser settings
        self.browser_headless = os.getenv("BROWSER_HEADLESS", "true").lower() == "true"
        self.browser_timeout = int(os.getenv("BROWSER_TIMEOUT", str(self.browser_timeout)))
        
        # General settings
        self.demo_mode = os.getenv("DEMO_MODE", "false").lower() == "true"
        self.log_level = os.getenv("LOG_LEVEL", self.log_level)
        
        # Log configuration status
        self._log_config_status()
    
    def _log_config_status(self):
        """Log configuration status"""
        logger.info("🔧 Configuration loaded:")
        logger.info(f"   API: {self.api_host}:{self.api_port}")
        logger.info(f"   OpenAI: {'✅ Configured' if self.openai_api_key and self.openai_api_key != 'your_openai_api_key_here' else '❌ Missing'}")
        logger.info(f"   Model: {self.openai_model}")
        logger.info(f"   Browser: {'Headless' if self.browser_headless else 'Visible'}")
        logger.info(f"   Demo mode: {'✅ Enabled' if self.demo_mode else '❌ Disabled'}")
        
        if not self.openai_api_key or self.openai_api_key == "your_openai_api_key_here":
            logger.warning("⚠️ OpenAI API key not configured - set OPENAI_API_KEY environment variable")
    
    def validate(self) -> bool:
        """Validate configuration"""
        if not self.demo_mode:
            if not self.openai_api_key or self.openai_api_key == "your_openai_api_key_here":
                logger.error("❌ OpenAI API key required when demo mode is disabled")
                return False
        
        if self.api_port < 1 or self.api_port > 65535:
            logger.error("❌ Invalid API port")
            return False
        
        return True

# Global configuration instance
config = Config()