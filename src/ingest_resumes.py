import asyncio
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional

import aiohttp
import pandas as pd
from tqdm.asyncio import tqdm

from config import (
    CSV_PATH,
    RAW_RESUMES_DIR,
    MANIFEST_PATH,
    DATA_DIR
)
from pdf_parser import extract_pdf_layout_aware, chunk_resume_with_context


async def download_single_pdf(
    session: aiohttp.ClientSession,
    url: str,
    target_path: Path,
    semaphore: asyncio.Semaphore,
    retries: int = 3,
) -> Dict[str, Any]:
    """
    Downloads a single PDF using aiohttp with rate limiting semaphore and retry logic.
    """
    if target_path.exists() and target_path.stat().st_size > 1024:
        return {
            "status": "cached",
            "path": str(target_path),
            "size_bytes": target_path.stat().st_size,
            "error": None,
        }

    for attempt in range(1, retries + 1):
        async with semaphore:
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
                async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=45)) as resp:
                    if resp.status == 200:
                        content = await resp.read()
                        if len(content) < 500:
                            # Too small to be a valid resume PDF
                            raise ValueError(f"Downloaded payload too small ({len(content)} bytes)")
                        target_path.write_bytes(content)
                        return {
                            "status": "downloaded",
                            "path": str(target_path),
                            "size_bytes": len(content),
                            "error": None,
                        }
                    else:
                        if attempt == retries:
                            return {
                                "status": "failed",
                                "path": str(target_path),
                                "size_bytes": 0,
                                "error": f"HTTP {resp.status}",
                            }
            except Exception as e:
                if attempt == retries:
                    return {
                        "status": "failed",
                        "path": str(target_path),
                        "size_bytes": 0,
                        "error": str(e),
                    }
                await asyncio.sleep(0.5 * (2 ** attempt))

    return {
        "status": "failed",
        "path": str(target_path),
        "size_bytes": 0,
        "error": "Max retries exceeded",
    }


async def run_ingestion_pipeline(limit: Optional[int] = None, concurrency: int = 20) -> Dict[str, Any]:
    """
    Asynchronously downloads, layout-parses, and chunks candidate resumes from the CSV.
    Generates ingestion_manifest.json.
    """
    print(f"Loading candidate records from {CSV_PATH.name}...")
    df = pd.read_csv(CSV_PATH)
    if limit is not None:
        df = df.head(limit)

    total_records = len(df)
    print(f"Total candidate records to process: {total_records}")

    RAW_RESUMES_DIR.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(concurrency)

    manifest_records: List[Dict[str, Any]] = []
    chunks_records: List[Dict[str, Any]] = []

    conn = aiohttp.TCPConnector(limit=concurrency + 10, ttl_dns_cache=300)
    async with aiohttp.ClientSession(connector=conn) as session:
        download_tasks = []
        metadata_map = []

        for idx, row in df.iterrows():
            cand_num = f"cand_{idx + 1:04d}"
            raw_resume_id = str(row.get("Resume ID", f"ID_{idx+1}")).strip()
            name = str(row.get("Student Name", "Unknown")).strip()
            email = str(row.get("Student Email", "")).strip()
            roll_no = str(row.get("Student Roll No", "")).strip()
            resume_type = str(row.get("Resume Type", "")).strip()
            resume_url = str(row.get("Resume Link", "")).strip()

            if not resume_url or not resume_url.startswith("http"):
                continue

            target_path = RAW_RESUMES_DIR / f"{cand_num}_{raw_resume_id}.pdf"

            meta = {
                "candidate_id": cand_num,
                "raw_resume_id": raw_resume_id,
                "name": name,
                "email": email,
                "roll_no": roll_no,
                "resume_type": resume_type,
                "resume_url": resume_url,
                "target_path": target_path,
            }
            metadata_map.append(meta)
            download_tasks.append(
                download_single_pdf(session, resume_url, target_path, semaphore)
            )

        print(f"\n[1/3] Downloading {len(download_tasks)} resume PDFs (Concurrency: {concurrency})...")
        download_results = await tqdm.gather(*download_tasks, desc="Downloading resumes")

    # Layout Parsing and Context-Injected Chunking
    print("\n[2/3] Parsing layout-aware PDF text and creating context-injected chunks...")
    successful_downloads = 0
    failed_downloads = 0
    successful_parses = 0
    failed_parses = 0

    for meta, dl_res in zip(metadata_map, download_results):
        target_path: Path = meta["target_path"]
        pdf_status = dl_res["status"]
        size_bytes = dl_res["size_bytes"]
        error = dl_res["error"]

        if pdf_status in ("downloaded", "cached") and target_path.exists():
            successful_downloads += 1
            try:
                raw_text = extract_pdf_layout_aware(target_path)
                if not raw_text or len(raw_text.strip()) < 50:
                    raise ValueError("Extracted text is empty or too short")

                chunks = chunk_resume_with_context(
                    text=raw_text,
                    candidate_id=meta["candidate_id"],
                    name=meta["name"],
                    resume_url=meta["resume_url"],
                    chunk_size_words=350,
                    overlap_words=50,
                )

                for chunk in chunks:
                    chunk["email"] = meta["email"]
                    chunk["roll_no"] = meta["roll_no"]
                    chunk["resume_type"] = meta["resume_type"]
                    chunk["raw_resume_id"] = meta["raw_resume_id"]
                    chunks_records.append(chunk)

                successful_parses += 1
                manifest_records.append({
                    "candidate_id": meta["candidate_id"],
                    "raw_resume_id": meta["raw_resume_id"],
                    "name": meta["name"],
                    "email": meta["email"],
                    "roll_no": meta["roll_no"],
                    "resume_type": meta["resume_type"],
                    "resume_url": meta["resume_url"],
                    "file_path": str(target_path),
                    "file_size_bytes": size_bytes,
                    "parse_status": "SUCCESS",
                    "chunk_count": len(chunks),
                    "error": None,
                })
            except Exception as parse_err:
                failed_parses += 1
                manifest_records.append({
                    "candidate_id": meta["candidate_id"],
                    "raw_resume_id": meta["raw_resume_id"],
                    "name": meta["name"],
                    "email": meta["email"],
                    "roll_no": meta["roll_no"],
                    "resume_type": meta["resume_type"],
                    "resume_url": meta["resume_url"],
                    "file_path": str(target_path),
                    "file_size_bytes": size_bytes,
                    "parse_status": "PARSE_ERROR",
                    "chunk_count": 0,
                    "error": str(parse_err),
                })
        else:
            failed_downloads += 1
            manifest_records.append({
                "candidate_id": meta["candidate_id"],
                "raw_resume_id": meta["raw_resume_id"],
                "name": meta["name"],
                "email": meta["email"],
                "roll_no": meta["roll_no"],
                "resume_type": meta["resume_type"],
                "resume_url": meta["resume_url"],
                "file_path": str(target_path),
                "file_size_bytes": 0,
                "parse_status": "DOWNLOAD_FAILED",
                "chunk_count": 0,
                "error": error,
            })

    # Save manifest
    print("\n[3/3] Generating ingestion_manifest.json...")
    summary = {
        "total_records_processed": len(manifest_records),
        "successful_downloads": successful_downloads,
        "failed_downloads": failed_downloads,
        "successful_parses": successful_parses,
        "failed_parses": failed_parses,
        "total_chunks_created": len(chunks_records),
        "records": manifest_records,
    }

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    # Save chunks cache for batch embedding phase
    chunks_cache_file = DATA_DIR / "parsed_chunks.json"
    with open(chunks_cache_file, "w", encoding="utf-8") as f:
        json.dump(chunks_records, f, indent=2)

    print(f"Manifest written to: {MANIFEST_PATH}")
    print(f"Parsed chunks written to: {chunks_cache_file}")
    print(f"Summary: {successful_parses} parsed successfully, {len(chunks_records)} total chunks created.")

    return summary


if __name__ == "__main__":
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        limit_arg = None if arg in ("all", "none", "0") else int(arg)
    else:
        limit_arg = None  # Default to all records

    print(f"Starting ingestion pipeline (Limit: {'ALL' if limit_arg is None else limit_arg})...")
    asyncio.run(run_ingestion_pipeline(limit=limit_arg, concurrency=25))
