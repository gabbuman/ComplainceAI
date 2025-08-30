from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.models import User, Document, ComplianceRequirement, DocumentStatus, RequirementStatus
from app.services.auth import get_current_user
from app.services.usage_tracker import usage_tracker

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard statistics for current user"""
    
    # Total documents
    total_docs = db.query(Document).filter(Document.owner_id == current_user.id).count()
    
    # Completed documents
    completed_docs = db.query(Document).filter(
        Document.owner_id == current_user.id,
        Document.status == DocumentStatus.COMPLETED
    ).count()
    
    # Total requirements
    total_requirements = db.query(ComplianceRequirement).join(Document).filter(
        Document.owner_id == current_user.id
    ).count()
    
    # Pending requirements
    pending_requirements = db.query(ComplianceRequirement).join(Document).filter(
        Document.owner_id == current_user.id,
        ComplianceRequirement.status == RequirementStatus.PENDING
    ).count()
    
    # Average compliance score
    avg_score_result = db.query(func.avg(Document.compliance_score)).filter(
        Document.owner_id == current_user.id,
        Document.compliance_score.isnot(None)
    ).scalar()
    
    avg_compliance_score = round(float(avg_score_result)) if avg_score_result else None
    
    # Recent documents (last 5)
    recent_docs = db.query(Document).filter(
        Document.owner_id == current_user.id
    ).order_by(Document.created_at.desc()).limit(5).all()
    
    return {
        "total_documents": total_docs,
        "completed_documents": completed_docs,
        "total_requirements": total_requirements,
        "pending_requirements": pending_requirements,
        "average_compliance_score": avg_compliance_score,
        "recent_documents": [
            {
                "id": doc.id,
                "filename": doc.filename,
                "status": doc.status.value,
                "compliance_score": doc.compliance_score,
                "created_at": doc.created_at
            } for doc in recent_docs
        ]
    }

@router.get("/usage")
async def get_usage_stats():
    """Get API usage statistics"""
    return usage_tracker.get_usage_summary()