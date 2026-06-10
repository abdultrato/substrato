"""Embedding service for RAG using sentence-transformers."""

from __future__ import annotations

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

try:
    from sentence_transformers import SentenceTransformer

    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.warning("Sentence-transformers not available, embeddings disabled")


class EmbeddingService:
    """Service for generating text embeddings."""

    DEFAULT_MODEL = "all-MiniLM-L6-v2"  # 384 dimensions, fast, Portuguese-friendly

    def __init__(self, model_name: str = DEFAULT_MODEL) -> None:
        self.model_name = model_name
        self._model: Optional[Any] = None
        self._available = False
        self._initialized = False

    def _init_model(self) -> None:
        """Initialize the embedding model (lazy loading)."""
        if self._initialized:
            return

        self._initialized = True

        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            logger.warning("Sentence-transformers not available, embeddings disabled")
            return

        try:
            logger.info(f"Loading embedding model: {self.model_name}")
            self._model = SentenceTransformer(self.model_name)
            self._available = True
            logger.info(f"Embedding model loaded successfully ({self._model.get_sentence_embedding_dimension()}D)")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            self._available = False

    def encode(self, texts: str | list[str]) -> list[list[float]] | None:
        """Encode texts to embeddings."""
        self._init_model()  # Lazy initialization on first use

        if not self._available:
            logger.warning("Embedding service not available")
            return None

        try:
            if isinstance(texts, str):
                texts = [texts]

            embeddings = self._model.encode(texts, convert_to_numpy=True)

            # Ensure output is list of lists
            if len(texts) == 1:
                return [embeddings.tolist()]
            else:
                return embeddings.tolist()

        except Exception as e:
            logger.error(f"Error encoding texts: {e}")
            return None

    def get_dimension(self) -> int:
        """Get embedding dimension."""
        if self._available and self._model:
            return self._model.get_sentence_embedding_dimension()
        return 384  # Default

    def is_available(self) -> bool:
        """Check if embedding service is available."""
        return self._available


# Global service instance
embedding_service = EmbeddingService()
