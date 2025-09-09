from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class AuthResponse(BaseModel):
    user_id: str

class UploadResponse(BaseModel):
    status: str
    chunks: int
    doc_id: Optional[str] = None
    filename: Optional[str] = None

class ConversationSummary(BaseModel):
    id: str
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class MessageDTO(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime
    sources: Optional[List[Dict[str, Any]]] = None

class ConversationDetail(BaseModel):
    id: str
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    messages: List[MessageDTO]
