#!/usr/bin/env python3
"""
Simple test script to verify Claude API integration works.
Run this script after setting your CLAUDE_API_KEY in the .env file.
"""

import os
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.services.ai_analyzer import AIAnalyzer
from app.core.config import settings

def test_claude_integration():
    """Test basic Claude API integration"""
    
    # Check if API key is configured
    if not settings.claude_api_key or settings.claude_api_key == "your-claude-api-key-here":
        print("❌ Please set your CLAUDE_API_KEY in the .env file")
        return False
    
    print("🔍 Testing Claude API integration...")
    
    try:
        # Initialize analyzer
        analyzer = AIAnalyzer()
        print("✅ AIAnalyzer initialized successfully")
        
        # Test with sample text
        sample_text = """
        This is a test privacy policy document. Users must provide consent for data collection.
        Personal data will be stored for 30 days. Users have the right to request data deletion.
        """
        
        print("📝 Testing document analysis...")
        
        # Run analysis (this is async, so we need to handle it properly)
        import asyncio
        result = asyncio.run(analyzer.analyze_document(sample_text, "privacy_policy"))
        
        print("✅ Document analysis completed successfully!")
        print(f"   Summary: {result.summary}")
        print(f"   Compliance Score: {result.compliance_score}")
        print(f"   Requirements Found: {len(result.requirements)}")
        
        for i, req in enumerate(result.requirements, 1):
            print(f"   {i}. {req.requirement_text[:100]}..." if len(req.requirement_text) > 100 else f"   {i}. {req.requirement_text}")
        
        return True
        
    except ValueError as e:
        print(f"❌ Configuration error: {e}")
        return False
    except Exception as e:
        print(f"❌ API call failed: {e}")
        print("   Make sure your Claude API key is valid and has sufficient credits")
        return False

if __name__ == "__main__":
    success = test_claude_integration()
    if success:
        print("\n🎉 Claude API integration test passed!")
        print("Your ComplianceAI application is ready to use Claude API for document analysis.")
    else:
        print("\n💥 Claude API integration test failed!")
        print("Please check your configuration and try again.")
    
    sys.exit(0 if success else 1)