# TTS Training Guide

## Overview
This guide explains how to train and fine-tune Text-to-Speech (TTS) models using Coqui TTS in the MemoSphere application.

## Models Supported

### 1. XTTS-v2 (Recommended)
- **Type**: Multi-lingual, multi-speaker voice cloning
- **Best for**: Quick voice cloning with minimal data
- **Data needed**: 6-30 seconds of clean audio per speaker
- **Languages**: 16+ languages supported

### 2. Tacotron2
- **Type**: Single-speaker TTS
- **Best for**: High-quality single voice
- **Data needed**: 2-10 hours of audio minimum
- **Languages**: Language-specific training

### 3. Bark (Alternative)
- **Type**: Generative audio model
- **Best for**: Natural-sounding speech with emotions
- **Data needed**: Pre-trained, no training required
- **Special**: Can generate music, sound effects

## Quick Start: Voice Cloning

### 1. Clone a Voice (No Training)
```bash
curl -X POST "http://localhost:8000/api/tts/clone" \
  -F "name=my_voice" \
  -F "file=@sample.wav" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Requirements:
- Audio: 6-30 seconds
- Format: WAV, MP3, or M4A
- Quality: Clean, no background noise
- Speech: Natural pace, clear pronunciation

### 2. Generate Speech
```bash
curl -X POST "http://localhost:8000/api/tts/generate" \
  -F "text=Hello, this is a test of voice cloning." \
  -F "voice_name=my_voice" \
  -F "language=en" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output generated.wav
```

## Advanced: Fine-Tuning XTTS

### 1. Prepare Training Dataset

Collect audio samples:
- **Quantity**: 100-1000 samples recommended
- **Duration**: 2-10 seconds each
- **Quality**: 
  - Sample rate: 22050 Hz or higher
  - Format: WAV preferred
  - No background noise
  - Clear speech

Create transcripts:
```json
[
  "This is the first sentence.",
  "Here is another example.",
  "The quick brown fox jumps over the lazy dog."
]
```

### 2. Upload Dataset
```bash
curl -X POST "http://localhost:8000/api/tts/train/prepare-dataset" \
  -F "speaker_name=john_doe" \
  -F "language=en" \
  -F "files=@sample1.wav" \
  -F "files=@sample2.wav" \
  -F "files=@sample3.wav" \
  -F 'transcripts=["Text 1", "Text 2", "Text 3"]' \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Start Training
```bash
curl -X POST "http://localhost:8000/api/tts/train/start" \
  -F "dataset_name=john_doe" \
  -F "model_type=xtts" \
  -F "num_epochs=10" \
  -F "batch_size=4" \
  -F "learning_rate=0.00005" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Monitor Training
```bash
# Check status
curl "http://localhost:8000/api/tts/train/status/JOB_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Run Training (CLI)
The API prepares the configuration. To actually train:

```bash
cd backend
python -m TTS.bin.train_tts --config_path models/checkpoints/DATASET_NAME_xtts/config.json
```

For GPU training:
```bash
CUDA_VISIBLE_DEVICES=0 python -m TTS.bin.train_tts \
  --config_path models/checkpoints/DATASET_NAME_xtts/config.json
```

## Training Tacotron2

### 1. Prepare Large Dataset
- 2-10 hours of audio minimum
- Single speaker
- Consistent recording conditions
- High quality audio (44.1kHz or 22.05kHz)

### 2. Start Training
```bash
curl -X POST "http://localhost:8000/api/tts/train/start" \
  -F "dataset_name=my_dataset" \
  -F "model_type=tacotron2" \
  -F "num_epochs=1000" \
  -F "batch_size=32" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Execute Training
```bash
python -m TTS.bin.train_tts \
  --config_path models/checkpoints/my_dataset_tacotron2/config.json
```

Training time: 1-7 days depending on dataset size and GPU

## Using Bark TTS

Bark doesn't require training but offers natural speech:

```bash
curl -X POST "http://localhost:8000/api/tts/generate/bark" \
  -F "text=Hello! [laughs] This is amazing!" \
  -F "voice_preset=v2/en_speaker_6" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output bark_output.wav
```

Special features:
- Can include `[laughs]`, `[sighs]`, `[clears throat]`
- Supports music: `♪ La la la ♪`
- Multiple languages in same text

Available presets:
- `v2/en_speaker_0` to `v2/en_speaker_9` (English)
- `v2/es_speaker_0` to `v2/es_speaker_9` (Spanish)
- And more...

## Audio Enhancement

### Enhance Audio Quality
```bash
curl -X POST "http://localhost:8000/api/tts/enhance" \
  -F "file=@noisy_audio.wav" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output enhanced.wav
```

### Analyze Audio
```bash
curl -X POST "http://localhost:8000/api/tts/analyze" \
  -F "file=@audio.wav" \
  -F "include_vad=true" \
  -F "include_diarization=true" \
  -F "include_emotion=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Features:
- **VAD**: Voice Activity Detection (find speech segments)
- **Diarization**: Speaker separation ("who spoke when")
- **Emotion**: Detect emotions in speech
- **Quality**: SNR, dynamic range, etc.

## Best Practices

### Data Collection
1. **Quality over quantity** for voice cloning
2. Record in quiet environment
3. Use consistent microphone
4. Natural speaking pace
5. Diverse sentence structures
6. Include varied emotions/tones

### Training Tips
1. Start with small epochs (10-20)
2. Monitor validation loss
3. Use GPU for faster training
4. Save checkpoints frequently
5. Fine-tune from pre-trained models
6. Validate on held-out test set

### Production Deployment
1. Use quantized models for speed
2. Implement caching for common phrases
3. Use async processing for long texts
4. Monitor GPU memory usage
5. Set up model versioning
6. A/B test voice quality

## Troubleshooting

### Poor Voice Quality
- Increase training data
- Improve audio quality (use enhancement)
- Adjust learning rate (lower)
- Train for more epochs
- Check for overfitting

### Training Errors
- Reduce batch size if OOM
- Ensure audio sample rate is consistent
- Validate transcript alignment
- Check CUDA compatibility

### Slow Inference
- Use GPU if available
- Reduce model size (quantization)
- Batch multiple requests
- Use streaming for long texts

## Performance Benchmarks

### XTTS-v2
- **Cloning**: 10-30 seconds
- **Inference**: 1-3x realtime (GPU)
- **Quality**: Excellent for 6-30s samples

### Tacotron2
- **Training**: 1-7 days
- **Inference**: 0.5-2x realtime (GPU)
- **Quality**: Excellent for single speaker

### Bark
- **Inference**: 3-10x realtime (GPU)
- **Quality**: Very natural, can be slow

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tts/clone` | POST | Clone voice from sample |
| `/api/tts/generate` | POST | Generate speech (XTTS) |
| `/api/tts/generate/bark` | POST | Generate speech (Bark) |
| `/api/tts/train/prepare-dataset` | POST | Prepare training data |
| `/api/tts/train/start` | POST | Start training job |
| `/api/tts/train/status/{id}` | GET | Check training status |
| `/api/tts/models` | GET | List available models |
| `/api/tts/voices` | GET | List cloned voices |
| `/api/tts/analyze` | POST | Analyze audio |
| `/api/tts/enhance` | POST | Enhance audio quality |

## Next Steps

1. Try voice cloning with a sample
2. Experiment with Bark TTS
3. Collect dataset for fine-tuning
4. Monitor training progress
5. Deploy best model to production
