from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    org_id: str
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Meeting(SQLModel, table=True):
    id: str = Field(primary_key=True) # Custom ID from frontend
    org_id: str
    title: str
    start_time: str
    end_time: Optional[str] = None
    duration: Optional[int] = None
    platform: Optional[str] = None
    summary: Optional[str] = None
    structured_data: Optional[str] = None # JSON string
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationship
    transcripts: List["TranscriptChunk"] = Relationship(back_populates="meeting")

class TranscriptChunk(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    speaker: str = "Unknown"
    timestamp: str
    meeting_id: Optional[str] = Field(default=None, foreign_key="meeting.id")
    
    meeting: Optional[Meeting] = Relationship(back_populates="transcripts")

class VoiceModel(SQLModel, table=True):
    """Store references to cloned voice files"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    speaker_wav_path: str
    metadata: Optional[str] = None  # JSON string for quality metrics
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TrainingJob(SQLModel, table=True):
    """Track TTS model training jobs"""
    id: Optional[int] = Field(default=None, primary_key=True)
    model_type: str  # xtts, tacotron2, etc.
    dataset_name: str
    num_epochs: int
    batch_size: int
    learning_rate: float
    status: str  # queued, training, completed, failed, configured
    output_path: Optional[str] = None
    error_message: Optional[str] = None
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
