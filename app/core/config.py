from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    app_name: str = "ComplianceAI"
    debug: bool = True
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    claude_api_key: Optional[str] = None
    
    # Token usage limits
    max_tokens_per_request: int = 2000
    max_daily_requests: int = 50  # Conservative limit for $5 budget
    daily_token_limit: int = 100000  # Estimated tokens per day for $5 budget
    
    class Config:
        env_file = ".env"

settings = Settings()