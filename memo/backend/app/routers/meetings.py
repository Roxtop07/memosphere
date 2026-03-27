from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import Response
from sqlmodel import Session, select
from typing import Optional, List
import json

from ..database import get_session
from ..models import Meeting, TranscriptChunk
from ..utils import verify_token, verify_org_access
from ..services.pdf import generate_pdf_bytes, PDFData

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

@router.post("/upload")
async def upload_meeting(
    meeting_data: str = Form(...),
    pdf: UploadFile = File(...),
    org_id: str = Form(...),
    token: dict = Depends(verify_token),
    session: Session = Depends(get_session)
):
    if not verify_org_access(org_id, token):
        raise HTTPException(status_code=403, detail="Access denied")
    
    data = json.loads(meeting_data)
    
    # Save to DB
    meeting = Meeting(
        id=data.get("id"),
        org_id=org_id,
        title=data.get("title"),
        start_time=data.get("start_time"),
        duration=data.get("duration"),
        platform=data.get("platform"),
        summary=data.get("summary"),
        structured_data=json.dumps(data)
    )
    
    # Upsert logic (check if exists)
    existing = session.get(Meeting, meeting.id)
    if existing:
        for key, value in meeting.dict(exclude_unset=True).items():
            setattr(existing, key, value)
    else:
        session.add(meeting)
    
    session.commit()
    
    # We ignore the PDF upload for now as we don't have S3 configured
    # In production, upload `pdf` to S3 here
    
    return {"status": "success", "meeting_id": meeting.id}

@router.post("/generate-pdf")
async def generate_pdf_endpoint(data: PDFData):
    # Open endpoint, no auth required as per original design for ease of use
    try:
        pdf_bytes = generate_pdf_bytes(data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=meeting.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
