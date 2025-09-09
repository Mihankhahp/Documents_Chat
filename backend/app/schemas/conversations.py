from typing import Optional
from pydantic import BaseModel

class ConversationCreate(BaseModel):
    title: Optional[str] = None
