# app/schemas/chat.py
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel


class ChatRequest(BaseModel):
    query: str
    top_k: int = 12
    max_context: int = 6
    temperature: float = 0.2

    # sampling / limits
    max_output_tokens: Optional[int] = None
    top_p: Optional[float] = None
    stop: Optional[Union[List[str], str]] = None
    use_responses_api: Optional[bool] = None

    # scoping / provider
    doc_ids: Optional[List[str]] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    conversation_id: Optional[str] = None
    history_limit: int = 12


class ChatResponse(BaseModel):
    response: str
    sources: List[Dict[str, Any]]
    conversation_id: str
