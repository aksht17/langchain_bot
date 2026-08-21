# Agentic Resume RAG Chatbot Platform 🚀

Autonomous Candidate Discovery & Comparative Evaluation Engine over 2,000+ Placement Profiles.

Built with **LangGraph**, **Pinecone Serverless**, **Google Gemini Embeddings**, **Groq (120B/70B LLMs)**, **FastAPI**, and **Next.js 14**.

---

## 🏛️ System Architecture

```
Recruiter Query (Natural Language)
               │
               ▼
   [Node 1: Extract & Route] ── (Groq Structured JSON)
               │
               ▼
   [Node 2: Vector Search] ──── (Gemini Embedding + Pinecone Top-K)
               │
               ▼
   [Node 3: Document Grader] ── (Relevance Evaluation)
          │             │
  (Valid Matches)   (Low/Irrelevant)
          │             │
          │             ▼
          │    [Node 4: Query Rewriter] ── (Loops back to Node 2, max 2 retries)
          ▼
   [Node 5: Response Synthesizer & Candidate Cards]
               │
               ▼
     Next.js 14 Frontend UI & LangSmith Trace Grouping
```

---

## 🛠️ Technology Stack

* **LLM Inference:** Groq (`openai/gpt-oss-120b` & `llama-3.3-70b-versatile`)
* **Vector Store:** Pinecone Serverless (Index: `resume-rag`, metric: `cosine`)
* **Embedding Model:** Google Gemini (`gemini-embedding-001`)
* **Agentic Graph Workflow:** LangGraph 0.2
* **Observability:** LangSmith (`resume-rag-agent`)
* **Backend API:** FastAPI + Uvicorn (Render Ready)
* **Frontend UI:** Next.js 14 + Tailwind CSS + Lucide Icons (Vercel Ready)

---

## 🚀 Quickstart Guide

### 1. Configure Environment Variables
Ensure your `.env` file in the root directory contains:
```ini
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=resume-rag
LANGCHAIN_API_KEY=your_langsmith_key
LANGCHAIN_PROJECT=resume-rag-agent
LANGCHAIN_TRACING_V2=true
```

### 2. Run the FastAPI Backend Server
```bash
# From workspace root
python src/main.py
```
* Backend URL: `http://127.0.0.1:8000`
* Swagger API Docs: `http://127.0.0.1:8000/docs`
* Health Check: `http://127.0.0.1:8000/healthz`

### 3. Run the Next.js Frontend
```bash
# In a separate terminal
cd frontend
npm run dev
```
* Frontend Web App: `http://localhost:3000`

---

## 📦 Ingestion Pipeline
To ingest additional candidate resumes:
```bash
# Download and index 50 resumes
python src/ingest_resumes.py 50
python src/embedding_store.py
```

---

## 🌐 Cloud Deployment

### Backend (Render)
1. Create a **Web Service** on Render pointing to your Git repository.
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
4. Set the Environment Variables from your `.env`.

### Frontend (Vercel)
1. Import the repository into **Vercel**.
2. Root Directory: `frontend`
3. Set Environment Variable: `NEXT_PUBLIC_API_URL=https://your-render-backend-url.onrender.com`
4. Deploy!
