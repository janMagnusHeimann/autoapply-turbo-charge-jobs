#!/usr/bin/env python3
"""
Simplified Job Discovery System Startup Script
"""

import sys
import logging
from pathlib import Path

# Add src directory to Python path
sys.path.insert(0, str(Path(__file__).parent / "src"))

def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),
        ]
    )

def print_startup_banner():
    """Print startup banner"""
    print("\n" + "="*60)
    print("🤖 SIMPLIFIED JOB DISCOVERY SYSTEM")
    print("="*60)
    print("📍 Version: 2.0.0 (Simplified)")
    print("🎯 Architecture: Clean Agent-Based System")
    print("="*60)
    print()

def main():
    """Main entry point"""
    setup_logging()
    print_startup_banner()

    logger = logging.getLogger(__name__)

    try:
        # Import and validate configuration
        from job_automation.config import config
        
        logger.info("🔧 Validating configuration...")
        if not config.validate():
            logger.error("❌ Configuration validation failed")
            sys.exit(1)
        
        # Import and run the API
        import uvicorn
        from job_automation.infrastructure.api.main import app
        
        logger.info("🚀 Starting simplified job discovery API...")
        
        uvicorn.run(
            app,
            host=config.api_host,
            port=config.api_port,
            log_level=config.log_level.lower(),
            access_log=True,
            reload=False
        )
        
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except ImportError as e:
        logger.error(f"❌ Import error: {e}")
        logger.error("Please install required dependencies: pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 