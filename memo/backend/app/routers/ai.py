from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
import requests
import json
from ..config import settings
from ..utils import verify_token, verify_org_access

router = APIRouter(prefix="/api/ai", tags=["ai"])

class AIRequest(BaseModel):
    context: str = ""
    org_id: str
    content: Optional[str] = None # Plain text content for now

async def call_llm(prompt: str):
    # Try OpenAI first if key exists
    if settings.OPENAI_API_KEY:
        try:
            headers = {"Authorization": f"Bearer {settings.OPENAI_API_KEY}"}
            data = {
                "model": "gpt-4-mini",
                "messages": [{"role": "user", "content": prompt}]
            }
            res = requests.post("https://api.openai.com/v1/chat/completions", json=data, headers=headers)
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"]
        except:
            pass
    
    # Fallback to Ollama
    try:
        res = requests.post(
            f"{settings.OLLAMA_BASE_URL}/api/generate",
            json={"model": "llama3", "prompt": prompt, "stream": False},
            timeout=60
        )
        if res.status_code == 200:
            return res.json().get("response", "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Service unavailable: {str(e)}")
    
    return "AI Unavailable"

@router.post("/summarize")
async def summarize(req: AIRequest, token: dict = Depends(verify_token)):
    if not verify_org_access(req.org_id, token):
        raise HTTPException(status_code=403)
        
    prompt = f"Summarize checking constraints: {req.context}\nContent: {req.content}"
    result = await call_llm(prompt)
    return {"result": result, "encrypted": False}

@router.post("/extract-decisions")
async def extract_decisions(req: AIRequest, token: dict = Depends(verify_token)):
    if not verify_org_access(req.org_id, token):
        raise HTTPException(status_code=403)
    
    prompt = f"Extract decisions from this text as JSON string array:\n{req.content}"
    result = await call_llm(prompt)
    # Basic cleanup to ensure JSON
    return {"result": {"decisions": parse_list(result)}, "encrypted": False}

@router.post("/query")
async def query(req: AIRequest, token: dict = Depends(verify_token)):
    if not verify_org_access(req.org_id, token):
        raise HTTPException(status_code=403)
    
    prompt = f"Context: {req.context}\nContent: {req.content}\nAnswer user query."
    result = await call_llm(prompt)
    return {"result": result, "encrypted": False}

def parse_list(text: str) -> List[str]:
    try:
        # Try to find JSON array brackets
        start = text.find('[')
        end = text.rfind(']')
        if start != -1 and end != -1:
            return json.loads(text[start:end+1])
        return [line for line in text.split('\n') if line.strip().startswith('-')]
    except:
        return [text]
