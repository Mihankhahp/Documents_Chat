import shutil, pathlib
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Message, Conversation, FileRecord, User
from ..schemas.files import AdminResetBody
from ..api.deps import require_admin
from ..services.vectorstore import chroma_client, collection
from ..config import CHROMA_DIR

router = APIRouter(prefix="/v1/admin", tags=["admin"])

@router.post("/reset_all")
def admin_reset_all(body: AdminResetBody = Body(default=AdminResetBody()),
                    db: Session = Depends(get_db),
                    _admin = Depends(require_admin)):
    deleted = {}
    for model in [Message, Conversation, FileRecord]:
        count = db.query(model).delete(synchronize_session=False)
        deleted[model.__tablename__] = count
    if not body.preserve_users:
        count_users = db.query(User).delete(synchronize_session=False)
        deleted["users"] = count_users
    db.commit()

    try:
        chroma_client.reset()
    except Exception:
        pass

    chroma_path = pathlib.Path(CHROMA_DIR)
    if chroma_path.exists():
        shutil.rmtree(chroma_path, ignore_errors=True)
    chroma_path.mkdir(parents=True, exist_ok=True)

    global collection  # noqa
    collection = chroma_client.get_or_create_collection(name="docs", metadata={"hnsw:space": "cosine"})

    return {"status": "ok", "preserve_users": body.preserve_users, "db_deleted": deleted, "chroma_dir": CHROMA_DIR}
