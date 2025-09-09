from fastapi import APIRouter
from ..config import EMBED_MODEL, LLM_PROVIDER, LLM_MODEL, OCR_ENABLED, DB_URL, CHROMA_DIR

router = APIRouter()

@router.get("/health")
def health():
    return {
        "ok": True,
        "embed_model": EMBED_MODEL,
        "llm_provider_default": LLM_PROVIDER,
        "llm_model_default": LLM_MODEL,
        "providers_supported": ["ollama", "openai", "openai_compat"],
        "ocr_enabled": OCR_ENABLED,
        "db_url": DB_URL,
        "chroma_dir": CHROMA_DIR,
    }
