"""
Audio Analysis Service
Includes speaker diarization, VAD, emotion detection, and speech enhancement
"""
import torch
import torchaudio
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class AudioAnalysisService:
    """Advanced audio analysis including diarization, VAD, and emotion detection"""
    
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._vad_model = None
        self._diarization_pipeline = None
        self._emotion_model = None
        self._enhancement_model = None
    
    @property
    def vad_model(self):
        """Lazy load Silero VAD model"""
        if self._vad_model is None:
            try:
                logger.info("Loading Silero VAD model...")
                model, utils = torch.hub.load(
                    repo_or_dir='snakers4/silero-vad',
                    model='silero_vad',
                    force_reload=False,
                    onnx=False
                )
                self._vad_model = model
                self.vad_utils = utils
                logger.info("Silero VAD loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load VAD model: {e}")
                raise
        return self._vad_model
    
    @property
    def diarization_pipeline(self):
        """Lazy load pyannote speaker diarization"""
        if self._diarization_pipeline is None:
            try:
                from pyannote.audio import Pipeline
                logger.info("Loading pyannote diarization pipeline...")
                # Requires HuggingFace token for some models
                self._diarization_pipeline = Pipeline.from_pretrained(
                    "pyannote/speaker-diarization-3.1",
                    use_auth_token=None  # Set HF token if needed
                )
                if torch.cuda.is_available():
                    self._diarization_pipeline.to(torch.device("cuda"))
                logger.info("Diarization pipeline loaded")
            except Exception as e:
                logger.error(f"Failed to load diarization: {e}")
                raise
        return self._diarization_pipeline
    
    @property
    def emotion_model(self):
        """Lazy load emotion recognition model"""
        if self._emotion_model is None:
            try:
                from transformers import pipeline
                logger.info("Loading emotion recognition model...")
                self._emotion_model = pipeline(
                    "audio-classification",
                    model="ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition",
                    device=0 if torch.cuda.is_available() else -1
                )
                logger.info("Emotion model loaded")
            except Exception as e:
                logger.error(f"Failed to load emotion model: {e}")
                raise
        return self._emotion_model
    
    @property
    def enhancement_model(self):
        """Lazy load speech enhancement model"""
        if self._enhancement_model is None:
            try:
                from speechbrain.pretrained import SpectralMaskEnhancement
                logger.info("Loading speech enhancement model...")
                self._enhancement_model = SpectralMaskEnhancement.from_hparams(
                    source="speechbrain/metricgan-plus-voicebank",
                    savedir="models/enhancement",
                    run_opts={"device": self.device}
                )
                logger.info("Enhancement model loaded")
            except Exception as e:
                logger.error(f"Failed to load enhancement model: {e}")
                raise
        return self._enhancement_model
    
    def detect_voice_activity(
        self,
        audio_path: Path,
        threshold: float = 0.5,
        min_speech_duration_ms: int = 250,
        min_silence_duration_ms: int = 100
    ) -> List[Dict]:
        """
        Detect voice activity in audio file
        
        Args:
            audio_path: Path to audio file
            threshold: VAD threshold (0-1)
            min_speech_duration_ms: Minimum speech segment duration
            min_silence_duration_ms: Minimum silence duration between segments
            
        Returns:
            List of speech segments with start/end times
        """
        try:
            # Load audio
            wav, sr = torchaudio.load(str(audio_path))
            
            # Resample to 16kHz if needed (Silero VAD requires 16kHz)
            if sr != 16000:
                resampler = torchaudio.transforms.Resample(sr, 16000)
                wav = resampler(wav)
                sr = 16000
            
            # Convert to mono
            if wav.shape[0] > 1:
                wav = torch.mean(wav, dim=0, keepdim=True)
            
            # Get timestamps
            (get_speech_timestamps, _, read_audio, _, _) = self.vad_utils
            
            speech_timestamps = get_speech_timestamps(
                wav.squeeze(0),
                self.vad_model,
                threshold=threshold,
                min_speech_duration_ms=min_speech_duration_ms,
                min_silence_duration_ms=min_silence_duration_ms,
                return_seconds=True
            )
            
            segments = []
            for ts in speech_timestamps:
                segments.append({
                    "start": ts['start'],
                    "end": ts['end'],
                    "duration": ts['end'] - ts['start']
                })
            
            logger.info(f"Found {len(segments)} speech segments")
            return segments
            
        except Exception as e:
            logger.error(f"VAD failed: {e}")
            raise
    
    def diarize_speakers(
        self,
        audio_path: Path,
        num_speakers: Optional[int] = None,
        min_speakers: int = 1,
        max_speakers: int = 10
    ) -> Dict:
        """
        Perform speaker diarization
        
        Args:
            audio_path: Path to audio file
            num_speakers: Known number of speakers (optional)
            min_speakers: Minimum number of speakers
            max_speakers: Maximum number of speakers
            
        Returns:
            Diarization results with speaker labels and timestamps
        """
        try:
            # Run diarization
            if num_speakers:
                diarization = self.diarization_pipeline(
                    str(audio_path),
                    num_speakers=num_speakers
                )
            else:
                diarization = self.diarization_pipeline(
                    str(audio_path),
                    min_speakers=min_speakers,
                    max_speakers=max_speakers
                )
            
            # Parse results
            segments = []
            speakers_set = set()
            
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                segments.append({
                    "speaker": speaker,
                    "start": turn.start,
                    "end": turn.end,
                    "duration": turn.end - turn.start
                })
                speakers_set.add(speaker)
            
            result = {
                "num_speakers": len(speakers_set),
                "speakers": sorted(list(speakers_set)),
                "segments": segments,
                "total_duration": max([s["end"] for s in segments]) if segments else 0
            }
            
            logger.info(f"Diarization complete: {result['num_speakers']} speakers, {len(segments)} segments")
            return result
            
        except Exception as e:
            logger.error(f"Diarization failed: {e}")
            raise
    
    def detect_emotion(
        self,
        audio_path: Path,
        chunk_duration: float = 5.0
    ) -> List[Dict]:
        """
        Detect emotions in speech
        
        Args:
            audio_path: Path to audio file
            chunk_duration: Duration of chunks to analyze (seconds)
            
        Returns:
            List of emotion predictions with timestamps
        """
        try:
            # Load audio
            wav, sr = torchaudio.load(str(audio_path))
            
            # Convert to mono
            if wav.shape[0] > 1:
                wav = torch.mean(wav, dim=0, keepdim=True)
            
            # Resample to 16kHz if needed
            if sr != 16000:
                resampler = torchaudio.transforms.Resample(sr, 16000)
                wav = resampler(wav)
                sr = 16000
            
            # Split into chunks
            chunk_samples = int(chunk_duration * sr)
            total_samples = wav.shape[1]
            
            results = []
            
            for start_sample in range(0, total_samples, chunk_samples):
                end_sample = min(start_sample + chunk_samples, total_samples)
                chunk = wav[:, start_sample:end_sample]
                
                # Skip if chunk too small
                if chunk.shape[1] < sr:  # Less than 1 second
                    continue
                
                # Run emotion detection
                chunk_np = chunk.squeeze(0).numpy()
                predictions = self.emotion_model(chunk_np, sampling_rate=sr)
                
                # Get top emotion
                top_emotion = max(predictions, key=lambda x: x['score'])
                
                results.append({
                    "start": start_sample / sr,
                    "end": end_sample / sr,
                    "emotion": top_emotion['label'],
                    "confidence": top_emotion['score'],
                    "all_predictions": predictions
                })
            
            logger.info(f"Emotion detection complete: {len(results)} segments")
            return results
            
        except Exception as e:
            logger.error(f"Emotion detection failed: {e}")
            raise
    
    def enhance_speech(
        self,
        audio_path: Path,
        output_path: Path
    ) -> Path:
        """
        Enhance speech quality (noise reduction)
        
        Args:
            audio_path: Path to noisy audio
            output_path: Path to save enhanced audio
            
        Returns:
            Path to enhanced audio file
        """
        try:
            # Load and enhance
            enhanced = self.enhancement_model.enhance_file(str(audio_path))
            
            # Save enhanced audio
            torchaudio.save(
                str(output_path),
                enhanced.unsqueeze(0).cpu(),
                16000
            )
            
            logger.info(f"Speech enhanced and saved to {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Speech enhancement failed: {e}")
            raise
    
    def analyze_audio_quality(
        self,
        audio_path: Path
    ) -> Dict:
        """
        Analyze audio quality metrics
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Dictionary of quality metrics
        """
        try:
            # Load audio
            wav, sr = torchaudio.load(str(audio_path))
            
            # Convert to mono
            if wav.shape[0] > 1:
                wav = torch.mean(wav, dim=0, keepdim=True)
            
            wav_np = wav.squeeze(0).numpy()
            
            # Calculate metrics
            metrics = {
                "duration": len(wav_np) / sr,
                "sample_rate": sr,
                "channels": wav.shape[0],
                "rms_level": float(np.sqrt(np.mean(wav_np**2))),
                "peak_level": float(np.max(np.abs(wav_np))),
                "dynamic_range": float(20 * np.log10(np.max(np.abs(wav_np)) / (np.std(wav_np) + 1e-10))),
                "zero_crossing_rate": float(np.mean(np.abs(np.diff(np.sign(wav_np))))),
            }
            
            # SNR estimation (simple)
            noise_floor = np.percentile(np.abs(wav_np), 10)
            signal_peak = np.percentile(np.abs(wav_np), 90)
            metrics["estimated_snr"] = float(20 * np.log10(signal_peak / (noise_floor + 1e-10)))
            
            return metrics
            
        except Exception as e:
            logger.error(f"Quality analysis failed: {e}")
            raise
    
    def combine_analysis(
        self,
        audio_path: Path,
        include_vad: bool = True,
        include_diarization: bool = True,
        include_emotion: bool = False,
        include_quality: bool = True
    ) -> Dict:
        """
        Perform comprehensive audio analysis
        
        Args:
            audio_path: Path to audio file
            include_vad: Include voice activity detection
            include_diarization: Include speaker diarization
            include_emotion: Include emotion detection
            include_quality: Include quality metrics
            
        Returns:
            Combined analysis results
        """
        results = {
            "audio_file": str(audio_path),
            "timestamp": str(torch.datetime.datetime.now())
        }
        
        try:
            if include_quality:
                results["quality"] = self.analyze_audio_quality(audio_path)
            
            if include_vad:
                results["voice_activity"] = self.detect_voice_activity(audio_path)
            
            if include_diarization:
                results["speaker_diarization"] = self.diarize_speakers(audio_path)
            
            if include_emotion:
                results["emotion_analysis"] = self.detect_emotion(audio_path)
            
            logger.info("Comprehensive audio analysis complete")
            return results
            
        except Exception as e:
            logger.error(f"Combined analysis failed: {e}")
            raise
