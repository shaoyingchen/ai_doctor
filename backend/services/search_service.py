"""
Hybrid Search Service

Combines keyword search (SQLite FTS or LIKE) and semantic search (vector similarity)
using Reciprocal Rank Fusion (RRF) for optimal retrieval.
"""

from __future__ import annotations

import re
import sqlite3
from typing import Any

from services.embedding_service import get_embedding_service
from services.vector_service import QdrantVectorStore


class SearchService:
    """
    Hybrid search service combining keyword and semantic search.

    Search modes:
    - keyword: Full-text search using SQLite
    - semantic: Vector similarity search using Qdrant
    - hybrid: RRF-merged results from both approaches
    """

    def __init__(self, db: Any, vector_service: QdrantVectorStore | None):
        """
        Initialize search service.

        Args:
            db: SQLite database connection or a thread-safe wrapper exposing
                the sqlite3.Connection API subset (execute/commit/row_factory),
                e.g. ThreadSafeDB from app.py
            vector_service: Qdrant vector store instance
        """
        self.db = db
        self.vector_service = vector_service

        # Enable row factory for dict-like access.
        # ThreadSafeDB connections are created with sqlite3.Row already, so
        # this is a no-op there and only affects raw connections.
        if self.db.row_factory != sqlite3.Row:
            self.db.row_factory = sqlite3.Row

    def keyword_search(
        self,
        query: str,
        kb_ids: list[str] | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """
        Full-text keyword search using SQLite LIKE (FTS5 upgrade path available).

        Args:
            query: Search query string
            kb_ids: Filter by knowledge base IDs
            limit: Maximum number of results

        Returns:
            List of search results with scores
        """
        if not query or not query.strip():
            return []

        # Normalize query for LIKE search
        normalized_query = query.strip()
        search_pattern = f"%{normalized_query}%"

        # Build query with optional kb_id filter
        sql_parts = [
            """
            SELECT
                c.id as chunk_id,
                c.doc_id,
                c.chunk_index,
                c.text,
                c.metadata,
                d.filename,
                d.knowledge_base_id,
                d.folder_id
            FROM chunks c
            INNER JOIN documents d ON c.doc_id = d.id
            WHERE c.text LIKE ?
            """
        ]

        params: list[Any] = [search_pattern]

        if kb_ids:
            placeholders = ",".join("?" * len(kb_ids))
            sql_parts.append(f"AND d.knowledge_base_id IN ({placeholders})")
            params.extend(kb_ids)

        sql_parts.append("ORDER BY c.chunk_index ASC")
        sql_parts.append(f"LIMIT {limit}")

        sql = " ".join(sql_parts)

        try:
            cursor = self.db.execute(sql, params)
            rows = cursor.fetchall()
        except Exception as e:
            print(f"Keyword search error: {e}")
            return []

        results = []
        for idx, row in enumerate(rows):
            # Simple relevance scoring based on query frequency
            text = row["text"] or ""
            match_count = text.lower().count(normalized_query.lower())
            # Score inversely related to rank, with boost for multiple matches
            score = (limit - idx) / limit * 100 * (1 + match_count * 0.1)

            results.append({
                "chunk_id": row["chunk_id"],
                "doc_id": row["doc_id"],
                "chunk_index": row["chunk_index"],
                "text": text,
                "metadata": row["metadata"],
                "filename": row["filename"],
                "kb_id": row["knowledge_base_id"],
                "folder_id": row["folder_id"],
                "score": min(100.0, score),
                "source": "keyword",
            })

        return results

    def semantic_search(
        self,
        query: str,
        kb_ids: list[str] | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """
        Semantic vector similarity search using Qdrant.

        Args:
            query: Search query string
            kb_ids: Filter by knowledge base IDs
            limit: Maximum number of results

        Returns:
            List of search results with similarity scores
        """
        if not query or not query.strip():
            return []

        if self.vector_service is None:
            return []

        # Generate query embedding（统一走 embedding_service，维度对齐 EMBEDDING_DIM）
        query_vector = get_embedding_service().embed_texts([query.strip()])[0]

        # Search vectors
        try:
            vector_results = self.vector_service.search_vectors(
                query_vector=query_vector,
                limit=limit,
                kb_ids=kb_ids,
            )
        except Exception as e:
            print(f"Semantic search error: {e}")
            return []

        # Enrich with document metadata from database
        results = []
        for hit in vector_results:
            raw_doc_id = hit.get("doc_id")
            if not raw_doc_id:
                continue

            # Pipeline writes payload doc_id as "doc-{id}" (B6); strip the
            # prefix to match documents.id, so RRF can join with keyword
            # results on (doc_id, chunk_index). Fall back to the raw value
            # for legacy points written without the prefix.
            doc_id = self._strip_doc_prefix(raw_doc_id)

            # Fetch document info
            try:
                doc_row = self.db.execute(
                    "SELECT filename, knowledge_base_id, folder_id FROM documents WHERE id = ?",
                    (doc_id,)
                ).fetchone()
                if doc_row is None and doc_id != raw_doc_id:
                    doc_row = self.db.execute(
                        "SELECT filename, knowledge_base_id, folder_id FROM documents WHERE id = ?",
                        (raw_doc_id,)
                    ).fetchone()
                    if doc_row is not None:
                        doc_id = raw_doc_id
            except Exception:
                doc_row = None

            filename = doc_row["filename"] if doc_row else "Unknown"
            kb_id = doc_row["knowledge_base_id"] if doc_row else ""
            folder_id = doc_row["folder_id"] if doc_row else None

            # Convert cosine similarity to 0-100 score
            score = hit.get("score", 0.0) * 100

            results.append({
                "chunk_id": f"vec-{hit.get('id', '')}",
                "doc_id": doc_id,
                "chunk_index": hit.get("chunk_index", 0),
                "text": hit.get("text", ""),
                "metadata": {},
                "filename": filename,
                "kb_id": kb_id,
                "folder_id": folder_id,
                "score": min(100.0, score),
                "source": "semantic",
            })

        return results

    @staticmethod
    def _strip_doc_prefix(doc_id: str) -> str:
        """Strip the pipeline's "doc-" payload prefix to get the raw documents.id."""
        prefix = "doc-"
        if isinstance(doc_id, str) and doc_id.startswith(prefix):
            return doc_id[len(prefix):]
        return doc_id

    @staticmethod
    def _merge_key(result: dict[str, Any]) -> tuple[str, Any]:
        """
        Composite RRF merge key: (doc_id, chunk_index).

        chunk_id cannot join the two sources (keyword search returns SQLite
        chunk uuids, semantic search returns "vec-{qdrant_point_id}"), but
        (doc_id, chunk_index) identifies the same chunk in both pipelines.
        """
        chunk_index = result.get("chunk_index")
        if isinstance(chunk_index, bool) or not isinstance(chunk_index, int):
            chunk_index = 0
        return (result.get("doc_id") or "", chunk_index)

    def rrf_merge(
        self,
        keyword_results: list[dict[str, Any]],
        semantic_results: list[dict[str, Any]],
        k: int = 60,
    ) -> list[dict[str, Any]]:
        """
        Merge keyword and semantic results using Reciprocal Rank Fusion.

        RRF formula: score(d) = sum(1 / (k + rank(d)))

        Results are aggregated by the composite key (doc_id, chunk_index);
        the original chunk_id is preserved on each result for display.

        Args:
            keyword_results: Results from keyword search
            semantic_results: Results from semantic search
            k: RRF constant (default 60, standard value)

        Returns:
            Merged and re-ranked results
        """
        # Build RRF scores by composite key (doc_id, chunk_index)
        rrf_scores: dict[tuple[str, Any], float] = {}
        chunk_map: dict[tuple[str, Any], dict[str, Any]] = {}

        # Process keyword results
        for rank, result in enumerate(keyword_results, start=1):
            key = self._merge_key(result)
            rrf_scores[key] = rrf_scores.get(key, 0.0) + (1.0 / (k + rank))
            if key not in chunk_map:
                chunk_map[key] = result

        # Process semantic results
        for rank, result in enumerate(semantic_results, start=1):
            key = self._merge_key(result)
            rrf_scores[key] = rrf_scores.get(key, 0.0) + (1.0 / (k + rank))
            if key not in chunk_map:
                chunk_map[key] = result

        # Sort by RRF score
        sorted_chunks = sorted(
            rrf_scores.items(),
            key=lambda x: x[1],
            reverse=True,
        )

        # Build final results with normalized scores
        max_rrf_score = sorted_chunks[0][1] if sorted_chunks else 1.0

        merged_results = []
        for key, rrf_score in sorted_chunks:
            result = chunk_map[key].copy()
            # Normalize RRF score to 0-100
            result["score"] = (rrf_score / max_rrf_score) * 100
            result["source"] = "hybrid"
            merged_results.append(result)

        return merged_results

    def hybrid_search(
        self,
        query: str,
        kb_ids: list[str] | None = None,
        mode: str = "hybrid",
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """
        Unified search interface supporting multiple modes.

        Args:
            query: Search query string
            kb_ids: Filter by knowledge base IDs
            mode: Search mode - 'keyword', 'semantic', or 'hybrid'
            limit: Maximum number of results

        Returns:
            Search results formatted for API response
        """
        if mode == "keyword":
            return self.keyword_search(query, kb_ids, limit)
        elif mode == "semantic":
            return self.semantic_search(query, kb_ids, limit)
        elif mode == "hybrid":
            # Fetch more results from each source for better RRF merging
            fetch_limit = limit * 2
            keyword_results = self.keyword_search(query, kb_ids, fetch_limit)
            semantic_results = self.semantic_search(query, kb_ids, fetch_limit)
            merged = self.rrf_merge(keyword_results, semantic_results)
            return merged[:limit]
        else:
            raise ValueError(f"Invalid search mode: {mode}")

    def format_results(
        self,
        results: list[dict[str, Any]],
        query: str,
    ) -> list[dict[str, Any]]:
        """
        Format search results for API response with highlighting.

        Args:
            results: Raw search results
            query: Original search query for highlighting

        Returns:
            Formatted results with highlighted excerpts
        """
        formatted = []

        for result in results:
            text = result.get("text", "")

            # Generate excerpt (limit to 300 characters around first match)
            excerpt = self._generate_excerpt(text, query)

            # Highlight query terms
            highlighted = self._highlight_text(excerpt, query)

            # Get knowledge base name
            kb_name = self._get_kb_name(result.get("kb_id", ""))

            formatted.append({
                "id": result["chunk_id"],
                "docId": result["doc_id"],
                "title": result.get("filename", "Unknown"),
                "excerpt": excerpt,
                "highlightedExcerpt": highlighted,
                "knowledgeBase": kb_name,
                "matchScore": round(result.get("score", 0.0), 1),
                "metadata": {
                    "chunkIndex": result.get("chunk_index", 0),
                    "source": result.get("source", "unknown"),
                    "folderId": result.get("folder_id"),
                },
            })

        return formatted

    def _generate_excerpt(self, text: str, query: str, max_length: int = 300) -> str:
        """Generate excerpt centered around query match."""
        if len(text) <= max_length:
            return text

        # Find first occurrence of query
        query_lower = query.lower()
        text_lower = text.lower()
        pos = text_lower.find(query_lower)

        if pos == -1:
            # No match, return start
            return text[:max_length] + "..."

        # Center excerpt around match
        start = max(0, pos - max_length // 2)
        end = min(len(text), start + max_length)

        # Adjust start if we hit end
        if end == len(text):
            start = max(0, end - max_length)

        excerpt = text[start:end]

        # Add ellipsis
        if start > 0:
            excerpt = "..." + excerpt
        if end < len(text):
            excerpt = excerpt + "..."

        return excerpt

    def _highlight_text(self, text: str, query: str) -> str:
        """Highlight query terms with <mark> tags."""
        if not query:
            return text

        # Escape special regex characters
        escaped_query = re.escape(query)

        # Case-insensitive replacement
        pattern = re.compile(f"({escaped_query})", re.IGNORECASE)
        highlighted = pattern.sub(r"<mark>\1</mark>", text)

        return highlighted

    def _get_kb_name(self, kb_id: str) -> str:
        """Get knowledge base name from ID."""
        if not kb_id:
            return "Unknown"

        try:
            row = self.db.execute(
                "SELECT name FROM kb_nodes WHERE id = ? AND node_type = 'kb'",
                (kb_id,)
            ).fetchone()
            return row["name"] if row else kb_id
        except Exception:
            return kb_id
