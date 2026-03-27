import os
from pathlib import Path
from dotenv import load_dotenv

# Load env vars from .env file
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

class Settings:
    PROJECT_NAME: str = "MemoSphere AI"
    VERSION: str = "1.0.0"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./memo_db.sqlite3")
    
    # AI Config
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    # Paths
    UPLOAD_DIR: Path = Path("uploads")
    MODELS_DIR: Path = Path("models")

settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(exist_ok=True)
settings.MODELS_DIR.mkdir(exist_ok=True)
