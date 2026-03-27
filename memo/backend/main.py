"""
MemoSphere Backend API
Enhanced with JWT auth, encryption handling, AI processing, and PDF generation
"""

from fastapi import FastAPI, Request, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uvicorn
import jwt
import hashlib
import json
import base64
from pathlib import Path
import asyncio

# AI/ML imports
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import requests
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False

# PDF generation
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
    from reportlab.lib.units import inch
    from reportlab.lib.enums import TA_LEFT, TA_CENTER
    from io import BytesIO
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

app = FastAPI(title="MemoSphere AI Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"

# In-memory stores (replace with database in production)
USERS = {}
TRANSCRIPTS = []
MEETINGS = {}
SUMMARIES = []
SEARCH_INDEX = {}

# AI Configuration
OLLAMA_BASE_URL = "http://localhost:11434"
OPENAI_API_KEY = None  # Set from environment or config

# Models
class User(BaseModel):
    email: str
    password: str
    org_id: str
    name: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class TranscriptChunk(BaseModel):
    text: str
    url: str
    timestamp: str
    tabTitle: str
    speaker: str = "unknown"
    org_id: Optional[str] = None
    platform: Optional[str] = None
    meeting_id: Optional[str] = None

class EncryptedData(BaseModel):
    ciphertext: str
    iv: str
    authTag: str
    algorithm: str = "AES-GCM-256"

class AIRequest(BaseModel):
    encrypted_content: Optional[EncryptedData] = None
    encrypted_query: Optional[EncryptedData] = None
    context: str
    org_id: str

class MeetingStructureRequest(BaseModel):
    encrypted_meeting: EncryptedData
    org_id: str
    meeting_id: str

class PDFGenerationRequest(BaseModel):
    meeting_id: str
    org_id: str
    title: str
    description: Optional[str] = None
    summary: Optional[str] = None
    agenda: Optional[List[str]] = None
    discussions: Optional[List[str]] = None
    decisions: Optional[List[str]] = None
    action_items: Optional[List[str]] = None
    duration: Optional[int] = None
    date: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    search_index: str
    filter: str = "all"
    org_id: str

# Utility functions
def create_jwt_token(user_email: str, org_id: str) -> str:
    """Create JWT token with org_id claim"""
    payload = {
        "email": user_email,
        "org_id": org_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and extract claims"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def verify_org_access(org_id: str, token_payload: dict) -> bool:
    """Verify user has access to the requested org"""
    return token_payload.get("org_id") == org_id

def hash_password(password: str) -> str:
    """Hash password for storage"""
    return hashlib.sha256(password.encode()).hexdigest()

async def call_ollama(prompt: str, model: str = "llama3") -> str:
    """Call Ollama API for AI processing"""
    if not OLLAMA_AVAILABLE:
        raise HTTPException(status_code=503, detail="Ollama not available")
    
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False
            },
            timeout=60
        )
        
        if response.status_code == 200:
            return response.json().get("response", "")
        else:
            raise HTTPException(status_code=500, detail="Ollama API error")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")

async def call_openai(prompt: str, model: str = "gpt-4-mini") -> str:
    """Call OpenAI API for AI processing"""
    if not OPENAI_AVAILABLE or not OPENAI_API_KEY:
        # Fallback to Ollama
        return await call_ollama(prompt)
    
    try:
        openai.api_key = OPENAI_API_KEY
        response = openai.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000
        )
        return response.choices[0].message.content
    except Exception as e:
        # Fallback to Ollama on error
        return await call_ollama(prompt)

def generate_pdf_bytes(meeting_data: PDFGenerationRequest) -> bytes:
    """Generate PDF from meeting data"""
    if not PDF_AVAILABLE:
        raise HTTPException(status_code=503, detail="PDF generation not available")
    
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
    story.append(Paragraph(meeting_data.title, title_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Metadata
    if meeting_data.date:
        date_str = datetime.fromisoformat(meeting_data.date.replace('Z', '+00:00')).strftime('%B %d, %Y at %I:%M %p')
        story.append(Paragraph(f"<b>Date:</b> {date_str}", styles['Normal']))
    
    if meeting_data.duration:
        hours = meeting_data.duration // 3600
        minutes = (meeting_data.duration % 3600) // 60
        duration_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
        story.append(Paragraph(f"<b>Duration:</b> {duration_str}", styles['Normal']))
    
    story.append(Spacer(1, 0.3*inch))
    
    # Description
    if meeting_data.description:
        story.append(Paragraph("<b>Description</b>", styles['Heading2']))
        story.append(Paragraph(meeting_data.description, styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    # Summary
    if meeting_data.summary:
        story.append(Paragraph("<b>Summary</b>", styles['Heading2']))
        story.append(Paragraph(meeting_data.summary, styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    # Agenda
    if meeting_data.agenda:
        story.append(Paragraph("<b>Agenda</b>", styles['Heading2']))
        for i, item in enumerate(meeting_data.agenda, 1):
            story.append(Paragraph(f"{i}. {item}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    # Discussions
    if meeting_data.discussions:
        story.append(Paragraph("<b>Discussions</b>", styles['Heading2']))
        for discussion in meeting_data.discussions:
            story.append(Paragraph(f"• {discussion}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    # Decisions
    if meeting_data.decisions:
        story.append(Paragraph("<b>Key Decisions</b>", styles['Heading2']))
        for decision in meeting_data.decisions:
            story.append(Paragraph(f"✓ {decision}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    # Action Items
    if meeting_data.action_items:
        story.append(Paragraph("<b>Action Items</b>", styles['Heading2']))
        for item in meeting_data.action_items:
            story.append(Paragraph(f"☐ {item}", styles['Normal']))
    
    doc.build(story)
    return buffer.getvalue()

# API Endpoints

@app.post("/api/auth/register")
async def register(user: User):
    """Register new user"""
    if user.email in USERS:
        raise HTTPException(status_code=400, detail="User already exists")
    
    USERS[user.email] = {
        "email": user.email,
        "password": hash_password(user.password),
        "org_id": user.org_id,
        "name": user.name,
        "created_at": datetime.utcnow().isoformat()
    }
    
    token = create_jwt_token(user.email, user.org_id)
    
    return {
        "token": token,
        "user": {
            "email": user.email,
            "name": user.name,
            "org_id": user.org_id
        },
        "org_id": user.org_id
    }

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    """Login user"""
    user = USERS.get(request.email)
    
    if not user or user["password"] != hash_password(request.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["email"], user["org_id"])
    
    return {
        "token": token,
        "user": {
            "email": user["email"],
            "name": user.get("name"),
            "org_id": user["org_id"]
        },
        "org_id": user["org_id"]
    }

@app.post("/api/auth/refresh")
async def refresh_token(token_payload: dict = Depends(verify_token)):
    """Refresh JWT token"""
    new_token = create_jwt_token(token_payload["email"], token_payload["org_id"])
    return {"token": new_token}

@app.post("/api/transcripts")
async def ingest_transcript(item: TranscriptChunk, token_payload: dict = Depends(verify_token)):
    """Ingest transcript chunk"""
    # Verify org access
    if item.org_id and not verify_org_access(item.org_id, token_payload):
        raise HTTPException(status_code=403, detail="Access denied")
    
    transcript_data = item.dict()
    transcript_data["received_at"] = datetime.utcnow().isoformat()
    TRANSCRIPTS.append(transcript_data)
    
    return {"status": "ok", "id": len(TRANSCRIPTS) - 1}

@app.post("/api/ai/summarize")
async def summarize_content(request: AIRequest, token_payload: dict = Depends(verify_token)):
    """Summarize content using AI"""
    if not verify_org_access(request.org_id, token_payload):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Note: In production, decrypt the content here
    # For now, we'll use a placeholder
    content = "Content would be decrypted here"
    
    prompt = f"""Summarize the following {request.context} content concisely:

{content}

Provide a clear, structured summary highlighting the main points."""
    
    try:
        summary = await call_openai(prompt)
        
        # Note: In production, encrypt the response here
        return {
            "result": summary,
            "encrypted": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/extract-decisions")
async def extract_decisions(request: AIRequest, token_payload: dict = Depends(verify_token)):
    """Extract key decisions from content"""
    if not verify_org_access(request.org_id, token_payload):
        raise HTTPException(status_code=403, detail="Access denied")
    
    prompt = """Extract and list all key decisions made in this meeting or document.
Format as a JSON array of strings."""
    
    result = await call_openai(prompt)
    
    try:
        decisions = json.loads(result)
    except:
        decisions = [line.strip() for line in result.split('\n') if line.strip()]
    
    return {
        "result": {"decisions": decisions},
        "encrypted": False
    }

@app.post("/api/ai/generate-agenda")
async def generate_agenda(request: AIRequest, token_payload: dict = Depends(verify_token)):
    """Generate agenda from content"""
    if not verify_org_access(request.org_id, token_payload):
        raise HTTPException(status_code=403, detail="Access denied")
    
    prompt = """Based on the content, generate a structured meeting agenda.
Format as a JSON array of agenda items."""
    
    result = await call_openai(prompt)
    
    try:
        agenda = json.loads(result)
    except:
        agenda = [line.strip() for line in result.split('\n') if line.strip()]
    
    return {
        "result": {"agenda": agenda},
        "encrypted": False
    }

@app.post("/api/ai/action-items")
async def extract_action_items(request: AIRequest, token_payload: dict = Depends(verify_token)):
    """Extract action items from content"""
    if not verify_org_access(request.org_id, token_payload):
        raise HTTPException(status_code=403, detail="Access denied")
    
    prompt = """Extract all action items from this content.
Format as a JSON array of action items with assignee if mentioned."""
    
    result = await call_openai(prompt)
    
    try:
        items = json.loads(result)
    except:
        items = [line.strip() for line in result.split('\n') if line.strip()]
    
    return {
        "result": {"action_items": items},
        "encrypted": False
    }

@app.post("/api/ai/query")
async def process_query(request: AIRequest, token_payload: dict = Depends(verify_token)):
    """Process user query with context"""
    if not verify_org_access(request.org_id, token_payload):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Note: Decrypt query and content in production
    query = "User query here"
    context_content = "Context content here"
    
    prompt = f"""Context: {request.context}
Content: {context_content}

User question: {query}

Provide a helpful, accurate response based on the context and content."""
    
    response = await call_openai(prompt)
    
    return {
        "result": response,
        "encrypted": False
    }

@app.post("/api/meetings/structure")
async def structure_meeting(request: MeetingStructureRequest, token_payload: dict = Depends(verify_token)):
    """Structure meeting data using AI"""
    if not verify_org_access(request.org_id, token_payload):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Note: Decrypt meeting data in production
    meeting_text = "Meeting transcript here"
    
    prompt = f"""Analyze this meeting transcript and structure it into the following format:

Transcript:
{meeting_text}

Provide a JSON response with:
- summary: Brief overall summary
- description: Detailed description
- agenda: Array of agenda items discussed
- discussions: Array of main discussion points
- decisions: Array of decisions made
- action_items: Array of action items with assignees

Return valid JSON only."""
    
    result = await call_openai(prompt, model="gpt-4")
    
    try:
        structured = json.loads(result)
    except:
        structured = {
            "summary": result[:500],
            "description": result,
            "agenda": [],
            "discussions": [],
            "decisions": [],
            "action_items": []
        }
    
    # Store meeting
    MEETINGS[request.meeting_id] = {
        "meeting_id": request.meeting_id,
        "org_id": request.org_id,
        "structured_data": structured,
        "created_at": datetime.utcnow().isoformat()
    }
    
    return {
        "data": structured,
        "encrypted": False
    }

@app.post("/api/meetings/generate-pdf")
async def generate_meeting_pdf(request: PDFGenerationRequest):
    """Generate PDF from meeting data - No authentication required"""
    try:
        pdf_bytes = generate_pdf_bytes(request)
        
        # Return PDF as downloadable file
        from fastapi.responses import Response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=meeting_{request.title.replace(' ', '_')}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@app.post("/api/meetings/upload")
async def upload_meeting(
    meeting_data: str = Form(...),
    pdf: UploadFile = File(...),
    org_id: str = Form(...),
    token_payload: dict = Depends(verify_token)
):
    """Upload structured meeting with PDF"""
    if not verify_org_access(org_id, token_payload):
        raise HTTPException(status_code=403, detail="Access denied")
    
    meeting = json.loads(meeting_data)
    pdf_content = await pdf.read()
    
    # Store meeting and PDF
    meeting_id = meeting.get("id")
    MEETINGS[meeting_id] = {
        "data": meeting,
        "pdf_size": len(pdf_content),
        "uploaded_at": datetime.utcnow().isoformat()
    }
    
    return {
        "status": "success",
        "meeting_id": meeting_id,
        "pdf_size": len(pdf_content)
    }

@app.post("/api/search")
async def search(request: SearchRequest, token_payload: dict = Depends(verify_token)):
    """Search across meetings, events, policies"""
    if not verify_org_access(request.org_id, token_payload):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Simple search implementation
    # In production, use proper search engine (Elasticsearch, etc.)
    results = []
    
    # Search meetings
    for meeting_id, meeting in MEETINGS.items():
        if meeting.get("org_id") == request.org_id:
            # Simple keyword matching
            meeting_str = json.dumps(meeting).lower()
            if request.query.lower() in meeting_str:
                results.append({
                    "id": meeting_id,
                    "type": "meeting",
                    "title": meeting.get("data", {}).get("title", "Meeting"),
                    "description": meeting.get("data", {}).get("summary", ""),
                    "date": meeting.get("created_at"),
                    "url": f"/meetings/{meeting_id}"
                })
    
    return results

@app.get("/api/summaries")
async def get_summaries():
    """Get recent summaries (for backward compatibility)"""
    return SUMMARIES[-20:]

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "features": {
            "openai": OPENAI_AVAILABLE,
            "ollama": OLLAMA_AVAILABLE,
            "pdf": PDF_AVAILABLE
        },
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == '__main__':
    print("🚀 MemoSphere AI Backend starting...")
    print(f"✓ OpenAI: {'Available' if OPENAI_AVAILABLE else 'Not available'}")
    print(f"✓ Ollama: {'Available' if OLLAMA_AVAILABLE else 'Not available'}")
    print(f"✓ PDF Generation: {'Available' if PDF_AVAILABLE else 'Not available'}")
    uvicorn.run(app, host="0.0.0.0", port=8000)

