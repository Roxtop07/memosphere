# Quick Setup Script for TTS & AI Models
# Run this after installing requirements.txt

import os
import sys
from pathlib import Path

def setup_models():
    """Download and setup required AI models"""
    print("🚀 Setting up AI models for MemoSphere...")
    
    # Create directories
    models_dir = Path("models")
    models_dir.mkdir(exist_ok=True)
    (models_dir / "checkpoints").mkdir(exist_ok=True)
    (models_dir / "datasets").mkdir(exist_ok=True)
    (models_dir / "training").mkdir(exist_ok=True)
    
    print("✓ Created model directories")
    
    # Download Whisper model
    print("\n📥 Downloading Faster Whisper model...")
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("base", device="cpu", compute_type="int8")
        print("✓ Faster Whisper (base) downloaded")
    except Exception as e:
        print(f"⚠️  Whisper download failed: {e}")
    
    # Download TTS model
    print("\n📥 Downloading Coqui TTS model...")
    try:
        from TTS.api import TTS
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        print("✓ XTTS-v2 downloaded")
    except Exception as e:
        print(f"⚠️  TTS download failed: {e}")
    
    # Download Silero VAD
    print("\n📥 Downloading Silero VAD model...")
    try:
        import torch
        model, utils = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='silero_vad',
            force_reload=False
        )
        print("✓ Silero VAD downloaded")
    except Exception as e:
        print(f"⚠️  VAD download failed: {e}")
    
    print("\n✅ Setup complete!")
    print("\nNext steps:")
    print("1. Set environment variables in .env file")
    print("2. Run: python backend/manage.py migrate")
    print("3. Start server: python backend/main.py")

if __name__ == "__main__":
    setup_models()
