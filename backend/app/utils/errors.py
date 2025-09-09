from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

def _shape(status: int, code: str, message: str, details=None):
    payload = {
        "ok": False,
        "error": {
            "code": code,
            "message": message,
        }
    }
    if details is not None:
        payload["error"]["details"] = details
    return JSONResponse(status_code=status, content=payload)

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict):
        message = detail.get("message") or detail.get("detail") or "Request failed."
        details = {k: v for k, v in detail.items() if k not in {"message", "detail"}}
    else:
        message = str(detail)
        details = None
    return _shape(exc.status_code, f"HTTP_{exc.status_code}", message, details)

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return _shape(422, "VALIDATION_ERROR", "Validation failed.", exc.errors())

async def unhandled_exception_handler(request: Request, exc: Exception):
    # hide internals, but include type name for debugging
    return _shape(500, "INTERNAL_ERROR", "An unexpected error occurred.", {"type": exc.__class__.__name__})
