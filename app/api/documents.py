import os
import shutil
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import User, Document, ComplianceRequirement, DocumentType, DocumentStatus
from app.models.schemas import DocumentResponse, ComplianceRequirement as RequirementSchema
from app.services.auth import get_current_user
from app.services.document_processor import DocumentProcessor
from app.services.ai_analyzer import AIAnalyzer

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload and analyze a document"""
    
    # Validate file type
    allowed_types = {'.pdf', '.docx', '.txt'}
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOCX, and TXT files are allowed"
        )
    
    # Validate document type
    try:
        doc_type = DocumentType(document_type.lower())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid document type"
        )
    
    # Save uploaded file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Create document record
    db_document = Document(
        filename=file.filename,
        file_path=file_path,
        document_type=doc_type,
        status=DocumentStatus.UPLOADED,
        file_size=os.path.getsize(file_path),
        owner_id=current_user.id
    )
    
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    # Process document in background (simplified for MVP)
    try:
        # Extract text
        processor = DocumentProcessor()
        extracted_text, _ = processor.extract_text(file_path)
        
        # Update status to processing
        db_document.status = DocumentStatus.PROCESSING
        db_document.extracted_text = extracted_text
        db.commit()
        
        # Analyze with AI
        analyzer = AIAnalyzer()
        analysis = await analyzer.analyze_document(extracted_text, document_type)
        
        # Update document with analysis
        db_document.status = DocumentStatus.COMPLETED
        db_document.summary = analysis.summary
        db_document.compliance_score = analysis.compliance_score
        db_document.processed_at = datetime.utcnow()
        
        # Save requirements
        for req in analysis.requirements:
            db_requirement = ComplianceRequirement(
                document_id=db_document.id,
                requirement_text=req.requirement_text,
                plain_english=req.plain_english,
                category=req.category,
                priority=req.priority,
                confidence_score=0.8  # Default confidence
            )
            db.add(db_requirement)
        
        db.commit()
        db.refresh(db_document)
        
    except Exception as e:
        # Mark as failed
        db_document.status = DocumentStatus.FAILED
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Document processing failed: {str(e)}"
        )
    
    return db_document

@router.get("/", response_model=List[DocumentResponse])
async def get_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all documents for current user"""
    documents = db.query(Document).filter(Document.owner_id == current_user.id).all()
    return documents

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific document"""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document

@router.get("/{document_id}/requirements", response_model=List[RequirementSchema])
async def get_document_requirements(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get requirements for a specific document"""
    # Verify user owns the document
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    requirements = db.query(ComplianceRequirement).filter(
        ComplianceRequirement.document_id == document_id
    ).all()
    
    return requirements