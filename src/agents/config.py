"""
Configuration management for the multi-agent job discovery system.
Handles environment variables, default settings, and configuration validation.
"""

import os
import json
import logging
from typing import Any, Dict, Optional
from pathlib import Path
from dataclasses import dataclass, field

from .models import SystemConfiguration, AgentConfiguration

logger = logging.getLogger(__name__)


@dataclass
class EnvironmentConfig:
    """Environment-specific configuration."""
    
    # Environment type
    environment: str = field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    debug: bool = field(default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true")
    
    # API keys and credentials
    openai_api_key: Optional[str] = field(default_factory=lambda: os.getenv("OPENAI_API_KEY"))

    
    # Database and storage (using Supabase)
    # Note: Using Supabase for database - no local database needed
    
    # Browser automation
    browser_executable_path: Optional[str] = field(default_factory=lambda: os.getenv("BROWSER_EXECUTABLE_PATH"))
    
    # Performance settings
    max_concurrent_workflows: int = field(default_factory=lambda: int(os.getenv("MAX_CONCURRENT_WORKFLOWS", "10")))
    workflow_timeout: int = field(default_factory=lambda: int(os.getenv("WORKFLOW_TIMEOUT", "600")))
    
    # Logging
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    log_file: Optional[str] = field(default_factory=lambda: os.getenv("LOG_FILE"))
    
    # API server
    api_host: str = field(default_factory=lambda: os.getenv("API_HOST", "0.0.0.0"))
    api_port: int = field(default_factory=lambda: int(os.getenv("API_PORT", "8000")))
    
    # Memory persistence
    memory_persistence_dir: Optional[str] = field(default_factory=lambda: os.getenv("MEMORY_PERSISTENCE_DIR"))
    
    # Rate limiting
    rate_limit_requests_per_minute: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_RPM", "60")))
    
    # Monitoring and observability
    enable_metrics: bool = field(default_factory=lambda: os.getenv("ENABLE_METRICS", "true").lower() == "true")
    metrics_port: int = field(default_factory=lambda: int(os.getenv("METRICS_PORT", "9090")))
    
    # Webhooks
    webhook_url: Optional[str] = field(default_factory=lambda: os.getenv("WEBHOOK_URL"))
    webhook_secret: Optional[str] = field(default_factory=lambda: os.getenv("WEBHOOK_SECRET"))


class ConfigurationManager:
    """
    Central configuration manager for the multi-agent system.
    
    Handles loading configuration from:
    - Environment variables
    - Configuration files
    - Default settings
    """
    
    def __init__(self, config_file: Optional[Path] = None):
        self.config_file = config_file
        self.env_config = EnvironmentConfig()
        self._system_config: Optional[SystemConfiguration] = None
        self._config_cache: Dict[str, Any] = {}
        
        # Load configuration
        self._load_configuration()
    
    def get_system_config(self) -> SystemConfiguration:
        """Get the complete system configuration."""
        if self._system_config is None:
            self._system_config = self._build_system_config()
        return self._system_config
    
    def get_agent_config(self, agent_type: str) -> AgentConfiguration:
        """Get configuration for a specific agent type."""
        system_config = self.get_system_config()
        
        agent_configs = {
            "career": system_config.career_agent_config,
            "extraction": system_config.extraction_agent_config,
            "matching": system_config.matching_agent_config
        }
        
        return agent_configs.get(agent_type, AgentConfiguration())
    
    def get_browser_config(self) -> Dict[str, Any]:
        """Get browser configuration."""
        return {
            "headless": not self.env_config.debug,
            "timeout": self.env_config.workflow_timeout * 1000,  # Convert to milliseconds
            "executable_path": self.env_config.browser_executable_path,
            "save_screenshots": self.env_config.debug,
            "viewport_width": 1280,
            "viewport_height": 720
        }
    
    def get_llm_config(self, provider: str = "openai") -> Dict[str, Any]:
        """Get LLM configuration for a specific provider."""
        configs = {
            "openai": {
                "api_key": self.env_config.openai_api_key,
                "model": "gpt-4o-mini",
                "temperature": 0.1,
                "max_tokens": 4000
            },

        }
        
        config = configs.get(provider, configs["openai"])
        
        # Validate API key
        if not config["api_key"]:
            logger.warning(f"No API key found for {provider}")
        
        return config
    
    def get_api_config(self) -> Dict[str, Any]:
        """Get API server configuration."""
        return {
            "host": self.env_config.api_host,
            "port": self.env_config.api_port,
            "debug": self.env_config.debug,
            "reload": self.env_config.debug,
            "log_level": self.env_config.log_level.lower(),
            "cors_origins": self._get_cors_origins(),
            "rate_limiting": {
                "enabled": True,
                "requests_per_minute": self.env_config.rate_limit_requests_per_minute
            }
        }
    
    def get_logging_config(self) -> Dict[str, Any]:
        """Get logging configuration."""
        config = {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S"
                },
                "detailed": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S"
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "level": self.env_config.log_level,
                    "formatter": "default" if not self.env_config.debug else "detailed",
                    "stream": "ext://sys.stdout"
                }
            },
            "root": {
                "level": self.env_config.log_level,
                "handlers": ["console"]
            }
        }
        
        # Add file handler if log file is specified
        if self.env_config.log_file:
            config["handlers"]["file"] = {
                "class": "logging.FileHandler",
                "level": self.env_config.log_level,
                "formatter": "detailed",
                "filename": self.env_config.log_file,
                "mode": "a"
            }
            config["root"]["handlers"].append("file")
        
        return config
    
    def get_performance_config(self) -> Dict[str, Any]:
        """Get performance and scaling configuration."""
        return {
            "max_concurrent_workflows": self.env_config.max_concurrent_workflows,
            "workflow_timeout": self.env_config.workflow_timeout,
            "browser_pool_size": min(self.env_config.max_concurrent_workflows, 5),
            "memory_management": {
                "persistence_enabled": self.env_config.memory_persistence_dir is not None,
                "persistence_dir": self.env_config.memory_persistence_dir,
                "cleanup_interval": 3600,  # 1 hour
                "max_memory_items": 10000
            }
        }
    
    def validate_configuration(self) -> Dict[str, Any]:
        """
        Validate the current configuration and return validation results.
        
        Returns:
            Dictionary with validation status and any issues found
        """
        issues = []
        warnings = []
        
        # Check required API keys
        if not self.env_config.openai_api_key:
            issues.append("No LLM API keys found. Set OPENAI_API_KEY")
        
        # Check memory persistence directory
        if self.env_config.memory_persistence_dir:
            memory_dir = Path(self.env_config.memory_persistence_dir)
            if not memory_dir.exists():
                try:
                    memory_dir.mkdir(parents=True, exist_ok=True)
                    warnings.append(f"Created memory persistence directory: {memory_dir}")
                except Exception as e:
                    issues.append(f"Cannot create memory persistence directory: {e}")
        
        # Check log file directory
        if self.env_config.log_file:
            log_file = Path(self.env_config.log_file)
            if not log_file.parent.exists():
                try:
                    log_file.parent.mkdir(parents=True, exist_ok=True)
                    warnings.append(f"Created log directory: {log_file.parent}")
                except Exception as e:
                    issues.append(f"Cannot create log directory: {e}")
        
        # Check port availability (basic check)
        if self.env_config.api_port < 1024 and os.getuid() != 0:
            warnings.append(f"API port {self.env_config.api_port} may require root privileges")
        
        # Check workflow limits
        if self.env_config.max_concurrent_workflows > 50:
            warnings.append("High concurrent workflow limit may impact system performance")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "environment": self.env_config.environment,
            "debug_mode": self.env_config.debug
        }
    
    def _load_configuration(self) -> None:
        """Load configuration from files and environment."""
        # Load from config file if provided
        if self.config_file and self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    file_config = json.load(f)
                    self._config_cache.update(file_config)
                    logger.info(f"Loaded configuration from {self.config_file}")
            except Exception as e:
                logger.warning(f"Failed to load config file {self.config_file}: {e}")
        
        # Load environment-specific config
        env_config_file = Path(f"config.{self.env_config.environment}.json")
        if env_config_file.exists():
            try:
                with open(env_config_file, 'r') as f:
                    env_specific_config = json.load(f)
                    self._config_cache.update(env_specific_config)
                    logger.info(f"Loaded environment config from {env_config_file}")
            except Exception as e:
                logger.warning(f"Failed to load environment config {env_config_file}: {e}")
    
    def _build_system_config(self) -> SystemConfiguration:
        """Build the system configuration from all sources."""
        # Create agent configurations
        career_config = AgentConfiguration(
            llm_model="gpt-4o-mini",
            max_retries=3,
            timeout_seconds=30,
            headless_browser=not self.env_config.debug,
            save_screenshots=self.env_config.debug
        )
        
        extraction_config = AgentConfiguration(
            llm_model="gpt-4o-mini",
            max_retries=2,
            timeout_seconds=45,
            headless_browser=not self.env_config.debug,
            save_screenshots=self.env_config.debug
        )
        
        matching_config = AgentConfiguration(
            llm_model="gpt-4o",  # Use stronger model for matching analysis
            max_retries=2,
            timeout_seconds=60,
            headless_browser=False,  # Matching agent doesn't need browser
            use_vision=False
        )
        
        return SystemConfiguration(
            career_agent_config=career_config,
            extraction_agent_config=extraction_config,
            matching_agent_config=matching_config,
            browser_headless=not self.env_config.debug,
            browser_timeout=30000,
            max_concurrent_pages=5,
            max_concurrent_workflows=self.env_config.max_concurrent_workflows,
            workflow_timeout=self.env_config.workflow_timeout,
            memory_persistence_enabled=self.env_config.memory_persistence_dir is not None,
            memory_persistence_dir=self.env_config.memory_persistence_dir,
            enable_detailed_logging=self.env_config.debug,
            log_level=self.env_config.log_level,
            track_performance_metrics=self.env_config.enable_metrics,
            webhook_notifications=self.env_config.webhook_url is not None,
            webhook_url=self.env_config.webhook_url
        )
    
    def _get_cors_origins(self) -> List[str]:
        """Get CORS origins based on environment."""
        if self.env_config.environment == "production":
            # In production, specify allowed origins
            return [
                "https://yourdomain.com",
                "https://app.yourdomain.com"
            ]
        else:
            # In development, allow all origins
            return ["*"]


# Global configuration instance
_config_manager: Optional[ConfigurationManager] = None


def get_config_manager(config_file: Optional[Path] = None) -> ConfigurationManager:
    """Get the global configuration manager instance."""
    global _config_manager
    
    if _config_manager is None:
        _config_manager = ConfigurationManager(config_file)
    
    return _config_manager


def get_system_config() -> SystemConfiguration:
    """Convenience function to get system configuration."""
    return get_config_manager().get_system_config()


def get_agent_config(agent_type: str) -> AgentConfiguration:
    """Convenience function to get agent configuration."""
    return get_config_manager().get_agent_config(agent_type)


def validate_configuration() -> Dict[str, Any]:
    """Convenience function to validate configuration."""
    return get_config_manager().validate_configuration()