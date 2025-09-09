from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .db import Base, engine
from .utils.sqlite_compat import _ensure_sqlite_columns
from .utils.errors import (
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from .api.routes_health import router as health_router
from .api.routes_auth import router as auth_router
from .api.routes_files import router as files_router
from .api.routes_chat import router as chat_router
from .api.routes_conversations import router as conv_router
from .api.routes_admin import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_columns(engine)
    yield

app = FastAPI(title="Documents Chat — RAG Backend", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(files_router)
app.include_router(chat_router)
app.include_router(conv_router)
app.include_router(admin_router)

# Standardized error handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)
