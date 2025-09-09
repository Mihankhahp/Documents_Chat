import uuid
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from ..db import get_db
from ..models import Conversation, Message
from ..api.deps import require_user
from ..schemas.conversations import ConversationCreate
from ..schemas.common import ConversationSummary, ConversationDetail, MessageDTO

router = APIRouter(prefix="/v1", tags=["conversations"])

@router.post("/conversations", response_model=ConversationSummary)
def create_conversation(body: ConversationCreate,
                        user_id: Optional[str] = Header(default=None, alias="user-id"),
                        db: Session = Depends(get_db)):
    user = require_user(user_id, db)
    cid = str(uuid.uuid4())
    conv = Conversation(id=cid, user_id=user.user_id, title=body.title)
    db.add(conv); db.commit(); db.refresh(conv)
    return ConversationSummary(id=conv.id, title=conv.title,
                               created_at=conv.created_at, updated_at=conv.updated_at)

@router.get("/conversations", response_model=List[ConversationSummary])
def list_conversations(user_id: Optional[str] = Header(default=None, alias="user-id"),
                       db: Session = Depends(get_db)):
    user = require_user(user_id, db)
    rows = (db.query(Conversation)
            .filter(Conversation.user_id == user.user_id)
            .order_by(Conversation.updated_at.desc(), Conversation.created_at.desc())
            .all())
    return [ConversationSummary(id=r.id, title=r.title, created_at=r.created_at, updated_at=r.updated_at) for r in rows]

@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: str,
                     user_id: Optional[str] = Header(default=None, alias="user-id"),
                     db: Session = Depends(get_db)):
    user = require_user(user_id, db)
    conv = (db.query(Conversation)
            .filter(Conversation.id == conversation_id, Conversation.user_id == user.user_id)
            .first())
    if not conv:
        raise HTTPException(404, detail={"message": "Conversation not found."})
    msgs = [MessageDTO(id=m.id, role=m.role, content=m.content, created_at=m.created_at, sources=m.sources)
            for m in conv.messages]
    return ConversationDetail(id=conv.id, title=conv.title, created_at=conv.created_at,
                              updated_at=conv.updated_at, messages=msgs)

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str,
                        user_id: Optional[str] = Header(default=None, alias="user-id"),
                        db: Session = Depends(get_db)):
    user = require_user(user_id, db)
    conv = (db.query(Conversation)
            .filter(Conversation.id == conversation_id, Conversation.user_id == user.user_id)
            .first())
    if not conv:
        raise HTTPException(404, detail={"message": "Conversation not found."})
    db.delete(conv); db.commit()
    return {"status": "deleted"}
