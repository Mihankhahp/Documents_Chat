# Documents Chat — High-Level Architecture

This document outlines the production and development topology, the RAG pipeline, and the LLM routing options.

> **Note:** GitHub renders Mermaid diagrams automatically. If viewing elsewhere, you may need a Mermaid-compatible viewer.

## System Overview

```mermaid
flowchart LR
    subgraph Client["User Browser"]
        UI["React (Vite app)"]
    end

    subgraph Frontend["Frontend Container (Nginx)"]
        NGINX["Nginx</br>- Serves static SPA</br>- Proxies /v1/* to backend"]
    end

    subgraph Backend["Backend Container (FastAPI)"]
        API["FastAPI /v1 API"]
        PARSE["Ingestion & Parsing</br>- PDF: pypdf</br>- DOCX: docx2txt</br>- CSV: pandas</br>(Optional OCR)"]
        CHUNK["Chunking</br>RecursiveCharacterTextSplitter"]
        EMB["Embeddings</br>SentenceTransformers (BAAI/bge-m3)"]
        VDB["Vector DB</br>Chroma (cosine)</br>Persistent volume"]
        LLM["LLM Router</br>- openai</br>- ollama"]
    end

    subgraph Storage["Docker Volumes"]
        HF["/hf_cache</br>(HF model cache)"]
        CHR["/data/chroma_store</br>(Chroma persistence)"]
    end

    UI -->|"HTTP: / (static)"| NGINX
    UI -->|"HTTP: /v1/*"| NGINX -->|"proxy"| API

    API --> PARSE --> CHUNK --> EMB --> VDB
    API -->|"RAG retrieve"| VDB
    API -->|"Prompt + context"| LLM

    VDB <-.persisted.-> CHR
    EMB <-.downloads models.-> HF

    subgraph LLM_Providers["LLM Backends (choose one)"]
        OAI["OpenAI API</br>(model: e.g., gpt-4o-mini)"]
        OLM["Ollama</br>(model: llama3:8b-instruct)"]
    end

    LLM -->|provider=openai| OAI
    LLM -->|provider=ollama| OLM
```

## Request / Response Flows

### Upload & Index (RAG)

```mermaid
sequenceDiagram
    participant B as Browser (React)
    participant F as Nginx (Frontend)
    participant A as FastAPI /v1
    participant P as Parse/Chunk/Embed
    participant C as Chroma (Vectors)

    B->>F: POST /v1/files (multipart, user-id)
    F->>A: /v1/files
    A->>P: Parse (PDF/DOCX/CSV) → Chunk → Embed (bge-m3)
    P->>C: Upsert(chunks, vectors, {user_id, doc_id, source, page})
    A-->>F: { status: "indexed", chunks, doc_id }
    F-->>B: Response
```

### Chat over Documents (RAG + LLM)

```mermaid
sequenceDiagram
    participant B as Browser (React)
    participant F as Nginx (Frontend)
    participant A as FastAPI /v1
    participant C as Chroma (Vectors)
    participant L as LLM Router
    participant P1 as OpenAI
    participant P2 as Ollama

    B->>F: POST /v1/chat {query, user-id}
    F->>A: /v1/chat
    A->>C: query(embed(query), where user_id)
    C-->>A: top-K chunks + metadata
    A->>L: build prompt + context → generate

    alt LLM_PROVIDER=openai
        L->>P1: /v1/chat/ (X-OpenAI-Key)
        P1-->>L: answer
    else LLM_PROVIDER=ollama
        L->>P2: /api/chat (model: llama3:8b-instruct)
        P3-->>L: answer
    end

    L-->>A: answer
    A-->>F: { response, sources[] }
    F-->>B: Render answer + citations
```
