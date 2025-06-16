#!/usr/bin/env python3
"""
FastAPI Backend Startup Script
Run with: python start.py
"""

import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    # Get port from environment or default to 8000
    port = int(os.getenv("BACKEND_PORT", 8000))
    
    print(f"🚀 Starting FastAPI Job Automation Backend on port {port}")
    print("📋 Available endpoints:")
    print("   - GET  /health")
    print("   - POST /api/web-search-career-page")
    print("   - POST /api/scrape-jobs")
    print("   - POST /api/scrape-jobs-ai-vision")
    print(f"   - Docs: http://localhost:{port}/docs")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )