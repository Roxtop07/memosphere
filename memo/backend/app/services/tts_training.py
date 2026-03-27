"""
TTS Training Service
Handles fine-tuning and training of Coqui TTS models
"""
import os
import json
import torch
import torchaudio
from pathlib import Path
from typing import List, Dict, Optional
from TTS.api import TTS
from TTS.config import load_config
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts
from TTS.utils.manage import ModelManager
from TTS.utils.synthesizer import Synthesizer
import logging

logger = logging.getLogger(__name__)


class TTSTrainingService:
    """Service for training and fine-tuning TTS models"""
    
    def __init__(self, models_dir: Path):
        self.models_dir = models_dir
        self.training_dir = models_dir / "training"
        self.datasets_dir = models_dir / "datasets"
        self.checkpoints_dir = models_dir / "checkpoints"
        
        # Create directories
        for dir_path in [self.training_dir, self.datasets_dir, self.checkpoints_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
    
    def prepare_dataset(
        self,
        audio_files: List[Path],
        transcripts: List[str],
        speaker_name: str,
        language: str = "en"
    ) -> Path:
        """
        Prepare dataset for TTS training
        
        Args:
            audio_files: List of audio file paths
            transcripts: List of corresponding transcripts
            speaker_name: Name of the speaker
            language: Language code
            
        Returns:
            Path to prepared dataset directory
        """
        dataset_path = self.datasets_dir / speaker_name
        dataset_path.mkdir(exist_ok=True)
        
        wavs_dir = dataset_path / "wavs"
        wavs_dir.mkdir(exist_ok=True)
        
        # Prepare metadata
        metadata = []
        
        for idx, (audio_file, transcript) in enumerate(zip(audio_files, transcripts)):
            # Convert and normalize audio
            wav_name = f"{speaker_name}_{idx:05d}.wav"
            wav_path = wavs_dir / wav_name
            
            try:
                # Load audio
                waveform, sample_rate = torchaudio.load(str(audio_file))
                
                # Convert to mono if stereo
                if waveform.shape[0] > 1:
                    waveform = torch.mean(waveform, dim=0, keepdim=True)
                
                # Resample to 22050 Hz (standard for TTS)
                if sample_rate != 22050:
                    resampler = torchaudio.transforms.Resample(sample_rate, 22050)
                    waveform = resampler(waveform)
                
                # Normalize
                waveform = waveform / torch.max(torch.abs(waveform))
                
                # Save
                torchaudio.save(str(wav_path), waveform, 22050)
                
                # Add to metadata (LJSpeech format)
                metadata.append(f"{wav_name}|{transcript}|{transcript}\n")
                
            except Exception as e:
                logger.error(f"Error processing {audio_file}: {e}")
                continue
        
        # Save metadata.csv
        metadata_path = dataset_path / "metadata.csv"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            f.writelines(metadata)
        
        # Save config
        config = {
            "speaker_name": speaker_name,
            "language": language,
            "num_samples": len(metadata),
            "dataset_path": str(dataset_path)
        }
        
        config_path = dataset_path / "config.json"
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        logger.info(f"Dataset prepared: {len(metadata)} samples at {dataset_path}")
        return dataset_path
    
    def fine_tune_xtts(
        self,
        dataset_path: Path,
        base_model: str = "tts_models/multilingual/multi-dataset/xtts_v2",
        num_epochs: int = 10,
        batch_size: int = 4,
        learning_rate: float = 5e-5,
        output_name: Optional[str] = None
    ) -> Dict:
        """
        Fine-tune XTTS model on custom dataset
        
        Args:
            dataset_path: Path to prepared dataset
            base_model: Base model to fine-tune from
            num_epochs: Number of training epochs
            batch_size: Training batch size
            learning_rate: Learning rate
            output_name: Name for output model
            
        Returns:
            Training results dictionary
        """
        try:
            # Load dataset config
            with open(dataset_path / "config.json") as f:
                dataset_config = json.load(f)
            
            if output_name is None:
                output_name = f"xtts_v2_{dataset_config['speaker_name']}"
            
            output_path = self.checkpoints_dir / output_name
            output_path.mkdir(exist_ok=True)
            
            # Load base model config
            model_manager = ModelManager()
            model_path, config_path, _ = model_manager.download_model(base_model)
            
            config = XttsConfig()
            config.load_json(config_path)
            
            # Update config for fine-tuning
            config.output_path = str(output_path)
            config.epochs = num_epochs
            config.batch_size = batch_size
            config.lr = learning_rate
            config.train_csv = str(dataset_path / "metadata.csv")
            config.eval_csv = str(dataset_path / "metadata.csv")  # Use same for demo
            config.audio_path = str(dataset_path / "wavs")
            
            # Initialize model
            model = Xtts.init_from_config(config)
            model.load_checkpoint(config, checkpoint_path=model_path, eval=False)
            
            # Training would happen here
            # Note: Full training requires GPU and significant time
            # For production, use distributed training
            logger.info(f"Fine-tuning setup complete. Start training manually or via CLI.")
            logger.info(f"Config saved to: {output_path}")
            
            # Save updated config
            config_save_path = output_path / "config.json"
            config.save_json(str(config_save_path))
            
            return {
                "status": "ready_for_training",
                "output_path": str(output_path),
                "config_path": str(config_save_path),
                "dataset_samples": dataset_config['num_samples'],
                "epochs": num_epochs,
                "batch_size": batch_size,
                "learning_rate": learning_rate
            }
            
        except Exception as e:
            logger.error(f"Fine-tuning setup failed: {e}")
            raise
    
    def train_tacotron2(
        self,
        dataset_path: Path,
        num_epochs: int = 1000,
        batch_size: int = 32,
        output_name: Optional[str] = None
    ) -> Dict:
        """
        Train Tacotron2 model from scratch or fine-tune
        
        Args:
            dataset_path: Path to prepared dataset
            num_epochs: Number of training epochs
            batch_size: Training batch size
            output_name: Name for output model
            
        Returns:
            Training configuration dictionary
        """
        from TTS.tts.configs.tacotron2_config import Tacotron2Config
        
        with open(dataset_path / "config.json") as f:
            dataset_config = json.load(f)
        
        if output_name is None:
            output_name = f"tacotron2_{dataset_config['speaker_name']}"
        
        output_path = self.checkpoints_dir / output_name
        output_path.mkdir(exist_ok=True)
        
        config = Tacotron2Config(
            output_path=str(output_path),
            epochs=num_epochs,
            batch_size=batch_size,
            eval_batch_size=16,
            num_loader_workers=4,
            num_eval_loader_workers=4,
            run_eval=True,
            test_delay_epochs=-1,
            print_step=25,
            plot_step=100,
            log_model_step=1000,
            save_step=1000,
            save_n_checkpoints=5,
            save_best_after=10000,
            target_loss="loss",
            text_cleaner="english_cleaners",
            use_phonemes=False,
        )
        
        # Update with dataset paths
        config.audio_path = str(dataset_path / "wavs")
        config.metadata_path = str(dataset_path / "metadata.csv")
        
        config_save_path = output_path / "config.json"
        config.save_json(str(config_save_path))
        
        return {
            "status": "ready_for_training",
            "output_path": str(output_path),
            "config_path": str(config_save_path),
            "model_type": "tacotron2",
            "epochs": num_epochs
        }
    
    def evaluate_model(
        self,
        model_path: Path,
        test_texts: List[str],
        speaker_wav: Optional[Path] = None
    ) -> List[Path]:
        """
        Evaluate trained model by generating test samples
        
        Args:
            model_path: Path to trained model
            test_texts: List of texts to synthesize
            speaker_wav: Reference speaker audio for XTTS
            
        Returns:
            List of generated audio file paths
        """
        output_files = []
        eval_dir = model_path / "evaluation"
        eval_dir.mkdir(exist_ok=True)
        
        try:
            # Load model
            tts = TTS(model_path=str(model_path))
            
            for idx, text in enumerate(test_texts):
                output_file = eval_dir / f"eval_{idx:03d}.wav"
                
                if speaker_wav:
                    tts.tts_to_file(
                        text=text,
                        speaker_wav=str(speaker_wav),
                        file_path=str(output_file)
                    )
                else:
                    tts.tts_to_file(
                        text=text,
                        file_path=str(output_file)
                    )
                
                output_files.append(output_file)
            
            logger.info(f"Generated {len(output_files)} evaluation samples")
            return output_files
            
        except Exception as e:
            logger.error(f"Evaluation failed: {e}")
            raise
    
    def get_available_models(self) -> List[Dict]:
        """Get list of available pre-trained and custom models"""
        models = []
        
        # Pre-trained models
        manager = ModelManager()
        pretrained = manager.list_models()
        
        for model in pretrained:
            models.append({
                "name": model,
                "type": "pretrained",
                "source": "coqui"
            })
        
        # Custom trained models
        if self.checkpoints_dir.exists():
            for model_dir in self.checkpoints_dir.iterdir():
                if model_dir.is_dir():
                    models.append({
                        "name": model_dir.name,
                        "type": "custom",
                        "path": str(model_dir)
                    })
        
        return models
