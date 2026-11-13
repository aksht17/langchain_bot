import sys
from pathlib import Path

# Ensure UTF-8 output encoding
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parent))

import uuid
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import PINECONE_INDEX_NAME
from agent_graph import run_agent_query
from ingest_resumes import run_ingestion_pipeline
from embedding_store import index_parsed_chunks

app = FastAPI(
    title="Agentic Resume RAG ",
    description="Multi-agent recruitment copilot and candidate discovery engine powered by LangGraph, Pinecone, Gemini, and Groq.",
    version="1.0.0"
)

# CORS middleware for frontend communication (Next.js / Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request and Response Models
class ChatRequest(BaseModel):
    query: str = Field(..., description="Recruiter natural language prompt or query")
    session_id: Optional[str] = Field(None, description="Optional session tracking ID for LangSmith grouping")


class CandidateCard(BaseModel):
    candidate_id: str
    name: str
    email: Optional[str] = ""
    roll_no: Optional[str] = ""
    resume_url: str
    relevance_score: int = 0
    matched_skills: List[str] = []
    summary: str = ""


class ChatResponse(BaseModel):
    session_id: str
    query: str
    response: str
    candidate_cards: List[CandidateCard]
    rewrites: int = 0


class IngestRequest(BaseModel):
    limit: Optional[int] = Field(None, description="Number of resumes to ingest (None for all)")
    concurrency: int = Field(20, description="Concurrent download limit")


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Antigravity Agentic Resume RAG Copilot",
        "docs_url": "/docs",
        "health_check": "/healthz"
    }


@app.get("/healthz")
def healthz():
    """
    Health check endpoint for uptime monitoring and cold-start detection.
    """
    return {
        "status": "healthy",
        "pinecone_index": PINECONE_INDEX_NAME,
        "engine": "LangGraph Cyclic 5-Node Agent",
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest):
    """
    Executes the multi-agent LangGraph workflow for a recruiter query.
    """
    if not payload.query or not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    session_id = payload.session_id or str(uuid.uuid4())

    try:
        result = run_agent_query(user_query=payload.query.strip(), session_id=session_id)
        return ChatResponse(
            session_id=session_id,
            query=result.get("query", payload.query),
            response=result.get("response", ""),
            candidate_cards=result.get("candidate_cards", []),
            rewrites=result.get("rewrites", 0),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent workflow error: {str(e)}")


@app.post("/api/ingest")
async def trigger_ingestion(payload: IngestRequest, background_tasks: BackgroundTasks):
    """
    Triggers asynchronous ingestion and Pinecone indexing pipeline.
    """
    async def process_task(limit: Optional[int], concurrency: int):
        await run_ingestion_pipeline(limit=limit, concurrency=concurrency)
        index_parsed_chunks()

    background_tasks.add_task(process_task, payload.limit, payload.concurrency)
    return {
        "status": "Ingestion initiated in background",
        "limit": payload.limit,
        "concurrency": payload.concurrency,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
