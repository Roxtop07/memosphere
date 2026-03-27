"""
Advanced TTS Router with Training Support
Includes Coqui TTS training, Bark TTS, and voice management
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from sqlmodel import Session, select
import torch
from TTS.api import TTS
import uuid
import os
from typing import Optional, List
from pathlib import Path
import json
import zipfile
import shutil

from ..config import settings
from ..database import get_session
from ..models import VoiceModel, TrainingJob
from ..utils import verify_token
from ..services.tts_training import TTSTrainingService
from ..services.audio_analysis import AudioAnalysisService

router = APIRouter(prefix="/api/tts", tags=["tts"])

# Global instances (lazy loaded)
tts = None
bark_tts = None
tts_training_service = None
audio_analysis_service = None


def get_tts():
    """Get Coqui XTTS model"""
    global tts
    if tts is None:
        try:
            print("Loading Coqui TTS (XTTS-v2)...")
            device = "cuda" if torch.cuda.is_available() else "cpu"
            tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
            print(f"Coqui TTS loaded on {device}.")
        except Exception as e:
            print(f"Failed to load TTS model: {e}")
            return None
    return tts


def get_bark_tts():
    """Get Bark TTS model (alternative high-quality TTS)"""
    global bark_tts
    if bark_tts is None:
        try:
            from bark import SAMPLE_RATE, generate_audio, preload_models
            print("Loading Bark TTS...")
            preload_models()
            bark_tts = {"generate": generate_audio, "sr": SAMPLE_RATE}
            print("Bark TTS loaded.")
        except Exception as e:
            print(f"Failed to load Bark TTS: {e}")
            return None
    return bark_tts


def get_training_service():
    """Get TTS training service"""
    global tts_training_service
    if tts_training_service is None:
        tts_training_service = TTSTrainingService(settings.MODELS_DIR)
    return tts_training_service


def get_audio_analysis():
    """Get audio analysis service"""
    global audio_analysis_service
    if audio_analysis_service is None:
        audio_analysis_service = AudioAnalysisService()
    return audio_analysis_service


@router.post("/clone", summary="Clone a voice from audio sample")
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
            shutil.copyfileobj(file.file, buffer)
        
        # Analyze audio quality
        analysis_service = get_audio_analysis()
        quality = analysis_service.analyze_audio_quality(path)
        
        # Register in DB
        voice = VoiceModel(
            name=name,
            speaker_wav_path=str(path),
            metadata=json.dumps(quality)
        )
        session.add(voice)
        session.commit()
        
        return {
            "status": "success",
            "voice_id": voice.id,
            "name": voice.name,
            "quality_metrics": quality
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate", summary="Generate speech from text")
async def generate_speech(
    text: str = Form(...),
    voice_name: str = Form(...),
    language: str = Form("en"),
    speed: float = Form(1.0),
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
            file_path=str(output_path),
            speed=speed
        )
        
        return FileResponse(output_path, media_type="audio/wav", filename="speech.wav")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.post("/generate/bark", summary="Generate speech using Bark TTS")
async def generate_speech_bark(
    text: str = Form(...),
    voice_preset: str = Form("v2/en_speaker_6"),
    token: dict = Depends(verify_token)
):
    """
    Generate audio using Bark TTS (more natural, supports emotions)
    Voice presets: v2/en_speaker_0 through v2/en_speaker_9
    """
    bark = get_bark_tts()
    if not bark:
        raise HTTPException(status_code=503, detail="Bark TTS service unavailable")
    
    output_filename = f"bark_{uuid.uuid4()}.wav"
    output_path = settings.UPLOAD_DIR / output_filename
    
    try:
        import scipy.io.wavfile as wavfile
        
        # Generate
        audio_array = bark["generate"](text, history_prompt=voice_preset)
        
        # Save
        wavfile.write(str(output_path), bark["sr"], audio_array)
        
        return FileResponse(output_path, media_type="audio/wav", filename="speech.wav")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bark generation failed: {str(e)}")


@router.post("/train/prepare-dataset", summary="Prepare dataset for TTS training")
async def prepare_training_dataset(
    speaker_name: str = Form(...),
    language: str = Form("en"),
    files: List[UploadFile] = File(...),
    transcripts: str = Form(...),  # JSON array of transcripts
    token: dict = Depends(verify_token)
):
    """
    Prepare a dataset for TTS training
    Upload multiple audio files with their corresponding transcripts
    """
    try:
        training_service = get_training_service()
        
        # Parse transcripts
        transcripts_list = json.loads(transcripts)
        
        if len(files) != len(transcripts_list):
            raise HTTPException(
                status_code=400,
                detail="Number of files must match number of transcripts"
            )
        
        # Save uploaded files temporarily
        temp_files = []
        for file in files:
            temp_path = settings.UPLOAD_DIR / f"temp_{uuid.uuid4()}_{file.filename}"
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            temp_files.append(temp_path)
        
        # Prepare dataset
        dataset_path = training_service.prepare_dataset(
            audio_files=temp_files,
            transcripts=transcripts_list,
            speaker_name=speaker_name,
            language=language
        )
        
        # Cleanup temp files
        for temp_file in temp_files:
            if temp_file.exists():
                temp_file.unlink()
        
        return {
            "status": "success",
            "dataset_path": str(dataset_path),
            "num_samples": len(transcripts_list),
            "speaker_name": speaker_name
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid transcripts JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train/start", summary="Start TTS model training/fine-tuning")
async def start_training(
    background_tasks: BackgroundTasks,
    dataset_name: str = Form(...),
    model_type: str = Form("xtts"),  # xtts or tacotron2
    num_epochs: int = Form(10),
    batch_size: int = Form(4),
    learning_rate: float = Form(5e-5),
    session: Session = Depends(get_session),
    token: dict = Depends(verify_token)
):
    """
    Start training a TTS model
    This is a long-running process that happens in the background
    """
    try:
        training_service = get_training_service()
        dataset_path = training_service.datasets_dir / dataset_name
        
        if not dataset_path.exists():
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Create training job record
        job = TrainingJob(
            model_type=model_type,
            dataset_name=dataset_name,
            num_epochs=num_epochs,
            batch_size=batch_size,
            learning_rate=learning_rate,
            status="queued",
            user_id=token.get("sub")
        )
        session.add(job)
        session.commit()
        session.refresh(job)
        
        # Start training in background
        if model_type == "xtts":
            result = training_service.fine_tune_xtts(
                dataset_path=dataset_path,
                num_epochs=num_epochs,
                batch_size=batch_size,
                learning_rate=learning_rate,
                output_name=f"{dataset_name}_xtts"
            )
        elif model_type == "tacotron2":
            result = training_service.train_tacotron2(
                dataset_path=dataset_path,
                num_epochs=num_epochs,
                batch_size=batch_size,
                output_name=f"{dataset_name}_tacotron2"
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid model type")
        
        # Update job
        job.status = "configured"
        job.output_path = result["output_path"]
        session.add(job)
        session.commit()
        
        return {
            "job_id": job.id,
            "status": "configured",
            "message": "Training environment configured. Run training via CLI or script.",
            "config_path": result["config_path"],
            "output_path": result["output_path"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/train/status/{job_id}", summary="Get training job status")
async def get_training_status(
    job_id: int,
    session: Session = Depends(get_session),
    token: dict = Depends(verify_token)
):
    """Get the status of a training job"""
    job = session.get(TrainingJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "job_id": job.id,
        "status": job.status,
        "model_type": job.model_type,
        "dataset_name": job.dataset_name,
        "epochs": job.num_epochs,
        "output_path": job.output_path,
        "created_at": job.created_at
    }


@router.get("/models", summary="List available TTS models")
async def list_models(token: dict = Depends(verify_token)):
    """List all available TTS models (pre-trained and custom)"""
    training_service = get_training_service()
    models = training_service.get_available_models()
    
    return {
        "models": models,
        "total": len(models)
    }


@router.get("/voices", summary="List cloned voices")
async def list_voices(
    session: Session = Depends(get_session),
    token: dict = Depends(verify_token)
):
    """List all cloned voice references"""
    voices = session.exec(select(VoiceModel)).all()
    
    return {
        "voices": [
            {
                "id": v.id,
                "name": v.name,
                "created_at": v.created_at,
                "metadata": json.loads(v.metadata) if v.metadata else None
            }
            for v in voices
        ],
        "total": len(voices)
    }


@router.delete("/voices/{voice_id}", summary="Delete a cloned voice")
async def delete_voice(
    voice_id: int,
    session: Session = Depends(get_session),
    token: dict = Depends(verify_token)
):
    """Delete a cloned voice"""
    voice = session.get(VoiceModel, voice_id)
    if not voice:
        raise HTTPException(status_code=404, detail="Voice not found")
    
    # Delete file
    if os.path.exists(voice.speaker_wav_path):
        os.remove(voice.speaker_wav_path)
    
    # Delete from DB
    session.delete(voice)
    session.commit()
    
    return {"status": "success", "message": "Voice deleted"}


@router.post("/analyze", summary="Analyze audio for quality and features")
async def analyze_audio(
    file: UploadFile = File(...),
    include_vad: bool = Form(True),
    include_diarization: bool = Form(False),
    include_emotion: bool = Form(False),
    token: dict = Depends(verify_token)
):
    """
    Comprehensive audio analysis including quality metrics, VAD, diarization, and emotion
    """
    temp_filename = f"analyze_{uuid.uuid4()}_{file.filename}"
    temp_path = settings.UPLOAD_DIR / temp_filename
    
    try:
        # Save file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Analyze
        analysis_service = get_audio_analysis()
        results = analysis_service.combine_analysis(
            audio_path=temp_path,
            include_vad=include_vad,
            include_diarization=include_diarization,
            include_emotion=include_emotion,
            include_quality=True
        )
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path.exists():
            temp_path.unlink()


@router.post("/enhance", summary="Enhance speech audio quality")
async def enhance_audio(
    file: UploadFile = File(...),
    token: dict = Depends(verify_token)
):
    """Remove noise and enhance speech quality"""
    input_filename = f"noisy_{uuid.uuid4()}_{file.filename}"
    input_path = settings.UPLOAD_DIR / input_filename
    output_filename = f"enhanced_{uuid.uuid4()}.wav"
    output_path = settings.UPLOAD_DIR / output_filename
    
    try:
        # Save file
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Enhance
        analysis_service = get_audio_analysis()
        enhanced_path = analysis_service.enhance_speech(input_path, output_path)
        
        return FileResponse(
            enhanced_path,
            media_type="audio/wav",
            filename="enhanced.wav"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if input_path.exists():
            input_path.unlink()
