import uuid
from typing import Optional
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User

def _validate_uuid_like(value: str) -> None:
    try:
        uuid.UUID(str(value))
    except Exception:
        raise HTTPException(status_code=400, detail={"message": "Invalid 'user-id' format (expected UUID)."})

def get_user_id(user_id: Optional[str] = Header(default=None, alias="user-id")) -> str:
    if not user_id:
        raise HTTPException(status_code=400, detail={"message": "Missing 'user-id' header."})
    user_id = user_id.strip()
    _validate_uuid_like(user_id)
    return user_id

def require_user(user_id: str = Depends(get_user_id), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail={"message": "Invalid user-id."})
    return user

def require_admin() -> None:
    return None
