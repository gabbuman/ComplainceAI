from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class UserRole(enum.Enum):
    ADMIN = "admin"
    USER = "user"

class DocumentType(enum.Enum):
    REGULATION = "regulation"
    POLICY = "policy"
    TERMS = "terms"
    CONTRACT = "contract"
    OTHER = "other"

class DocumentStatus(enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class RequirementPriority(enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class RequirementStatus(enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

# User model
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    documents = relationship("Document", back_populates="owner")

# Document model
class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    document_type = Column(Enum(DocumentType), nullable=False)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.UPLOADED)
    file_size = Column(Integer)
    extracted_text = Column(Text)
    summary = Column(Text)
    compliance_score = Column(Integer)  # 0-100
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    
    # Foreign keys
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    owner = relationship("User", back_populates="documents")
    requirements = relationship("ComplianceRequirement", back_populates="document")

# Compliance Requirement model
class ComplianceRequirement(Base):
    __tablename__ = "compliance_requirements"

    id = Column(Integer, primary_key=True, index=True)
    requirement_text = Column(Text, nullable=False)
    plain_english = Column(Text, nullable=False)
    category = Column(String)
    priority = Column(Enum(RequirementPriority), default=RequirementPriority.MEDIUM)
    status = Column(Enum(RequirementStatus), default=RequirementStatus.PENDING)
    confidence_score = Column(Float)  # 0.0-1.0
    source_section = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Foreign keys
    document_id = Column(Integer, ForeignKey("documents.id"))
    
    # Relationships
    document = relationship("Document", back_populates="requirements")