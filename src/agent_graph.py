import os
import json
from typing import List, Dict, Any, Optional, TypedDict, Annotated
from operator import add

from groq import Groq
from langsmith import traceable
from langgraph.graph import StateGraph, END

from config import (
    GROQ_API_KEY,
    LANGCHAIN_API_KEY,
    LANGCHAIN_PROJECT,
    LANGCHAIN_TRACING_V2,
)
from embedding_store import query_pinecone_store

# Set LangSmith environment variables for automatic tracing
if LANGCHAIN_API_KEY:
    os.environ["LANGCHAIN_API_KEY"] = LANGCHAIN_API_KEY
    os.environ["LANGCHAIN_PROJECT"] = LANGCHAIN_PROJECT or "resume-rag-agent"
    os.environ["LANGCHAIN_TRACING_V2"] = "true" if LANGCHAIN_TRACING_V2 else "false"

import sys
from pathlib import Path

# Ensure UTF-8 output encoding for Windows terminals
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parent))

# Initialize Groq client
groq_client = Groq(api_key=GROQ_API_KEY or os.getenv("GROQ_API_KEY"))

LLM_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")


# ==========================================
# 1. State Definition
# ==========================================
class AgentState(TypedDict):
    query: str
    original_query: str
    semantic_query: str
    extracted_filters: Dict[str, Any]
    retrieved_docs: List[Dict[str, Any]]
    graded_docs: List[Dict[str, Any]]
    rewrite_count: int
    final_response: str
    candidate_cards: List[Dict[str, Any]]


# ==========================================
# 2. Agent Graph Nodes
# ==========================================

@traceable(name="Node 1: Extract & Route")
def extract_and_route_node(state: AgentState) -> Dict[str, Any]:
    """
    Parses user queries into structured JSON: extracts hard constraints,
    skills, and optimized semantic query.
    """
    user_query = state["query"]
    original_query = state.get("original_query") or user_query

    prompt = f"""You are an expert AI recruiter assistant.
Analyze the following recruiter query and extract structured search parameters.

User Query: "{user_query}"

Respond ONLY with a valid JSON object in the following format:
{{
    "is_search_query": true,
    "semantic_query": "concise keyword and semantic summary of skills, domain, and role requirements",
    "skills": ["skill1", "skill2"],
    "role_target": "target job title or focus area",
    "experience_level": "entry/mid/senior or any mentioned years"
}}
"""
    try:
        completion = groq_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are a precise JSON-only recruiter entity extractor."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        content = completion.choices[0].message.content
        extracted = json.loads(content)
        semantic_query = extracted.get("semantic_query") or user_query
    except Exception as e:
        extracted = {"is_search_query": True, "semantic_query": user_query, "skills": []}
        semantic_query = user_query

    return {
        "original_query": original_query,
        "semantic_query": semantic_query,
        "extracted_filters": extracted,
    }


@traceable(name="Node 2: Vector Search")
def retrieve_node(state: AgentState) -> Dict[str, Any]:
    """
    Retrieves top candidate chunks from Pinecone using semantic embeddings.
    """
    query_text = state.get("semantic_query") or state["query"]
    top_k = 8

    # Query Pinecone
    matches = query_pinecone_store(query_text=query_text, top_k=top_k)
    return {"retrieved_docs": matches}


@traceable(name="Node 3: Document Grader")
def grade_documents_node(state: AgentState) -> Dict[str, Any]:
    """
    LLM evaluates if retrieved candidate profiles match the search criteria.
    Filters out irrelevant chunks.
    """
    query = state.get("original_query") or state["query"]
    docs = state.get("retrieved_docs", [])

    if not docs:
        return {"graded_docs": []}

    graded_docs = []
    # Build batch evaluation prompt
    candidates_context = ""
    for idx, doc in enumerate(docs):
        meta = doc.get("metadata", {})
        cand_name = meta.get("name", "Candidate")
        chunk_text = meta.get("chunk_text", "")
        candidates_context += f"\n--- Candidate {idx} ({cand_name}) ---\n{chunk_text[:600]}\n"

    grade_prompt = f"""You are a strict technical recruiter evaluating candidate relevance.

Recruiter Search Requirements: "{query}"

Candidates to evaluate:
{candidates_context}

For each Candidate index, evaluate if their profile has relevant skills or context matching the recruiter query.
Respond ONLY with a valid JSON object:
{{
    "evaluations": [
        {{
            "candidate_index": 0,
            "is_relevant": true,
            "relevance_score": 85,
            "matched_skills": ["Python", "Machine Learning"],
            "reason": "Brief reason"
        }}
    ]
}}
"""
    try:
        completion = groq_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are a precise document relevance evaluator. Always output valid JSON."},
                {"role": "user", "content": grade_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
        )
        result = json.loads(completion.choices[0].message.content)
        evals = result.get("evaluations", [])

        for eval_item in evals:
            idx = eval_item.get("candidate_index")
            if idx is not None and 0 <= idx < len(docs):
                if eval_item.get("is_relevant", True) or eval_item.get("relevance_score", 0) >= 40:
                    doc_copy = dict(docs[idx])
                    doc_copy["evaluation"] = eval_item
                    graded_docs.append(doc_copy)

    except Exception:
        # Fallback: keep all docs if grader encounters parsing error
        graded_docs = docs

    return {"graded_docs": graded_docs}


@traceable(name="Node 4: Query Rewriter")
def rewrite_query_node(state: AgentState) -> Dict[str, Any]:
    """
    Rewrites the search query with expanded technical synonyms if grading found few or no matches.
    """
    current_query = state.get("semantic_query") or state["query"]
    original_query = state.get("original_query") or state["query"]
    current_rewrites = state.get("rewrite_count", 0)

    prompt = f"""The recruiter is searching for candidates matching: "{original_query}"
Previous search for "{current_query}" yielded low or no matching candidates.

Rewrite this query by:
1. Expanding technical keywords with common industry synonyms (e.g., 'Go' -> 'Golang, backend, distributed systems').
2. Broadening overly specific constraints while preserving the core technical goal.
3. Keeping the query focused on resume text keywords.

Output ONLY a JSON object:
{{
    "rewritten_query": "the new expanded semantic query string"
}}
"""
    try:
        completion = groq_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert search query optimization assistant. Output JSON only."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        res = json.loads(completion.choices[0].message.content)
        new_query = res.get("rewritten_query", current_query)
    except Exception:
        new_query = current_query

    return {
        "semantic_query": new_query,
        "rewrite_count": current_rewrites + 1,
    }


@traceable(name="Node 5: Response Synthesizer")
def synthesize_response_node(state: AgentState) -> Dict[str, Any]:
    """
    Synthesizes ranked candidate cards, comparative analysis, skill matrices,
    and verified resume links.
    """
    query = state.get("original_query") or state["query"]
    graded_docs = state.get("graded_docs", [])

    if not graded_docs:
        # Fallback to retrieved docs if graded docs are empty
        graded_docs = state.get("retrieved_docs", [])

    # Deduplicate candidates by candidate_id while aggregating chunks
    candidates_dict: Dict[str, Dict[str, Any]] = {}
    for doc in graded_docs:
        meta = doc.get("metadata", {})
        cand_id = meta.get("candidate_id", "unknown")
        if cand_id not in candidates_dict:
            candidates_dict[cand_id] = {
                "candidate_id": cand_id,
                "name": meta.get("name", "Candidate"),
                "email": meta.get("email", ""),
                "roll_no": meta.get("roll_no", ""),
                "resume_url": meta.get("resume_url", ""),
                "score": doc.get("score", 0.0),
                "evaluation": doc.get("evaluation", {}),
                "text_chunks": [meta.get("chunk_text", "")],
            }
        else:
            candidates_dict[cand_id]["text_chunks"].append(meta.get("chunk_text", ""))

    candidates_list = list(candidates_dict.values())

    # Build context for synthesis
    synthesis_context = ""
    for c in candidates_list:
        combined_text = "\n".join(c["text_chunks"])[:1000]
        synthesis_context += f"""
Candidate ID: {c['candidate_id']}
Name: {c['name']}
Email: {c['email']}
Resume URL: {c['resume_url']}
Resume Details:
{combined_text}
---
"""

    synthesis_prompt = f"""You are Antigravity's Agentic Resume Recruiter Copilot.
The recruiter asked: "{query}"

Retrieved Candidate Profiles:
{synthesis_context}

Instructions:
1. Provide a direct, professional, and well-structured recruitment assessment in Markdown.
2. For each relevant candidate, provide:
   - **Candidate Name & ID**
   - **Suitability Score & Fit Summary** (How well they match the recruiter's specific requirements)
   - **Key Technical Skills & Highlights**
   - **Projects / Achievements**
   - **Direct Resume Link**: Formatted as [View Verified Resume](URL)
3. If multiple candidates match, provide a brief comparative matrix comparing their strengths.
4. If no candidates match, explain what specific criteria were missing.
"""

    try:
        completion = groq_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are a top-tier technical talent acquisition specialist. Respond with clean, high-impact Markdown formatting."},
                {"role": "user", "content": synthesis_prompt}
            ],
            temperature=0.2,
        )
        response_text = completion.choices[0].message.content
    except Exception as e:
        response_text = f"Encountered an issue generating response: {e}"

    # Build structured candidate cards for frontend UI
    candidate_cards = []
    for c in candidates_list:
        eval_data = c.get("evaluation", {})
        candidate_cards.append({
            "candidate_id": c["candidate_id"],
            "name": c["name"],
            "email": c["email"],
            "roll_no": c["roll_no"],
            "resume_url": c["resume_url"],
            "relevance_score": eval_data.get("relevance_score", int(c.get("score", 0.7) * 100)),
            "matched_skills": eval_data.get("matched_skills", []),
            "summary": eval_data.get("reason", f"Candidate profile matched search for {query}"),
        })

    return {
        "final_response": response_text,
        "candidate_cards": candidate_cards,
    }


# ==========================================
# 3. Conditional Routing Logic
# ==========================================
def should_rewrite_or_synthesize(state: AgentState) -> str:
    """
    Decides whether to synthesize answer or loop back to rewrite query.
    Rewrites if fewer than 1 relevant document found and rewrite_count < 2.
    """
    graded_docs = state.get("graded_docs", [])
    rewrite_count = state.get("rewrite_count", 0)

    if len(graded_docs) >= 1:
        return "synthesize"
    
    if rewrite_count < 2:
        return "rewrite"

    return "synthesize"


# ==========================================
# 4. Compile StateGraph
# ==========================================
def build_agent_graph():
    """
    Builds the cyclic 5-node self-correcting LangGraph agent workflow.
    """
    workflow = StateGraph(AgentState)

    # Add Nodes
    workflow.add_node("extract_and_route", extract_and_route_node)
    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("grade_documents", grade_documents_node)
    workflow.add_node("rewrite_query", rewrite_query_node)
    workflow.add_node("synthesize_response", synthesize_response_node)

    # Set Entry Point
    workflow.set_entry_point("extract_and_route")

    # Connect Edges
    workflow.add_edge("extract_and_route", "retrieve")
    workflow.add_edge("retrieve", "grade_documents")

    # Conditional Branch from Document Grader
    workflow.add_conditional_edges(
        "grade_documents",
        should_rewrite_or_synthesize,
        {
            "rewrite": "rewrite_query",
            "synthesize": "synthesize_response",
        }
    )

    # Loop back from Rewrite Query to Retrieve
    workflow.add_edge("rewrite_query", "retrieve")

    # Final Edge
    workflow.add_edge("synthesize_response", END)

    return workflow.compile()


# Singleton compiled graph instance
agent_app = build_agent_graph()


def run_agent_query(user_query: str, session_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Executes the multi-agent graph for a user query with LangSmith session tracing.
    """
    initial_state: AgentState = {
        "query": user_query,
        "original_query": user_query,
        "semantic_query": user_query,
        "extracted_filters": {},
        "retrieved_docs": [],
        "graded_docs": [],
        "rewrite_count": 0,
        "final_response": "",
        "candidate_cards": [],
    }

    config = {}
    if session_id:
        config["metadata"] = {"session_id": session_id}
        config["tags"] = [f"session:{session_id}"]

    result = agent_app.invoke(initial_state, config=config)
    return {
        "query": result.get("original_query", user_query),
        "response": result.get("final_response", ""),
        "candidate_cards": result.get("candidate_cards", []),
        "rewrites": result.get("rewrite_count", 0),
    }


if __name__ == "__main__":
    test_query = "Find candidates with experience in machine learning and mathematics"
    print(f"Executing Agent Pipeline for query: '{test_query}'...\n")
    res = run_agent_query(test_query)
    print("=" * 60)
    print("AGENT RESPONSE:")
    print("=" * 60)
    print(res["response"])
    print("\nCANDIDATE CARDS FOUND:", len(res["candidate_cards"]))
