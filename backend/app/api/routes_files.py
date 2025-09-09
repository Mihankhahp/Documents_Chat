import os, tempfile, uuid
from fastapi import APIRouter, UploadFile, File, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from ..db import get_db
from ..models import FileRecord, User
from ..api.deps import require_user
from ..services.parsers import extract_text_blobs
from ..services.chunking import chunk_text
from ..services.embeddings import embed
from ..services.vectorstore import collection, count_where, force_delete_doc_chunks


router = APIRouter(prefix="/v1", tags=["files"])


@router.get("/files")
def list_files(
    user_id: Optional[str] = Header(default=None, alias="user-id"),
    db: Session = Depends(get_db),
):
    _ = require_user(user_id, db)
    rows = (
        db.query(FileRecord)
        .filter(FileRecord.user_id == user_id)
        .order_by(FileRecord.created_at.desc())
        .all()
    )
    if rows:
        return {
            "files": [
                {
                    "id": f.doc_id,
                    "name": f.filename,
                    "size_bytes": f.size_bytes,
                    "content_type": f.content_type,
                    "page_count": f.page_count,
                    "created_at": f.created_at.isoformat(),
                }
                for f in rows
            ]
        }
    # legacy fallback via Chroma metadatas
    # ---- Legacy fallback via Chroma metadata (robust to all shapes) ----
    try:
        res = collection.get(where={"user_id": user_id}, include=["metadatas"])
    except Exception:
        return {"files": []}

    metas = res.get("metadatas", []) or []

    # metas can be:
    #  1) List[Dict]                     → already flat
    #  2) List[List[Dict]]               → nested lists
    #  3) Weird shapes (List[str]/None)  → ignore non-dicts safely
    flat = []
    if isinstance(metas, list):
        for entry in metas:
            if isinstance(entry, dict):
                flat.append(entry)
            elif isinstance(entry, list):
                for m in entry or []:
                    if isinstance(m, dict):
                        flat.append(m)

    files_map = {}
    for m in flat:
        did = m.get("doc_id")
        name = m.get("source") or "uploaded"
        if did and did not in files_map:
            files_map[did] = name

    return {"files": [{"id": k, "name": v} for k, v in files_map.items()]}


@router.post("/files")
async def upload_file(
    file: UploadFile = File(...),
    user_id: Optional[str] = Header(default=None, alias="user-id"),
    db: Session = Depends(get_db),
):
    user: User = require_user(user_id, db)
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        raw = await file.read()
        tmp.write(raw)
        tmp_path = tmp.name
    try:
        blobs, meta = extract_text_blobs(tmp_path, file.filename)
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass

    if not blobs:
        doc_id = str(uuid.uuid4())
        rec = FileRecord(
            doc_id=doc_id,
            user_id=user.user_id,
            filename=file.filename,
            content_type=file.content_type,
            size_bytes=len(raw),
            page_count=meta.get("page_count"),
            extra_metadata=meta,
        )
        db.add(rec)
        db.commit()
        return {
            "status": "no_text_found",
            "chunks": 0,
            "doc_id": doc_id,
            "filename": file.filename,
        }

    doc_id = str(uuid.uuid4())
    chunk_texts, chunk_metas = [], []
    for b in blobs:
        for c in chunk_text(b["text"]):
            chunk_texts.append(c)
            m = {"user_id": user.user_id, "doc_id": doc_id, **(b.get("metadata") or {})}
            chunk_metas.append(m)

    vectors = embed(chunk_texts)
    ids = [str(uuid.uuid4()) for _ in chunk_texts]
    collection.add(
        ids=ids, documents=chunk_texts, metadatas=chunk_metas, embeddings=vectors
    )

    rec = FileRecord(
        doc_id=doc_id,
        user_id=user.user_id,
        filename=file.filename,
        content_type=file.content_type,
        size_bytes=len(raw),
        page_count=meta.get("page_count"),
        extra_metadata=meta,
    )
    db.add(rec)
    db.commit()
    return {
        "status": "indexed",
        "chunks": len(ids),
        "doc_id": doc_id,
        "filename": file.filename,
    }


@router.delete("/files/{doc_id}")
def delete_file(
    doc_id: str,
    user_id: Optional[str] = Header(default=None, alias="user-id"),
    db: Session = Depends(get_db),
):
    user: User = require_user(user_id, db)
    rec = (
        db.query(FileRecord)
        .filter(FileRecord.doc_id == doc_id, FileRecord.user_id == user.user_id)
        .first()
    )
    if not rec:
        # Idempotent delete: ensure vectors are gone even if DB row already missing
        _ = force_delete_doc_chunks(user.user_id, doc_id)
        return {"status": "deleted", "approx_chunks_deleted": 0}

    remaining_before = count_where({"user_id": user.user_id, "doc_id": doc_id}) or 0
    remaining_after = force_delete_doc_chunks(user.user_id, doc_id)

    db.delete(rec)
    db.commit()

    approx_deleted = max(0, remaining_before - remaining_after)
    return {"status": "deleted", "approx_chunks_deleted": approx_deleted}


@router.post("/reset")
def reset_user(
    user_id: Optional[str] = Header(default=None, alias="user-id"),
    db: Session = Depends(get_db),
):
    user: User = require_user(user_id, db)
    where = {"user_id": user.user_id}
    count_before = count_where(where)
    try:
        collection.delete(where=where)
    except Exception:
        pass
    db.query(FileRecord).filter(FileRecord.user_id == user.user_id).delete()
    db.commit()
    return {"status": "reset", "approx_chunks_deleted": count_before}
