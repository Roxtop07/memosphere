from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlmodel import Session, select
import torch
from TTS.api import TTS
import uuid
import os
from typing import Optional
from ..config import settings
from ..database import get_session
from ..models import VoiceModel
from ..utils import verify_token

router = APIRouter(prefix="/api/tts", tags=["tts"])

# Global TTS instance (lazy loaded)
tts = None

def get_tts():
    global tts
    if tts is None:
        try:
            print("Loading Coqui TTS (XTTS-v2)...")
            # This will download the model on first run
            device = "cuda" if torch.cuda.is_available() else "cpu"
            tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
            print(f"Coqui TTS loaded on {device}.")
        except Exception as e:
            print(f"Failed to load TTS model: {e}")
            return None
    return tts

@router.post("/clone", summary="Train/Clone a new voice")
async def clone_voice(
    name: str = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    token: dict = Depends(verify_token)
):
    """
    Upload a short audio sample (wav/mp3) to 'clone' a voice.
    This saves the sample which XTTS uses as a reference speaker.
    """
    try:
        # Check uniqueness
        if session.exec(select(VoiceModel).where(VoiceModel.name == name)).first():
            raise HTTPException(status_code=400, detail="Voice name already exists")
        
        # Save reference audio
        filename = f"voice_{uuid.uuid4()}_{file.filename}"
        path = settings.MODELS_DIR / filename
        
        with open(path, "wb") as buffer:
            import shutil
            shutil.copyfileobj(file.file, buffer)
            
        # Register in DB
        voice = VoiceModel(name=name, speaker_wav_path=str(path))
        session.add(voice)
        session.commit()
        
        return {"status": "success", "voice_id": voice.id, "name": voice.name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate", summary="Generate speech from text")
async def generate_speech(
    text: str = Form(...),
    voice_name: str = Form(...),
    language: str = Form("en"),
    token: dict = Depends(verify_token),
    session: Session = Depends(get_session)
):
    """
    Generate audio using XTTS-v2 and a cloned voice reference.
    """
    model = get_tts()
    if not model:
        raise HTTPException(status_code=503, detail="TTS service unavailable")
    
    # Get voice reference
    voice = session.exec(select(VoiceModel).where(VoiceModel.name == voice_name)).first()
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")
        
    output_filename = f"output_{uuid.uuid4()}.wav"
    output_path = settings.UPLOAD_DIR / output_filename
    
    try:
        # Generate
        model.tts_to_file(
            text=text,
            speaker_wav=voice.speaker_wav_path,
            language=language,
            file_path=str(output_path)
        )
        
        return FileResponse(output_path, media_type="audio/wav", filename="speech.wav")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
