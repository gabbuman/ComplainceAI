from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .models import DocumentType, DocumentStatus, RequirementPriority, RequirementStatus

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Document Schemas
class DocumentBase(BaseModel):
    filename: str
    document_type: DocumentType

class DocumentCreate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    id: int
    status: DocumentStatus
    file_size: Optional[int] = None
    summary: Optional[str] = None
    compliance_score: Optional[int] = None
    created_at: datetime
    processed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Compliance Requirement Schemas
class RequirementBase(BaseModel):
    requirement_text: str
    plain_english: str
    category: Optional[str] = None
    priority: RequirementPriority = RequirementPriority.MEDIUM

class RequirementCreate(RequirementBase):
    document_id: int

class ComplianceRequirement(RequirementBase):
    id: int
    status: RequirementStatus
    confidence_score: Optional[float] = None
    source_section: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Analysis Response Schema
class AnalysisResult(BaseModel):
    summary: str
    compliance_score: int
    requirements: List[RequirementBase]
    
# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None