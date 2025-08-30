import anthropic
from typing import List, Dict, Any
from app.core.config import settings
from app.models.schemas import AnalysisResult, RequirementBase
from app.models.models import RequirementPriority
from app.services.usage_tracker import usage_tracker
import json
import re

class AIAnalyzer:
    """Simple AI analyzer using Claude API for document compliance analysis"""
    
    def __init__(self):
        if not settings.claude_api_key:
            raise ValueError("Claude API key not configured")
        self.client = anthropic.Anthropic(api_key=settings.claude_api_key)
    
    async def analyze_document(self, text: str, document_type: str) -> AnalysisResult:
        """Analyze document for compliance requirements"""
        
        # Check usage limits before making API call
        can_proceed, reason = usage_tracker.can_make_request()
        if not can_proceed:
            print(f"API usage limit reached: {reason}")
            return self._create_fallback_analysis(text, document_type)
        
        # Create prompt based on document type
        prompt = self._create_analysis_prompt(text, document_type)
        
        try:
            response = self.client.messages.create(
                model="claude-3-haiku-20240307",  # Using cost-effective model for MVP
                max_tokens=settings.max_tokens_per_request,
                temperature=0.3,
                system="You are a compliance expert. Analyze documents for regulatory requirements and provide clear, actionable guidance.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Record usage
            tokens_used = response.usage.input_tokens + response.usage.output_tokens
            usage_tracker.record_usage(tokens_used)
            
            result_text = response.content[0].text
            return self._parse_analysis_result(result_text)
            
        except Exception as e:
            print(f"Claude API error: {e}")
            # Fallback analysis if Claude API fails
            return self._create_fallback_analysis(text, document_type)
    
    def _create_analysis_prompt(self, text: str, document_type: str) -> str:
        """Create analysis prompt based on document type"""
        
        # Truncate text to avoid token limits
        truncated_text = text[:4000] if len(text) > 4000 else text
        
        prompt = f"""
        Analyze this {document_type} document for compliance requirements. 

        Document text:
        {truncated_text}

        Please provide your analysis in the following JSON format:
        {{
            "summary": "Brief 2-3 sentence summary of the document",
            "compliance_score": 75,
            "requirements": [
                {{
                    "requirement_text": "Original requirement from document",
                    "plain_english": "Simple explanation of what this means",
                    "category": "data_protection",
                    "priority": "high"
                }}
            ]
        }}

        Focus on:
        - Legal obligations and requirements
        - Compliance deadlines
        - Data protection requirements
        - User rights and responsibilities
        - Security requirements

        Priority levels: critical, high, medium, low
        Categories: data_protection, security, legal, operational, user_rights

        Respond only with valid JSON.
        """
        
        return prompt
    
    def _parse_analysis_result(self, result_text: str) -> AnalysisResult:
        """Parse AI response into structured result"""
        try:
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                data = json.loads(json_str)
            else:
                data = json.loads(result_text)
            
            # Parse requirements
            requirements = []
            for req in data.get('requirements', []):
                priority_str = req.get('priority', 'medium').upper()
                try:
                    priority = RequirementPriority(priority_str.lower())
                except ValueError:
                    priority = RequirementPriority.MEDIUM
                
                requirements.append(RequirementBase(
                    requirement_text=req.get('requirement_text', ''),
                    plain_english=req.get('plain_english', ''),
                    category=req.get('category', 'general'),
                    priority=priority
                ))
            
            return AnalysisResult(
                summary=data.get('summary', 'Document analyzed successfully'),
                compliance_score=data.get('compliance_score', 50),
                requirements=requirements
            )
            
        except Exception as e:
            # Return fallback if parsing fails
            return self._create_fallback_analysis("", "")
    
    def _create_fallback_analysis(self, text: str, document_type: str) -> AnalysisResult:
        """Create basic analysis if Claude API fails"""
        word_count = len(text.split())
        
        # Simple heuristic scoring
        score = min(max(30 + (word_count // 100), 30), 70)
        
        fallback_requirements = [
            RequirementBase(
                requirement_text="Review document for compliance requirements manually",
                plain_english="This document needs manual review by a compliance expert",
                category="manual_review",
                priority=RequirementPriority.MEDIUM
            )
        ]
        
        return AnalysisResult(
            summary=f"Document uploaded and processed. Contains approximately {word_count} words.",
            compliance_score=score,
            requirements=fallback_requirements
        )