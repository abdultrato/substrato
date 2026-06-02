"""Knowledge retriever for RAG."""

from __future__ import annotations

import logging
from typing import Any, Optional

from apps.ai_assistant.vector_store.embedding_service import embedding_service
from apps.ai_assistant.vector_store.vector_store_manager import vector_store_manager

logger = logging.getLogger(__name__)


class KnowledgeRetriever:
    """Retrieves relevant knowledge using semantic search."""

    def __init__(self, store_name: str = "knowledge_base") -> None:
        self.store_name = store_name
        self._vector_store = vector_store_manager.get_or_create_store(
            store_name,
            dimension=embedding_service.get_dimension(),
        )

    def add_document(self, content: str, metadata: dict[str, Any]) -> bool:
        """Add a document to the knowledge base."""
        try:
            # Generate embedding
            embeddings = embedding_service.encode(content)
            if not embeddings:
                logger.warning("Failed to generate embedding for document")
                return False

            # Add to vector store
            doc_metadata = {
                "content": content,
                **metadata,
            }

            return self._vector_store.add_vectors(embeddings, [doc_metadata])

        except Exception as e:
            logger.error(f"Error adding document: {e}")
            return False

    def add_documents_batch(self, documents: list[dict[str, Any]]) -> int:
        """Add multiple documents efficiently."""
        if not documents:
            return 0

        try:
            contents = [doc.get("content", "") for doc in documents]
            embeddings = embedding_service.encode(contents)

            if not embeddings:
                logger.warning("Failed to generate embeddings for batch")
                return 0

            # Prepare metadata
            metadata_list = [
                {
                    "content": doc.get("content", ""),
                    **{k: v for k, v in doc.items() if k != "content"},
                }
                for doc in documents
            ]

            if self._vector_store.add_vectors(embeddings, metadata_list):
                logger.info(f"Added {len(documents)} documents to knowledge base")
                return len(documents)

            return 0

        except Exception as e:
            logger.error(f"Error adding document batch: {e}")
            return 0

    def search(
        self,
        query: str,
        top_k: int = 5,
        min_score: float = 0.5,
    ) -> list[dict[str, Any]]:
        """Search for relevant documents."""
        try:
            # Generate query embedding
            query_embeddings = embedding_service.encode(query)
            if not query_embeddings or not query_embeddings[0]:
                logger.warning("Failed to generate query embedding")
                return []

            # Search in vector store
            results = self._vector_store.search(
                query_embeddings[0],
                top_k=top_k,
            )

            # Filter by minimum score
            filtered_results = [r for r in results if r.get("similarity_score", 0) >= min_score]

            logger.debug(
                f"Search for '{query[:50]}...' returned {len(filtered_results)} "
                f"results (threshold: {min_score})"
            )

            return filtered_results

        except Exception as e:
            logger.error(f"Error searching knowledge base: {e}")
            return []

    def hybrid_search(
        self,
        query: str,
        keyword_filter: Optional[dict[str, Any]] = None,
        top_k: int = 5,
        min_score: float = 0.5,
    ) -> list[dict[str, Any]]:
        """Hybrid search combining semantic + keyword filtering."""
        # Semantic search
        semantic_results = self.search(query, top_k=top_k * 2, min_score=min_score)

        # Apply keyword filters if provided
        if keyword_filter:
            filtered_results = []
            for result in semantic_results:
                match = True
                for key, value in keyword_filter.items():
                    if result.get(key) != value:
                        match = False
                        break
                if match:
                    filtered_results.append(result)
            semantic_results = filtered_results

        return semantic_results[:top_k]

    def clear(self) -> bool:
        """Clear the knowledge base."""
        return self._vector_store.clear()

    def get_size(self) -> int:
        """Get number of documents in knowledge base."""
        return self._vector_store.get_size()

    def get_stats(self) -> dict[str, Any]:
        """Get knowledge base statistics."""
        return {
            "store_name": self.store_name,
            "size": self.get_size(),
            "embedding_available": embedding_service.is_available(),
            "embedding_dimension": embedding_service.get_dimension(),
            "vector_store_stats": self._vector_store.get_stats(),
        }

    def save(self, filepath: str) -> bool:
        """Save knowledge base to disk."""
        return self._vector_store.save(filepath)

    def load(self, filepath: str) -> bool:
        """Load knowledge base from disk."""
        return self._vector_store.load(filepath)


# Global retriever instance
knowledge_retriever = KnowledgeRetriever()
