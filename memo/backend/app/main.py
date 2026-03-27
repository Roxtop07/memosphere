from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import create_db_and_tables
from .routers import auth, meetings, ai, transcription, tts, tts_advanced

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend for MemoSphere with AI Transcription and TTS"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Include Routers
app.include_router(auth.router)
app.include_router(meetings.router)
app.include_router(ai.router)
app.include_router(transcription.router)
# app.include_router(tts.router)  # Old basic TTS
app.include_router(tts_advanced.router)  # Advanced TTS with training

@app.get("/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
