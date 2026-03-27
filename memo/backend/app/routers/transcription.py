from fastapi import APIRouter, UploadFile, File, HTTPException
from vosk import Model, KaldiRecognizer, SetLogLevel
import shutil
import os
import uuid
import json
import zipfile
import requests
from pathlib import Path
from pydantic import BaseModel
from pydub import AudioSegment
from ..config import settings

router = APIRouter(prefix="/api/transcribe", tags=["transcription"])

# Suppress Vosk logs
SetLogLevel(-1)

# Global model instance
model = None
MODEL_NAME = "vosk-model-small-en-us-0.15"
MODEL_URL = f"https://alphacephei.com/vosk/models/{MODEL_NAME}.zip"

def get_model():
    global model
    if model is None:
        model_path = settings.MODELS_DIR / MODEL_NAME
        
        # Auto-download if missing
        if not model_path.exists():
            print(f"Downloading Vosk model: {MODEL_NAME}...")
            zip_path = settings.MODELS_DIR / f"{MODEL_NAME}.zip"
            
            try:
                # Download
                response = requests.get(MODEL_URL, stream=True)
                with open(zip_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                # Extract
                print("Extracting model...")
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(settings.MODELS_DIR)
                
                # Cleanup zip
                os.remove(zip_path)
                print("Vosk model ready.")
            except Exception as e:
                print(f"Failed to download/extract Vosk model: {e}")
                return None
                
        try:
            print("Loading Vosk model...")
            model = Model(str(model_path))
            print("Vosk model loaded.")
        except Exception as e:
            print(f"Failed to load Vosk model: {e}")
            return None
            
    return model

@router.post("/")
async def transcribe_audio(file: UploadFile = File(...)):
    # Save temp file
    temp_filename = f"temp_{uuid.uuid4()}_{file.filename}"
    temp_path = settings.UPLOAD_DIR / temp_filename
    wav_path = temp_path.with_suffix(".wav")
    
    try:
        # Save upload
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Convert to 16kHz Mono WAV using pydub
        try:
            audio = AudioSegment.from_file(str(temp_path))
            audio = audio.set_frame_rate(16000).set_channels(1)
            audio.export(str(wav_path), format="wav")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Audio conversion failed: {str(e)}")
        
        # Load Model
        vosk_model = get_model()
        if not vosk_model:
            raise HTTPException(status_code=503, detail="Transcription service unavailable (Model failed to load)")
            
        # Transcribe
        rec = KaldiRecognizer(vosk_model, 16000)
        rec.SetWords(True)
        
        results = []
        with open(wav_path, "rb") as wf:
            # Read in chunks
            while True:
                data = wf.read(4000)
                if len(data) == 0:
                    break
                if rec.AcceptWaveform(data):
                    part = json.loads(rec.Result())
                    results.append(part.get("text", ""))
        
        # Get final part
        part = json.loads(rec.FinalResult())
        results.append(part.get("text", ""))
        
        full_text = " ".join([r for r in results if r])
        
        return {
            "text": full_text,
            "engine": "vosk"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(wav_path):
            os.remove(wav_path)
