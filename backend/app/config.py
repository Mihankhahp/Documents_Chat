import os

CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_store")
EMBED_MODEL = os.getenv("EMBED_MODEL", "BAAI/bge-m3")

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama").lower()
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://host.docker.internal:8001/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3:latest")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")

DB_URL = os.getenv("DB_URL", "sqlite:///./data/app.db")
if DB_URL.startswith("sqlite:///"):
    os.makedirs("./data", exist_ok=True)

OCR_ENABLED = os.getenv("OCR_ENABLED", "true").lower() in ("1", "true", "yes")

os.environ.setdefault("ANONYMIZED_TELEMETRY", "false")
