import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User
from ..schemas.auth import SignUpRequest, SignInRequest
from ..schemas.common import AuthResponse
from ..utils.security import hash_password, verify_password

router = APIRouter(prefix="/v1/auth", tags=["auth"])

@router.post("/signup", response_model=AuthResponse)
def signup(body: SignUpRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == body.username).first()
    if existing:
        raise HTTPException(409, detail={"message": "Username already exists."})
    user_id = str(uuid.uuid4())
    user = User(user_id=user_id, username=body.username, password_hash=hash_password(body.password))
    db.add(user); db.commit()
    return AuthResponse(user_id=user_id)

@router.post("/signin", response_model=AuthResponse)
def signin(body: SignInRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, detail={"message": "Invalid username or password."})
    return AuthResponse(user_id=user.user_id)
