import chromadb
from typing import Dict, Any, Optional
from ..config import CHROMA_DIR

chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
collection = chroma_client.get_or_create_collection(
    name="docs", metadata={"hnsw:space": "cosine"}
)


def count_where(where: Dict[str, Any]) -> Optional[int]:
    try:
        r = collection.get(where=where, include=["metadatas"])
        metas = r.get("metadatas", [])
        return len(metas) if isinstance(metas, list) else 0
    except Exception:
        return None


def force_delete_doc_chunks(user_id: str, doc_id: str) -> int:
    """
    Delete by where; if any chunks remain, fetch their IDs and delete by ids.
    Returns the number of remaining chunks after the operation (should be 0).
    """
    where = {"user_id": user_id, "doc_id": doc_id}
    try:
        collection.delete(where=where)
    except Exception:
        pass

    # Count what's left
    remaining = 0
    try:
        r = collection.get(where=where, include=["metadatas"])
        metas = r.get("metadatas", []) or []
        if metas and isinstance(metas[0], dict):
            remaining = len(metas)
        elif metas and isinstance(metas[0], list):
            remaining = sum(len(x or []) for x in metas)
    except Exception:
        remaining = 0

    # Fallback: delete by ids if anything remained
    if remaining > 0:
        try:
            r = collection.get(where=where, include=["ids"])
            ids = r.get("ids", []) or []
            flat_ids = (
                ids
                if ids and isinstance(ids[0], str)
                else [i for sub in ids for i in (sub or []) if isinstance(i, str)]
            )
            if flat_ids:
                collection.delete(ids=flat_ids)
        except Exception:
            pass

    # Final verification
    try:
        r = collection.get(where=where, include=["metadatas"])
        metas = r.get("metadatas", []) or []
        if metas and isinstance(metas[0], dict):
            remaining = len(metas)
        elif metas and isinstance(metas[0], list):
            remaining = sum(len(x or []) for x in metas)
        else:
            remaining = 0
    except Exception:
        remaining = 0

    return remaining
