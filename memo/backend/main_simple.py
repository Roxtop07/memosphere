"""
MemoSphere AI Backend - Simplified Version
No authentication required - focus on PDF generation and AI processing
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional
import io

app = FastAPI(title="MemoSphere AI Backend")

# Enable CORS for browser extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Data Models
# ============================================================================

class PDFGenerationRequest(BaseModel):
    title: str
    summary: Optional[str] = ""
    decisions: Optional[List[str]] = []
    action_items: Optional[List[str]] = []
    transcript: Optional[str] = ""
    date: Optional[str] = ""
    duration: Optional[int] = 0

class AIRequest(BaseModel):
    text: str
    context: Optional[str] = ""

# ============================================================================
# PDF Generation
# ============================================================================

def generate_pdf_bytes(meeting_data: PDFGenerationRequest) -> bytes:
    """Generate PDF from meeting data using ReportLab"""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
        from reportlab.lib.units import inch
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
        from datetime import datetime
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, 
                               rightMargin=72, leftMargin=72,
                               topMargin=72, bottomMargin=18)
        
        styles = getSampleStyleSheet()
        story = []
        
        # Title Style
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor='#667eea',
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        # Add Title
        story.append(Paragraph(f"📝 {meeting_data.title}", title_style))
        story.append(Spacer(1, 12))
        
        # Meeting Metadata
        meta_style = ParagraphStyle(
            'Meta',
            parent=styles['Normal'],
            fontSize=10,
            textColor='#666666',
            spaceAfter=20
        )
        
        if meeting_data.date:
            story.append(Paragraph(f"<b>Date:</b> {meeting_data.date}", meta_style))
        if meeting_data.duration:
            duration_str = format_duration(meeting_data.duration)
            story.append(Paragraph(f"<b>Duration:</b> {duration_str}", meta_style))
        
        story.append(Spacer(1, 20))
        
        # Summary Section
        if meeting_data.summary:
            story.append(Paragraph("📋 Summary", styles['Heading2']))
            story.append(Spacer(1, 12))
            story.append(Paragraph(meeting_data.summary, styles['Normal']))
            story.append(Spacer(1, 20))
        
        # Key Decisions
        if meeting_data.decisions:
            story.append(Paragraph("✅ Key Decisions", styles['Heading2']))
            story.append(Spacer(1, 12))
            for decision in meeting_data.decisions:
                story.append(Paragraph(f"• {decision}", styles['Normal']))
                story.append(Spacer(1, 6))
            story.append(Spacer(1, 20))
        
        # Action Items
        if meeting_data.action_items:
            story.append(Paragraph("📌 Action Items", styles['Heading2']))
            story.append(Spacer(1, 12))
            for item in meeting_data.action_items:
                story.append(Paragraph(f"• {item}", styles['Normal']))
                story.append(Spacer(1, 6))
            story.append(Spacer(1, 20))
        
        # Full Transcript
        if meeting_data.transcript:
            story.append(PageBreak())
            story.append(Paragraph("💬 Full Transcript", styles['Heading2']))
            story.append(Spacer(1, 12))
            
            transcript_style = ParagraphStyle(
                'Transcript',
                parent=styles['Normal'],
                fontSize=9,
                leading=12
            )
            
            for line in meeting_data.transcript.split('\n'):
                if line.strip():
                    story.append(Paragraph(line, transcript_style))
                    story.append(Spacer(1, 4))
        
        # Build PDF
        doc.build(story)
        
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
        
    except Exception as e:
        raise Exception(f"PDF generation failed: {str(e)}")

def format_duration(seconds: int) -> str:
    """Format duration in seconds to human readable string"""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    
    if hours > 0:
        return f"{hours}h {minutes}m {secs}s"
    elif minutes > 0:
        return f"{minutes}m {secs}s"
    else:
        return f"{secs}s"

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "MemoSphere AI Backend",
        "version": "1.0.0",
        "endpoints": {
            "pdf_generation": "/api/meetings/generate-pdf",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Health check for monitoring"""
    return {"status": "healthy"}

@app.post("/api/meetings/generate-pdf")
async def generate_meeting_pdf(request: PDFGenerationRequest):
    """
    Generate PDF from meeting data
    
    Returns the PDF file directly for download
    """
    try:
        pdf_bytes = generate_pdf_bytes(request)
        
        # Return PDF as downloadable file
        safe_filename = request.title.replace(' ', '_').replace('/', '_')
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=meeting_{safe_filename}.pdf",
                "Content-Type": "application/pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@app.post("/api/meetings/upload")
async def upload_meeting(meeting_data: dict):
    """
    Upload meeting data (for future cloud storage)
    Currently just acknowledges receipt
    """
    return {
        "status": "success",
        "message": "Meeting data received",
        "meeting_id": meeting_data.get("id", "unknown")
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting MemoSphere AI Backend...")
    print("📝 PDF Generation API: http://localhost:8000/api/meetings/generate-pdf")
    print("🏥 Health Check: http://localhost:8000/health")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
