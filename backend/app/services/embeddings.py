from sentence_transformers import SentenceTransformer
from typing import List
from ..config import EMBED_MODEL

EMB = SentenceTransformer(EMBED_MODEL)

def embed(texts: List[str]) -> List[List[float]]:
    vecs = EMB.encode(texts, normalize_embeddings=True)
    return [v.tolist() for v in vecs]
