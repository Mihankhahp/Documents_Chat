import os, pandas as pd
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
import docx2txt
from ..config import OCR_ENABLED

try:
    from PIL import Image

    OCR_AVAILABLE = True
except Exception:
    OCR_AVAILABLE = False
    Image = None


def _extract_pdf_text(path: str) -> Tuple[List[Dict[str, Any]], int]:
    out = []
    reader = PdfReader(path)
    page_count = len(reader.pages)
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            out.append(
                {
                    "text": text,
                    "metadata": {"source": os.path.basename(path), "page": i},
                }
            )
    return out, page_count


def _extract_docx(path: str) -> List[Dict[str, Any]]:
    text = docx2txt.process(path) or ""
    return (
        [{"text": text, "metadata": {"source": os.path.basename(path)}}]
        if text.strip()
        else []
    )


def _extract_csv(path: str) -> List[Dict[str, Any]]:
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    lines = df.astype(str).agg(" | ".join, axis=1).tolist()
    text = "\n".join(lines)
    return (
        [{"text": text, "metadata": {"source": os.path.basename(path)}}]
        if text.strip()
        else []
    )


def extract_text_blobs(
    tmp_path: str, filename: str
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    ext = os.path.splitext(filename.lower())[1]
    meta: Dict[str, Any] = {"source": os.path.basename(filename)}
    if ext == ".pdf":
        blobs, page_count = _extract_pdf_text(tmp_path)
        meta["page_count"] = page_count
        return blobs, meta
    if ext == ".docx":
        return _extract_docx(tmp_path), meta
    if ext == ".csv":
        return _extract_csv(tmp_path), meta

    from fastapi import HTTPException
    raise HTTPException(
        400,
        {"message": f"Unsupported file type: {ext}. Use PDF, DOCX, CSV, PNG, or JPG."},
    )
