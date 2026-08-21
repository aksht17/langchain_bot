from __future__ import annotations

import re
from pathlib import Path
from typing import List, Dict, Any, Optional

import fitz  # PyMuPDF


def clean_text(text: str) -> str:
    """Normalize whitespace and clean unicode artifacts."""
    text = text.replace("\u00a0", " ").replace("\r\n", "\n").replace("\r", "\n")
    # Replace sequences of whitespace (except single newlines) with a single space
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    # Remove empty lines while preserving paragraphs
    cleaned = "\n".join(line for line in lines if line)
    return cleaned


def extract_pdf_layout_aware(pdf_path: str | Path) -> str:
    """
    Extract text blocks in physical visual order.
    Handles 2-column layouts by sorting blocks by column (left-to-right) then top-to-bottom
    to avoid interleaved text corruption.
    """
    doc = fitz.open(str(pdf_path))
    full_text_blocks: List[str] = []

    for page_num, page in enumerate(doc):
        rect = page.rect
        page_width = rect.width
        mid_x = page_width / 2.0

        # Extract blocks: (x0, y0, x1, y1, text, block_no, block_type)
        # block_type 0 = text, 1 = image
        raw_blocks = page.get_text("blocks")
        text_blocks = [b for b in raw_blocks if b[6] == 0 and b[4].strip()]

        if not text_blocks:
            continue

        # Check if the page displays a multi-column pattern
        # A 2-column layout typically has blocks confined to x1 < mid_x + 30 and x0 > mid_x - 30
        left_col = []
        right_col = []
        full_width_col = []

        left_count = sum(1 for b in text_blocks if b[2] <= mid_x + 40 and b[0] < mid_x - 40)
        right_count = sum(1 for b in text_blocks if b[0] >= mid_x - 40 and b[2] > mid_x + 40)

        is_multi_column = left_count >= 2 and right_count >= 2

        if is_multi_column:
            # Separate into left column, right column, and spanning blocks
            for b in text_blocks:
                x0, y0, x1, y1, text = b[0], b[1], b[2], b[3], b[4]
                if x1 <= mid_x + 20:
                    left_col.append((y0, x0, text))
                elif x0 >= mid_x - 20:
                    right_col.append((y0, x0, text))
                else:
                    full_width_col.append((y0, x0, text))

            # Sort each section top-to-bottom
            left_col.sort(key=lambda item: (item[0], item[1]))
            right_col.sort(key=lambda item: (item[0], item[1]))
            full_width_col.sort(key=lambda item: (item[0], item[1]))

            # Combine full-width headers/footers with columns
            combined = full_width_col + left_col + right_col
            page_text = "\n".join(clean_text(item[2]) for item in combined if clean_text(item[2]))
        else:
            # Single column: sort by y0 (top-to-bottom), then x0 (left-to-right)
            sorted_blocks = sorted(text_blocks, key=lambda b: (b[1], b[0]))
            page_text = "\n".join(clean_text(b[4]) for b in sorted_blocks if clean_text(b[4]))

        if page_text:
            full_text_blocks.append(page_text)

    doc.close()
    return "\n\n".join(full_text_blocks)


def chunk_resume_with_context(
    text: str,
    candidate_id: str,
    name: str = "",
    resume_url: str = "",
    chunk_size_words: int = 350,
    overlap_words: int = 50,
) -> List[Dict[str, Any]]:
    """
    Segment resume text into ~400-token (~300-350 words) chunks with 50-token overlap.
    Prepends context header [Candidate ID: {id} | Name: {name} | URL: {url}]
    to every chunk so candidate identity is never lost in vector space.
    """
    words = text.split()
    if not words:
        return []

    chunks: List[Dict[str, Any]] = []
    header_parts = [f"Candidate ID: {candidate_id}"]
    if name:
        header_parts.append(f"Name: {name}")
    if resume_url:
        header_parts.append(f"URL: {resume_url}")
    header = "[" + " | ".join(header_parts) + "]\n"

    step = max(1, chunk_size_words - overlap_words)
    chunk_idx = 0

    for i in range(0, len(words), step):
        chunk_words = words[i : i + chunk_size_words]
        chunk_body = " ".join(chunk_words)
        chunk_full_text = f"{header}{chunk_body}"

        chunks.append({
            "chunk_index": chunk_idx,
            "candidate_id": candidate_id,
            "name": name,
            "resume_url": resume_url,
            "text": chunk_full_text,
            "raw_text": chunk_body,
            "word_count": len(chunk_words)
        })
        chunk_idx += 1

        if i + chunk_size_words >= len(words):
            break

    return chunks
