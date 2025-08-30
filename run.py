#!/usr/bin/env python3
"""
Simple script to run the ComplianceAI FastAPI application
"""

import uvicorn
from app.main import app

if __name__ == "__main__":
    print("Starting ComplianceAI server...")
    print("Open your browser to: http://127.0.0.1:8000")
    print("API docs available at: http://127.0.0.1:8000/docs")
    print("Press Ctrl+C to stop the server")
    print("-" * 50)
    
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )