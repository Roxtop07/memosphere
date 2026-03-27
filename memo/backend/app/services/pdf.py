from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER
from io import BytesIO
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class PDFData(BaseModel):
    title: str
    description: Optional[str] = None
    summary: Optional[str] = None
    agenda: Optional[List[str]] = None
    discussions: Optional[List[str]] = None
    decisions: Optional[List[str]] = None
    action_items: Optional[List[str]] = None
    duration: Optional[int] = None
    date: Optional[str] = None
    transcript: Optional[str] = None

def generate_pdf_bytes(data: PDFData) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor='#667eea',
        alignment=TA_CENTER,
        spaceAfter=30
    )
    story.append(Paragraph(data.title, title_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Metadata
    if data.date:
        try:
            # Handle ISO format Z
            date_obj = datetime.fromisoformat(data.date.replace('Z', '+00:00'))
            date_str = date_obj.strftime('%B %d, %Y at %I:%M %p')
        except:
            date_str = data.date
            
        story.append(Paragraph(f"<b>Date:</b> {date_str}", styles['Normal']))
    
    if data.duration:
        hours = data.duration // 3600
        minutes = (data.duration % 3600) // 60
        duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
        story.append(Paragraph(f"<b>Duration:</b> {duration_str}", styles['Normal']))
    
    story.append(Spacer(1, 0.3*inch))
    
    # Summary
    if data.summary:
        story.append(Paragraph("<b>Summary</b>", styles['Heading2']))
        story.append(Paragraph(data.summary, styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    # Action Items
    if data.action_items:
        story.append(Paragraph("<b>Action Items</b>", styles['Heading2']))
        for item in data.action_items:
            story.append(Paragraph(f"☐ {item}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        
    # Decisions
    if data.decisions:
        story.append(Paragraph("<b>Key Decisions</b>", styles['Heading2']))
        for decision in data.decisions:
            story.append(Paragraph(f"✓ {decision}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        
    return buffer.getvalue()
