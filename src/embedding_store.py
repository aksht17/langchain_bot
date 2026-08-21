import os
import sys
import time
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

from pinecone import Pinecone, ServerlessSpec
from google import genai
from tenacity import retry, wait_exponential, stop_after_attempt

from config import (
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    GEMINI_API_KEY,
    DATA_DIR,
)

# Initialize Pinecone & Gemini
pc = Pinecone(api_key=PINECONE_API_KEY or os.getenv("PINECONE_API_KEY"))
gemini_client = genai.Client(api_key=GEMINI_API_KEY or os.getenv("GEMINI_API_KEY"))

_INDEX_DIMENSION: Optional[int] = None


def get_index_dimension() -> int:
    """
    Retrieves the dimensionality of the target Pinecone index.
    """
    global _INDEX_DIMENSION
    if _INDEX_DIMENSION is not None:
        return _INDEX_DIMENSION

    index_name = PINECONE_INDEX_NAME or "resume-rag"
    indexes = {idx.name: idx.dimension for idx in pc.list_indexes().indexes}
    if index_name in indexes and indexes[index_name]:
        _INDEX_DIMENSION = int(indexes[index_name])
    else:
        _INDEX_DIMENSION = 1024
    return _INDEX_DIMENSION


def ensure_index(metric: str = "cosine"):
    """
    Ensures the Pinecone serverless index exists, creates it if not.
    """
    index_name = PINECONE_INDEX_NAME or "resume-rag"
    existing_indexes = [idx.name for idx in pc.list_indexes().indexes]

    if index_name not in existing_indexes:
        dimension = 1024
        print(f"Creating Pinecone Serverless index: '{index_name}' (dimension={dimension}, metric={metric})...")
        pc.create_index(
            name=index_name,
            dimension=dimension,
            metric=metric,
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
        while not pc.describe_index(index_name).status["ready"]:
            print("Waiting for Pinecone index to be ready...")
            time.sleep(2)
        print("Pinecone index is ready.")

    return pc.Index(index_name)


@retry(
    wait=wait_exponential(multiplier=3, min=5, max=60),
    stop=stop_after_attempt(10),
    reraise=True,
)
def embed_batch_with_retry(texts: List[str], dimension: Optional[int] = None) -> List[List[float]]:
    """
    Generates dense embeddings using Gemini with exponential backoff matching index dimension.
    """
    if dimension is None:
        dimension = get_index_dimension()

    try:
        response = gemini_client.models.embed_content(
            model="gemini-embedding-001",
            contents=texts,
            config={"output_dimensionality": dimension},
        )
        return [emb.values for emb in response.embeddings]
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
            print("  [Rate-limit warning] Gemini 429 hit. Sleeping 15s before backoff retry...")
            time.sleep(15)
        raise e


def embed_single_query(query: str, dimension: Optional[int] = None) -> List[float]:
    """
    Embeds a single query string for semantic vector search.
    """
    if dimension is None:
        dimension = get_index_dimension()

    response = gemini_client.models.embed_content(
        model="gemini-embedding-001",
        contents=query,
        config={"output_dimensionality": dimension},
    )
    return response.embeddings[0].values


def index_parsed_chunks(
    chunks: Optional[List[Dict[str, Any]]] = None,
    batch_size: int = 30,
    delay_between_batches: float = 4.0,
) -> Dict[str, Any]:
    """
    Vectorizes chunks in batches of 30 and upserts them to Pinecone serverless index with resume capability.
    """
    if chunks is None:
        chunks_file = DATA_DIR / "parsed_chunks.json"
        if not chunks_file.exists():
            raise FileNotFoundError(f"Chunks cache not found at {chunks_file}. Run ingestion first.")
        with open(chunks_file, "r", encoding="utf-8") as f:
            chunks = json.load(f)

    if not chunks:
        print("No chunks provided or found to index.")
        return {"total_indexed": 0, "batches": 0}

    index = ensure_index(metric="cosine")
    dim = get_index_dimension()
    total_chunks = len(chunks)

    # Checkpoint tracking file
    checkpoint_file = DATA_DIR / "indexed_ids.json"
    indexed_ids = set()
    if checkpoint_file.exists():
        try:
            with open(checkpoint_file, "r", encoding="utf-8") as cf:
                indexed_ids = set(json.load(cf))
        except Exception:
            indexed_ids = set()

    # Filter out already indexed chunks
    pending_chunks = [c for c in chunks if f"{c['candidate_id']}_{c['chunk_index']}" not in indexed_ids]
    already_indexed_count = len(chunks) - len(pending_chunks)

    print(f"\nIndexing status: {already_indexed_count}/{total_chunks} already indexed. {len(pending_chunks)} pending chunks.")
    if not pending_chunks:
        print("All chunks are already indexed in Pinecone!")
        return {"total_indexed": total_chunks, "batches": 0}

    total_batches = (len(pending_chunks) + batch_size - 1) // batch_size
    total_indexed = already_indexed_count

    for b_idx in range(0, len(pending_chunks), batch_size):
        batch = pending_chunks[b_idx : b_idx + batch_size]
        batch_texts = [item["text"] for item in batch]

        try:
            vectors_values = embed_batch_with_retry(batch_texts, dimension=dim)

            upsert_items = []
            new_ids = []
            for item, vec in zip(batch, vectors_values):
                vector_id = f"{item['candidate_id']}_{item['chunk_index']}"
                metadata = {
                    "candidate_id": str(item.get("candidate_id", "")),
                    "raw_resume_id": str(item.get("raw_resume_id", "")),
                    "name": str(item.get("name", "")),
                    "email": str(item.get("email", "")),
                    "roll_no": str(item.get("roll_no", "")),
                    "resume_url": str(item.get("resume_url", "")),
                    "chunk_index": int(item.get("chunk_index", 0)),
                    "chunk_text": str(item.get("raw_text", item.get("text", ""))),
                }
                upsert_items.append({
                    "id": vector_id,
                    "values": vec,
                    "metadata": metadata,
                })
                new_ids.append(vector_id)

            index.upsert(vectors=upsert_items)
            total_indexed += len(upsert_items)
            indexed_ids.update(new_ids)

            # Save checkpoint
            with open(checkpoint_file, "w", encoding="utf-8") as cf:
                json.dump(list(indexed_ids), cf)

            current_batch_num = (b_idx // batch_size) + 1
            print(f"  Batch {current_batch_num}/{total_batches} upserted ({total_indexed}/{total_chunks} vectors)")

            time.sleep(delay_between_batches)

        except Exception as e:
            print(f"Error in batch starting at index {b_idx}: {e}")
            raise e

    print(f"\nSuccessfully indexed {total_indexed} vectors into Pinecone index '{PINECONE_INDEX_NAME}'.")
    return {"total_indexed": total_indexed, "batches": total_batches}


def query_pinecone_store(
    query_text: str,
    top_k: int = 5,
    filter_dict: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Performs dense semantic vector search on Pinecone with metadata payload retrieval.
    """
    index = ensure_index(metric="cosine")
    dim = get_index_dimension()
    query_emb = embed_single_query(query_text, dimension=dim)

    query_params: Dict[str, Any] = {
        "vector": query_emb,
        "top_k": top_k,
        "include_metadata": True,
    }
    if filter_dict:
        query_params["filter"] = filter_dict

    res = index.query(**query_params)
    matches = []
    for match in res.matches:
        matches.append({
            "id": match.id,
            "score": match.score,
            "metadata": match.metadata,
        })
    return matches


if __name__ == "__main__":
    # Test indexing
    index_parsed_chunks()
