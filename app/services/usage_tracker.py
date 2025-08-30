import json
import os
from datetime import datetime, date
from typing import Dict, Any
from app.core.config import settings

class UsageTracker:
    """Track API usage to prevent exceeding budget limits"""
    
    def __init__(self, usage_file: str = "usage_tracking.json"):
        self.usage_file = usage_file
        self.usage_data = self._load_usage_data()
    
    def _load_usage_data(self) -> Dict[str, Any]:
        """Load usage data from file"""
        if os.path.exists(self.usage_file):
            try:
                with open(self.usage_file, 'r') as f:
                    return json.load(f)
            except:
                pass
        return {"daily_usage": {}, "total_requests": 0, "total_tokens": 0}
    
    def _save_usage_data(self):
        """Save usage data to file"""
        with open(self.usage_file, 'w') as f:
            json.dump(self.usage_data, f, indent=2)
    
    def can_make_request(self) -> tuple[bool, str]:
        """Check if we can make another API request"""
        today = str(date.today())
        daily_data = self.usage_data["daily_usage"].get(today, {"requests": 0, "tokens": 0})
        
        # Check daily request limit
        if daily_data["requests"] >= settings.max_daily_requests:
            return False, f"Daily request limit ({settings.max_daily_requests}) exceeded"
        
        # Check daily token limit
        if daily_data["tokens"] >= settings.daily_token_limit:
            return False, f"Daily token limit ({settings.daily_token_limit}) exceeded"
        
        return True, "OK"
    
    def record_usage(self, tokens_used: int):
        """Record API usage"""
        today = str(date.today())
        
        if today not in self.usage_data["daily_usage"]:
            self.usage_data["daily_usage"][today] = {"requests": 0, "tokens": 0}
        
        self.usage_data["daily_usage"][today]["requests"] += 1
        self.usage_data["daily_usage"][today]["tokens"] += tokens_used
        self.usage_data["total_requests"] += 1
        self.usage_data["total_tokens"] += tokens_used
        
        self._save_usage_data()
    
    def get_daily_usage(self) -> Dict[str, int]:
        """Get today's usage stats"""
        today = str(date.today())
        return self.usage_data["daily_usage"].get(today, {"requests": 0, "tokens": 0})
    
    def get_usage_summary(self) -> Dict[str, Any]:
        """Get comprehensive usage summary"""
        daily = self.get_daily_usage()
        return {
            "today": daily,
            "limits": {
                "daily_requests": settings.max_daily_requests,
                "daily_tokens": settings.daily_token_limit,
                "tokens_per_request": settings.max_tokens_per_request
            },
            "total_lifetime": {
                "requests": self.usage_data["total_requests"],
                "tokens": self.usage_data["total_tokens"]
            },
            "remaining_today": {
                "requests": settings.max_daily_requests - daily["requests"],
                "tokens": settings.daily_token_limit - daily["tokens"]
            }
        }

# Global usage tracker instance
usage_tracker = UsageTracker()