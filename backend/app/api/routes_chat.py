from typing import Optional, List, Dict
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User, FileRecord, Conversation, Message
from ..api.deps import require_user
from ..services.embeddings import embed
from ..services.vectorstore import collection
from ..schemas.chat import (
    ChatRequest,
    ChatResponse,
)
from ..services.prompting import build_rag_messages, OOS_REPLY
from ..services.llm import llm_chat

router = APIRouter(prefix="/v1", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    request: Request,
    user_id: Optional[str] = Header(default=None, alias="user-id"),
    db: Session = Depends(get_db),
):
    user: User = require_user(user_id, db)

    if not body.doc_ids:
        raise HTTPException(
            400,
            detail={
                "message": "No file selected. Provide one or more doc_ids to chat against."
            },
        )

    # Resolve (or create) conversation
    if body.conversation_id:
        conv = (
            db.query(Conversation)
            .filter(
                Conversation.id == body.conversation_id,
                Conversation.user_id == user.user_id,
            )
            .first()
        )
        if not conv:
            raise HTTPException(404, detail={"message": "Conversation not found."})
    else:
        conv = Conversation(id=str(uuid.uuid4()), user_id=user.user_id, title=None)
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Ownership check for doc_ids
    owned = (
        db.query(FileRecord)
        .filter(FileRecord.user_id == user.user_id, FileRecord.doc_id.in_(body.doc_ids))
        .count()
    )
    if owned != len(body.doc_ids):
        raise HTTPException(
            403, detail={"message": "One or more doc_ids do not belong to this user."}
        )

    # Safety clamps for retrieval sizes
    top_k = max(1, min(int(body.top_k or 12), 50))
    max_context = max(1, min(int(body.max_context or 6), top_k))

    where_filter = {
        "$and": [{"user_id": user.user_id}, {"doc_id": {"$in": body.doc_ids}}]
    }

    # Vector search limited to selected documents only
    q_vec = embed([body.query])[0]
    res = collection.query(
        query_embeddings=[q_vec], n_results=top_k, where=where_filter
    )
    docs = res.get("documents", [[]])[0] or []
    metas = res.get("metadatas", [[]])[0] or []

    # Build deduped context and UI sources (preserve order)
    seen_texts = set()
    context_chunks: List[str] = []
    sources: List[Dict[str, str]] = []
    for text, meta in zip(docs, metas):
        if not isinstance(text, str):
            continue
        # simple dedupe by exact chunk text; avoids repeated chunks
        if text in seen_texts:
            continue
        seen_texts.add(text)

        sources.append(
            {
                "snippet": text[:200] + ("..." if len(text) > 200 else ""),
                "source": (meta or {}).get("source"),
                "page": (meta or {}).get("page"),
                "doc_id": (meta or {}).get("doc_id"),
            }
        )
        context_chunks.append(text)
        if len(context_chunks) >= max_context:
            break

    # Persist user message (audit)
    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        user_id=user.user_id,
        role="user",
        content=body.query,
        meta={"doc_ids": body.doc_ids, "top_k": top_k, "max_context": max_context},
    )
    db.add(user_msg)
    db.commit()

    # If we have no usable context, return deterministic OOS immediately (no LLM call)
    if len(context_chunks) == 0:
        answer = OOS_REPLY
        asst_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            user_id=user.user_id,
            role="assistant",
            content=answer,
            sources=[],
        )
        conv.updated_at = datetime.utcnow()
        if not conv.title:
            conv.title = (
                body.query[:80] + ("…" if len(body.query) > 80 else "")
            ) or "Conversation"
        db.add(asst_msg)
        db.commit()
        return ChatResponse(response=answer, sources=[], conversation_id=conv.id)

    # Build grounded prompt with strict denial & citation rules
    messages = build_rag_messages(body.query, context_chunks)

    # Provider/model overrides & key
    provider_override = getattr(body, "provider", None) or request.headers.get(
        "X-LLM-Provider"
    )
    model_override = getattr(body, "model", None) or request.headers.get("X-LLM-Model")
    openai_key = request.headers.get("X-OpenAI-Key", "")

    # Call LLM
    answer = await llm_chat(
        messages,
        temperature=body.temperature,
        openai_key_header=openai_key,
        provider_override=provider_override,
        model_override=model_override,
        top_p=body.top_p,
        stop=body.stop,
        use_responses_api=body.use_responses_api,
        max_output_tokens=getattr(body, "max_output_tokens", 1024),
    )

    # Persist assistant message & update conversation
    asst_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        user_id=user.user_id,
        role="assistant",
        content=answer,
        sources=sources,
    )
    conv.updated_at = datetime.utcnow()
    if not conv.title:
        conv.title = (
            body.query[:80] + ("…" if len(body.query) > 80 else "")
        ) or "Conversation"
    db.add(asst_msg)
    db.commit()

    return ChatResponse(response=answer, sources=sources, conversation_id=conv.id)
